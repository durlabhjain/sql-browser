#!/usr/bin/env node
import { getDbAdapter } from '../config/database.js';
import logger from '../config/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get database-specific SQL for table creation
 */
function getTableSQL(dbType) {
  if (dbType === 'mysql') {
    return {
      users: `
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(512) NOT NULL,
          email VARCHAR(255),
          role ENUM('VIEWER', 'ANALYST', 'DEVELOPER', 'ADMIN') NOT NULL,
          is_active TINYINT(1) DEFAULT 1,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL,
          last_login_at DATETIME,
          INDEX idx_users_username (username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `,
      connections: `
        CREATE TABLE IF NOT EXISTS connections (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          encrypted_config TEXT NOT NULL,
          encrypted_password TEXT NOT NULL,
          is_active TINYINT(1) DEFAULT 1,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `,
      queryHistory: `
        CREATE TABLE IF NOT EXISTS query_history (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          connection_id VARCHAR(36) NOT NULL,
          sql MEDIUMTEXT NOT NULL,
          status ENUM('running', 'success', 'error', 'cancelled') NOT NULL,
          row_count INT,
          execution_time_ms INT,
          error_message TEXT,
          created_at DATETIME NOT NULL,
          cancelled_at DATETIME,
          INDEX idx_query_history_user_id (user_id),
          INDEX idx_query_history_connection_id (connection_id),
          INDEX idx_query_history_created_at (created_at),
          INDEX idx_query_history_status (status),
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (connection_id) REFERENCES connections(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `,
      indexes: [] // Indexes are created inline for MySQL
    };
  } else {
    // Turso/SQLite
    return {
      users: `
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          email TEXT,
          role TEXT NOT NULL CHECK(role IN ('VIEWER', 'ANALYST', 'DEVELOPER', 'ADMIN')),
          is_active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          last_login_at TEXT
        )
      `,
      connections: `
        CREATE TABLE IF NOT EXISTS connections (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          encrypted_config TEXT NOT NULL,
          encrypted_password TEXT NOT NULL,
          is_active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `,
      queryHistory: `
        CREATE TABLE IF NOT EXISTS query_history (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          connection_id TEXT NOT NULL,
          sql TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('running', 'success', 'error', 'cancelled')),
          row_count INTEGER,
          execution_time_ms INTEGER,
          error_message TEXT,
          created_at TEXT NOT NULL,
          cancelled_at TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (connection_id) REFERENCES connections(id)
        )
      `,
      indexes: [
        'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
        'CREATE INDEX IF NOT EXISTS idx_query_history_user_id ON query_history(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_query_history_connection_id ON query_history(connection_id)',
        'CREATE INDEX IF NOT EXISTS idx_query_history_created_at ON query_history(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_query_history_status ON query_history(status)'
      ]
    };
  }
}

async function setupDatabase() {
  logger.info('Setting up database...');

  const db = getDbAdapter();
  const dbType = db.getType();
  const sql = getTableSQL(dbType);

  logger.info(`Database type: ${dbType}`);

  try {
    // Create users table
    await db.execute({ sql: sql.users, args: [] });
    logger.info('✓ Users table created');

    // Create connections table
    await db.execute({ sql: sql.connections, args: [] });
    logger.info('✓ Connections table created');

    // Create query_history table
    await db.execute({ sql: sql.queryHistory, args: [] });
    logger.info('✓ Query history table created');

    // Create indexes (for SQLite/Turso only, MySQL has them inline)
    if (sql.indexes.length > 0) {
      for (const indexSql of sql.indexes) {
        await db.execute({ sql: indexSql, args: [] });
      }
      logger.info('✓ Indexes created');
    }

    logger.info('Database setup completed successfully!');
  } catch (error) {
    logger.error('Error setting up database:', error);
    process.exit(1);
  }
}

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

setupDatabase();
