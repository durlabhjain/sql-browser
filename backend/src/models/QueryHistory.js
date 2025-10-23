import { getTursoClient } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

export class QueryHistoryModel {
  /**
   * Create a new query history entry
   */
  static async create({
    userId,
    connectionId,
    sql,
    status = 'running',
    rowCount = null,
    executionTimeMs = null,
    errorMessage = null
  }) {
    const db = getTursoClient();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    try {
      await db.execute({
        sql: `INSERT INTO query_history (id, user_id, connection_id, sql, status, row_count, execution_time_ms, error_message, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, userId, connectionId, sql, status, rowCount, executionTimeMs, errorMessage, createdAt]
      });

      return {
        id,
        userId,
        connectionId,
        sql,
        status,
        rowCount,
        executionTimeMs,
        errorMessage,
        createdAt
      };
    } catch (error) {
      logger.error('Error creating query history:', error);
      throw error;
    }
  }

  /**
   * Update query history entry
   */
  static async update(id, updates) {
    const db = getTursoClient();

    const allowedFields = ['status', 'rowCount', 'executionTimeMs', 'errorMessage', 'cancelledAt'];
    const setClauses = [];
    const args = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        const snakeKey = this._toSnakeCase(key);
        setClauses.push(`${snakeKey} = ?`);
        args.push(value);
      }
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    args.push(id);

    try {
      await db.execute({
        sql: `UPDATE query_history SET ${setClauses.join(', ')} WHERE id = ?`,
        args
      });

      return this.findById(id);
    } catch (error) {
      logger.error('Error updating query history:', error);
      throw error;
    }
  }

  /**
   * Find query history by ID
   */
  static async findById(id) {
    const db = getTursoClient();

    try {
      const result = await db.execute({
        sql: 'SELECT * FROM query_history WHERE id = ?',
        args: [id]
      });

      if (result.rows.length === 0) {
        return null;
      }

      return this._mapQueryHistory(result.rows[0]);
    } catch (error) {
      logger.error('Error finding query history by ID:', error);
      throw error;
    }
  }

  /**
   * List query history with filters
   */
  static async list({
    userId = null,
    connectionId = null,
    status = null,
    startDate = null,
    endDate = null,
    limit = 50,
    offset = 0
  } = {}) {
    const db = getTursoClient();

    const conditions = [];
    const args = [];

    if (userId) {
      conditions.push('user_id = ?');
      args.push(userId);
    }

    if (connectionId) {
      conditions.push('connection_id = ?');
      args.push(connectionId);
    }

    if (status) {
      conditions.push('status = ?');
      args.push(status);
    }

    if (startDate) {
      conditions.push('created_at >= ?');
      args.push(startDate);
    }

    if (endDate) {
      conditions.push('created_at <= ?');
      args.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    args.push(limit, offset);

    try {
      const result = await db.execute({
        sql: `SELECT qh.*, u.username, c.name as connection_name
              FROM query_history qh
              LEFT JOIN users u ON qh.user_id = u.id
              LEFT JOIN connections c ON qh.connection_id = c.id
              ${whereClause}
              ORDER BY qh.created_at DESC
              LIMIT ? OFFSET ?`,
        args
      });

      return result.rows.map(row => ({
        ...this._mapQueryHistory(row),
        username: row.username,
        connectionName: row.connection_name
      }));
    } catch (error) {
      logger.error('Error listing query history:', error);
      throw error;
    }
  }

  /**
   * Get query statistics for a user
   */
  static async getUserStats(userId, days = 30) {
    const db = getTursoClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const result = await db.execute({
        sql: `SELECT
                COUNT(*) as total_queries,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_queries,
                SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_queries,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_queries,
                AVG(execution_time_ms) as avg_execution_time,
                SUM(row_count) as total_rows_returned
              FROM query_history
              WHERE user_id = ? AND created_at >= ?`,
        args: [userId, startDate.toISOString()]
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Delete old query history (for cleanup job)
   */
  static async deleteOlderThan(days = 90) {
    const db = getTursoClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
      const result = await db.execute({
        sql: 'DELETE FROM query_history WHERE created_at < ?',
        args: [cutoffDate.toISOString()]
      });

      logger.info(`Deleted query history older than ${days} days`);
      return result.rowsAffected;
    } catch (error) {
      logger.error('Error deleting old query history:', error);
      throw error;
    }
  }

  /**
   * Map database row to query history object
   */
  static _mapQueryHistory(row) {
    return {
      id: row.id,
      userId: row.user_id,
      connectionId: row.connection_id,
      sql: row.sql,
      status: row.status,
      rowCount: row.row_count,
      executionTimeMs: row.execution_time_ms,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      cancelledAt: row.cancelled_at
    };
  }

  /**
   * Convert camelCase to snake_case
   */
  static _toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
