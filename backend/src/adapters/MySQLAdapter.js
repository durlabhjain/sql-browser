import mysql from 'mysql2/promise';
import { DatabaseAdapter } from './DatabaseAdapter.js';
import logger from '../config/logger.js';

/**
 * MySQL Database Adapter
 * Supports MySQL and MariaDB
 */
export class MySQLAdapter extends DatabaseAdapter {
  constructor(config) {
    super();
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 3306,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    };
    this.pool = null;
    this.connection = null; // For transactions
  }

  /**
   * Initialize the MySQL connection pool
   */
  _ensurePool() {
    if (!this.pool) {
      this.pool = mysql.createPool(this.config);
      logger.info(`MySQL adapter initialized: ${this.config.host}:${this.config.port}/${this.config.database}`);
    }
    return this.pool;
  }

  /**
   * Execute a SQL query
   * Converts SQLite-style ? placeholders to work with MySQL
   */
  async execute(query) {
    const pool = this._ensurePool();

    try {
      // If we're in a transaction, use the transaction connection
      const connection = this.connection || pool;

      // MySQL uses ? placeholders like SQLite, so no conversion needed
      const [rows, fields] = await connection.execute(query.sql, query.args || []);

      // Handle different result types
      if (Array.isArray(rows)) {
        // SELECT query
        return {
          rows: rows,
          rowsAffected: 0
        };
      } else {
        // INSERT, UPDATE, DELETE query
        return {
          rows: [],
          rowsAffected: rows.affectedRows || 0
        };
      }
    } catch (error) {
      logger.error('MySQL query error:', error);
      throw error;
    }
  }

  /**
   * Close the connection pool
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('MySQL connection pool closed');
    }
  }

  /**
   * Begin transaction
   */
  async beginTransaction() {
    const pool = this._ensurePool();
    this.connection = await pool.getConnection();
    await this.connection.beginTransaction();
    logger.debug('MySQL transaction started');
  }

  /**
   * Commit transaction
   */
  async commit() {
    if (!this.connection) {
      throw new Error('No active transaction');
    }
    await this.connection.commit();
    this.connection.release();
    this.connection = null;
    logger.debug('MySQL transaction committed');
  }

  /**
   * Rollback transaction
   */
  async rollback() {
    if (!this.connection) {
      throw new Error('No active transaction');
    }
    await this.connection.rollback();
    this.connection.release();
    this.connection = null;
    logger.debug('MySQL transaction rolled back');
  }

  /**
   * Get adapter type
   */
  getType() {
    return 'mysql';
  }
}
