// Role-based permission configuration
export const ROLES = {
  VIEWER: 'VIEWER',
  ANALYST: 'ANALYST',
  DEVELOPER: 'DEVELOPER',
  ADMIN: 'ADMIN'
};

export const ROLE_PERMISSIONS = {
  [ROLES.VIEWER]: {
    allowedStatements: ['SELECT'],
    maxRows: 1000,
    queryTimeoutMs: 30000,
    canCancelQueries: true,
    canViewHistory: true,
    canManageUsers: false,
    canManageConnections: false
  },
  [ROLES.ANALYST]: {
    allowedStatements: ['SELECT', 'INSERT', 'UPDATE'],
    maxRows: 5000,
    queryTimeoutMs: 60000,
    canCancelQueries: true,
    canViewHistory: true,
    canManageUsers: false,
    canManageConnections: false
  },
  [ROLES.DEVELOPER]: {
    allowedStatements: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'MERGE'],
    maxRows: 10000,
    queryTimeoutMs: 120000,
    canCancelQueries: true,
    canViewHistory: true,
    canManageUsers: false,
    canManageConnections: false
  },
  [ROLES.ADMIN]: {
    allowedStatements: ['*'], // All statements including DDL
    maxRows: 50000,
    queryTimeoutMs: 300000,
    canCancelQueries: true,
    canViewHistory: true,
    canManageUsers: true,
    canManageConnections: true
  }
};

export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.VIEWER];
}

export function canExecuteStatement(role, sql) {
  const permissions = getRolePermissions(role);

  if (permissions.allowedStatements.includes('*')) {
    return { allowed: true };
  }

  // Simple SQL statement detection (can be enhanced with proper SQL parser)
  const normalizedSql = sql.trim().toUpperCase();

  for (const statement of permissions.allowedStatements) {
    if (normalizedSql.startsWith(statement)) {
      return { allowed: true, statement };
    }
  }

  // Check for dangerous DDL operations
  const ddlKeywords = [
    'CREATE', 'ALTER', 'DROP', 'TRUNCATE',
    'GRANT', 'REVOKE', 'EXECUTE', 'EXEC'
  ];

  for (const keyword of ddlKeywords) {
    if (normalizedSql.startsWith(keyword)) {
      return {
        allowed: false,
        reason: `Role ${role} is not permitted to execute ${keyword} statements`
      };
    }
  }

  return {
    allowed: false,
    reason: `Role ${role} is not permitted to execute this type of query`
  };
}

export function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}
