import { createClient } from '@libsql/client';
import { DatabaseAdapter } from './DatabaseAdapter.js';
import logger from '../config/logger.js';

/**
 * Turso/libSQL Database Adapter
 * Supports both Turso Cloud and local SQLite files
 */
export class TursoAdapter extends DatabaseAdapter {
  constructor(config) {
    super();
    this.config = config;
    this.client = null;
  }

  /**
   * Initialize the Turso client
   */
  _ensureClient() {
    if (!this.client) {
      const url = this.config.url;
      const authToken = this.config.authToken;

      if (!url) {
        throw new Error('TURSO_DB_URL is required');
      }

      // Support both remote Turso and local SQLite
      const clientConfig = url.startsWith('file:')
        ? { url }
        : { url, authToken };

      this.client = createClient(clientConfig);
      logger.info(`Turso adapter initialized: ${url.startsWith('file:') ? 'local SQLite' : 'Turso Cloud'}`);
    }
    return this.client;
  }

  /**
   * Execute a SQL query
   */
  async execute(query) {
    const client = this._ensureClient();

    try {
      const result = await client.execute(query);

      return {
        rows: result.rows || [],
        rowsAffected: result.rowsAffected || 0
      };
    } catch (error) {
      logger.error('Turso query error:', error);
      throw error;
    }
  }

  /**
   * Close the connection
   */
  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      logger.info('Turso connection closed');
    }
  }

  /**
   * Begin transaction
   */
  async beginTransaction() {
    const client = this._ensureClient();
    await client.execute('BEGIN TRANSACTION');
  }

  /**
   * Commit transaction
   */
  async commit() {
    const client = this._ensureClient();
    await client.execute('COMMIT');
  }

  /**
   * Rollback transaction
   */
  async rollback() {
    const client = this._ensureClient();
    await client.execute('ROLLBACK');
  }

  /**
   * Get adapter type
   */
  getType() {
    return 'turso';
  }
}
