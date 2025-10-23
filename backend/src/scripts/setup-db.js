#!/usr/bin/env node
import { getTursoClient } from '../config/database.js';
import logger from '../config/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  logger.info('Setting up database...');

  const db = getTursoClient();

  try {
    // Create users table
    await db.execute(`
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
    `);
    logger.info('✓ Users table created');

    // Create connections table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        encrypted_config TEXT NOT NULL,
        encrypted_password TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    logger.info('✓ Connections table created');

    // Create query_history table
    await db.execute(`
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
    `);
    logger.info('✓ Query history table created');

    // Create indexes for better performance
    await db.execute('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_query_history_user_id ON query_history(user_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_query_history_connection_id ON query_history(connection_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_query_history_created_at ON query_history(created_at)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_query_history_status ON query_history(status)');
    logger.info('✓ Indexes created');

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
