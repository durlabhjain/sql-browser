import dotenv from 'dotenv';
import { TursoAdapter } from '../adapters/TursoAdapter.js';
import { MySQLAdapter } from '../adapters/MySQLAdapter.js';
import logger from './logger.js';

dotenv.config();

// Database adapter instance (Turso or MySQL)
let dbAdapter = null;

/**
 * Get the database adapter based on environment configuration
 * Supports both Turso/SQLite and MySQL
 */
export function getDbAdapter() {
  if (!dbAdapter) {
    const dbType = process.env.DB_TYPE || 'turso';

    if (dbType === 'mysql') {
      // MySQL configuration
      const config = {
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE
      };

      if (!config.user || !config.password || !config.database) {
        throw new Error('MySQL configuration incomplete: MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE are required');
      }

      dbAdapter = new MySQLAdapter(config);
      logger.info('Using MySQL adapter for metadata storage');
    } else {
      // Turso/SQLite configuration (default)
      const url = process.env.TURSO_DB_URL;
      const authToken = process.env.TURSO_AUTH_TOKEN;

      if (!url) {
        throw new Error('TURSO_DB_URL is required (or set DB_TYPE=mysql for MySQL)');
      }

      const config = {
        url,
        authToken
      };

      dbAdapter = new TursoAdapter(config);
      logger.info('Using Turso/SQLite adapter for metadata storage');
    }
  }
  return dbAdapter;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getDbAdapter() instead
 */
export function getTursoClient() {
  return getDbAdapter();
}

// SQL Server connection pool management
const sqlPools = new Map();

export function getSqlPool(connectionConfig) {
  const poolKey = `${connectionConfig.server}_${connectionConfig.database}`;

  if (sqlPools.has(poolKey)) {
    return sqlPools.get(poolKey);
  }

  // Connection pools are created on-demand by the SQL service
  return null;
}

export function setSqlPool(connectionConfig, pool) {
  const poolKey = `${connectionConfig.server}_${connectionConfig.database}`;
  sqlPools.set(poolKey, pool);
}

export function closeSqlPool(connectionConfig) {
  const poolKey = `${connectionConfig.server}_${connectionConfig.database}`;
  const pool = sqlPools.get(poolKey);

  if (pool) {
    pool.close();
    sqlPools.delete(poolKey);
  }
}

export function closeAllSqlPools() {
  for (const pool of sqlPools.values()) {
    pool.close();
  }
  sqlPools.clear();
}
