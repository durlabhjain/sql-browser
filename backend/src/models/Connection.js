import { getTursoClient } from '../config/database.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

export class ConnectionModel {
  /**
   * Create a new SQL Server connection
   */
  static async create(connectionData) {
    const db = getTursoClient();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    // Encrypt sensitive fields
    const encryptedPassword = encrypt(connectionData.password);
    const encryptedConfig = encrypt(JSON.stringify({
      server: connectionData.server,
      port: connectionData.port || 1433,
      database: connectionData.database,
      user: connectionData.user,
      encrypt: connectionData.encrypt !== false,
      trustServerCertificate: connectionData.trustServerCertificate || false,
      connectionTimeout: connectionData.connectionTimeout || 30000,
      requestTimeout: connectionData.requestTimeout || 30000
    }));

    try {
      await db.execute({
        sql: `INSERT INTO connections (id, name, encrypted_config, encrypted_password, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [id, connectionData.name, encryptedConfig, encryptedPassword, 1, createdAt, createdAt]
      });

      logger.info(`Connection created: ${connectionData.name}`);

      return {
        id,
        name: connectionData.name,
        isActive: true,
        createdAt
      };
    } catch (error) {
      logger.error('Error creating connection:', error);
      throw error;
    }
  }

  /**
   * Find connection by ID
   */
  static async findById(id) {
    const db = getTursoClient();

    try {
      const result = await db.execute({
        sql: 'SELECT * FROM connections WHERE id = ?',
        args: [id]
      });

      if (result.rows.length === 0) {
        return null;
      }

      return this._mapConnection(result.rows[0]);
    } catch (error) {
      logger.error('Error finding connection by ID:', error);
      throw error;
    }
  }

  /**
   * Get decrypted connection config for query execution
   */
  static async getDecryptedConfig(id) {
    const connection = await this.findById(id);

    if (!connection || !connection.isActive) {
      throw new Error('Connection not found or inactive');
    }

    const config = JSON.parse(decrypt(connection.encryptedConfig));
    const password = decrypt(connection.encryptedPassword);

    return {
      ...config,
      password
    };
  }

  /**
   * List all connections (without sensitive data)
   */
  static async list({ includeInactive = false } = {}) {
    const db = getTursoClient();

    try {
      const sql = includeInactive
        ? 'SELECT id, name, is_active, created_at, updated_at FROM connections ORDER BY name'
        : 'SELECT id, name, is_active, created_at, updated_at FROM connections WHERE is_active = 1 ORDER BY name';

      const result = await db.execute(sql);

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      logger.error('Error listing connections:', error);
      throw error;
    }
  }

  /**
   * Update connection
   */
  static async update(id, updates) {
    const db = getTursoClient();
    const updatedAt = new Date().toISOString();

    // If updating connection details, encrypt them
    if (updates.server || updates.port || updates.database || updates.user) {
      const current = await this.getDecryptedConfig(id);
      const newConfig = {
        server: updates.server || current.server,
        port: updates.port || current.port,
        database: updates.database || current.database,
        user: updates.user || current.user,
        encrypt: updates.encrypt !== undefined ? updates.encrypt : current.encrypt,
        trustServerCertificate: updates.trustServerCertificate !== undefined
          ? updates.trustServerCertificate
          : current.trustServerCertificate,
        connectionTimeout: updates.connectionTimeout || current.connectionTimeout,
        requestTimeout: updates.requestTimeout || current.requestTimeout
      };

      const encryptedConfig = encrypt(JSON.stringify(newConfig));

      if (updates.password) {
        const encryptedPassword = encrypt(updates.password);
        await db.execute({
          sql: `UPDATE connections SET name = ?, encrypted_config = ?, encrypted_password = ?, updated_at = ? WHERE id = ?`,
          args: [updates.name || (await this.findById(id)).name, encryptedConfig, encryptedPassword, updatedAt, id]
        });
      } else {
        await db.execute({
          sql: `UPDATE connections SET name = ?, encrypted_config = ?, updated_at = ? WHERE id = ?`,
          args: [updates.name || (await this.findById(id)).name, encryptedConfig, updatedAt, id]
        });
      }
    } else if (updates.name) {
      await db.execute({
        sql: `UPDATE connections SET name = ?, updated_at = ? WHERE id = ?`,
        args: [updates.name, updatedAt, id]
      });
    }

    logger.info(`Connection updated: ${id}`);
    return this.findById(id);
  }

  /**
   * Delete connection (soft delete)
   */
  static async delete(id) {
    const db = getTursoClient();

    try {
      await db.execute({
        sql: 'UPDATE connections SET is_active = 0, updated_at = ? WHERE id = ?',
        args: [new Date().toISOString(), id]
      });

      logger.info(`Connection deleted (soft): ${id}`);
      return true;
    } catch (error) {
      logger.error('Error deleting connection:', error);
      throw error;
    }
  }

  /**
   * Test connection
   */
  static async testConnection(id) {
    try {
      const config = await this.getDecryptedConfig(id);
      const sql = await import('mssql');

      const pool = new sql.ConnectionPool(config);
      await pool.connect();
      await pool.close();

      return { success: true, message: 'Connection successful' };
    } catch (error) {
      logger.error('Connection test failed:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Map database row to connection object (without decryption)
   */
  static _mapConnection(row) {
    return {
      id: row.id,
      name: row.name,
      encryptedConfig: row.encrypted_config,
      encryptedPassword: row.encrypted_password,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
