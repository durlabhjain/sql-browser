import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

// Turso/libSQL client for metadata storage
let tursoClient = null;

export function getTursoClient() {
  if (!tursoClient) {
    const url = process.env.TURSO_DB_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
      throw new Error('TURSO_DB_URL is required');
    }

    // Support both remote Turso and local SQLite
    const config = url.startsWith('file:')
      ? { url }
      : { url, authToken };

    tursoClient = createClient(config);
  }
  return tursoClient;
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
