import sql from 'mssql';
import { ConnectionModel } from '../models/Connection.js';
import { QueryHistoryModel } from '../models/QueryHistory.js';
import { canExecuteStatement, getRolePermissions } from '../config/roles.js';
import logger from '../config/logger.js';
import { getSqlPool, setSqlPool, closeSqlPool } from '../config/database.js';

// Track running queries for cancellation
const runningQueries = new Map();

export class SqlService {
  /**
   * Execute SQL query with role-based permissions
   */
  static async executeQuery({ connectionId, sql: sqlQuery, userId, userRole }) {
    const startTime = Date.now();
    let queryHistoryId = null;
    let request = null;

    try {
      // Check if user can execute this type of query
      const permissionCheck = canExecuteStatement(userRole, sqlQuery);
      if (!permissionCheck.allowed) {
        throw new Error(permissionCheck.reason);
      }

      // Get role permissions for limits
      const permissions = getRolePermissions(userRole);

      // Create query history entry
      const queryHistory = await QueryHistoryModel.create({
        userId,
        connectionId,
        sql: sqlQuery,
        status: 'running'
      });
      queryHistoryId = queryHistory.id;

      // Get connection pool
      const pool = await this._getOrCreatePool(connectionId);

      // Create request with timeout
      request = pool.request();
      request.setTimeout(permissions.queryTimeoutMs);

      // Track running query for cancellation
      runningQueries.set(queryHistoryId, { request, userId, connectionId });

      // Execute query
      const result = await request.query(sqlQuery);

      // Limit result set size based on role
      let recordset = result.recordset || [];
      const totalRows = recordset.length;
      const limitedRows = recordset.slice(0, permissions.maxRows);

      const executionTime = Date.now() - startTime;

      // Update query history
      await QueryHistoryModel.update(queryHistoryId, {
        status: 'success',
        rowCount: totalRows,
        executionTimeMs: executionTime
      });

      // Remove from running queries
      runningQueries.delete(queryHistoryId);

      logger.info(`Query executed successfully: ${queryHistoryId} (${executionTime}ms, ${totalRows} rows)`);

      return {
        queryId: queryHistoryId,
        data: limitedRows,
        totalRows,
        returnedRows: limitedRows.length,
        truncated: totalRows > permissions.maxRows,
        maxRows: permissions.maxRows,
        executionTimeMs: executionTime,
        columns: result.recordset?.columns || []
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Check if it was cancelled
      if (error.message && error.message.includes('cancel')) {
        if (queryHistoryId) {
          await QueryHistoryModel.update(queryHistoryId, {
            status: 'cancelled',
            executionTimeMs: executionTime,
            errorMessage: 'Query cancelled by user'
          });
        }
        runningQueries.delete(queryHistoryId);
        throw new Error('Query cancelled by user');
      }

      // Update query history with error
      if (queryHistoryId) {
        await QueryHistoryModel.update(queryHistoryId, {
          status: 'error',
          executionTimeMs: executionTime,
          errorMessage: error.message
        });
      }

      runningQueries.delete(queryHistoryId);

      logger.error(`Query execution failed: ${queryHistoryId}`, error);

      throw error;
    }
  }

  /**
   * Cancel running query
   */
  static async cancelQuery(queryId, userId) {
    const runningQuery = runningQueries.get(queryId);

    if (!runningQuery) {
      throw new Error('Query not found or already completed');
    }

    // Verify user owns this query or is admin
    if (runningQuery.userId !== userId) {
      throw new Error('Unauthorized to cancel this query');
    }

    try {
      // Cancel the request
      runningQuery.request.cancel();

      // Update query history
      await QueryHistoryModel.update(queryId, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString()
      });

      runningQueries.delete(queryId);

      logger.info(`Query cancelled: ${queryId} by user ${userId}`);

      return { success: true, message: 'Query cancelled' };
    } catch (error) {
      logger.error(`Failed to cancel query: ${queryId}`, error);
      throw error;
    }
  }

  /**
   * Get or create connection pool
   */
  static async _getOrCreatePool(connectionId) {
    // Check if pool already exists
    const existingPool = getSqlPool({ server: connectionId });

    if (existingPool && existingPool.connected) {
      return existingPool;
    }

    // Get connection config
    const config = await ConnectionModel.getDecryptedConfig(connectionId);

    // Create new pool
    const pool = new sql.ConnectionPool({
      server: config.server,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      options: {
        encrypt: config.encrypt,
        trustServerCertificate: config.trustServerCertificate,
        enableArithAbort: true
      },
      connectionTimeout: config.connectionTimeout,
      requestTimeout: config.requestTimeout,
      pool: {
        max: 10,
        min: 2,
        idleTimeoutMillis: 30000
      }
    });

    await pool.connect();

    setSqlPool(config, pool);

    logger.info(`SQL Server pool created for connection: ${connectionId}`);

    return pool;
  }

  /**
   * Test connection
   */
  static async testConnection(connectionId) {
    try {
      const config = await ConnectionModel.getDecryptedConfig(connectionId);

      const pool = new sql.ConnectionPool({
        server: config.server,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        options: {
          encrypt: config.encrypt,
          trustServerCertificate: config.trustServerCertificate
        },
        connectionTimeout: 10000
      });

      await pool.connect();
      await pool.close();

      return { success: true, message: 'Connection successful' };
    } catch (error) {
      logger.error('Connection test failed:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get running queries for a user
   */
  static getRunningQueries(userId) {
    const userQueries = [];

    for (const [queryId, query] of runningQueries.entries()) {
      if (query.userId === userId) {
        userQueries.push({
          queryId,
          connectionId: query.connectionId
        });
      }
    }

    return userQueries;
  }

  /**
   * Close all connection pools (for shutdown)
   */
  static async closeAllPools() {
    const { closeAllSqlPools } = await import('../config/database.js');
    closeAllSqlPools();
    logger.info('All SQL Server pools closed');
  }
}
