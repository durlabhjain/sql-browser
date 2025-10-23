import { z } from 'zod';
import { ROLES } from '../config/roles.js';

// User validation schemas
export const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100)
});

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
  email: z.string().email().optional(),
  role: z.enum([ROLES.VIEWER, ROLES.ANALYST, ROLES.DEVELOPER, ROLES.ADMIN]),
  isActive: z.boolean().default(true)
});

export const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(8).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum([ROLES.VIEWER, ROLES.ANALYST, ROLES.DEVELOPER, ROLES.ADMIN]).optional(),
  isActive: z.boolean().optional()
});

// SQL Server connection validation
export const connectionSchema = z.object({
  name: z.string().min(1).max(100),
  server: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(1433),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
  encrypt: z.boolean().default(true),
  trustServerCertificate: z.boolean().default(false),
  connectionTimeout: z.number().int().min(1000).max(60000).default(30000),
  requestTimeout: z.number().int().min(1000).max(600000).default(30000)
});

// Query execution validation
export const executeQuerySchema = z.object({
  connectionId: z.string().uuid(),
  sql: z.string().min(1).max(1000000), // 1MB max query size
  parameters: z.array(z.any()).optional()
});

// Query history filter validation
export const queryHistorySchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  connectionId: z.string().uuid().optional(),
  status: z.enum(['success', 'error', 'cancelled']).optional()
});

// Validation middleware factory
export function validate(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validatedData = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      next(error);
    }
  };
}

// Query validation helper
export function validateQueryParams(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.query);
      req.validatedQuery = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      next(error);
    }
  };
}
