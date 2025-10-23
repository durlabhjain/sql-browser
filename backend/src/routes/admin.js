import express from 'express';
import { UserModel } from '../models/User.js';
import { ConnectionModel } from '../models/Connection.js';
import { SqlService } from '../services/SqlService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, createUserSchema, updateUserSchema, connectionSchema } from '../utils/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ROLES } from '../config/roles.js';
import logger from '../config/logger.js';

const router = express.Router();

// All admin routes require ADMIN role
router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

/**
 * User Management
 */

// GET /api/admin/users
router.get('/users',
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const users = await UserModel.list({ limit, offset });

    res.json({
      data: users,
      limit,
      offset,
      count: users.length
    });
  })
);

// POST /api/admin/users
router.post('/users',
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const userData = req.validatedData;

    // Check if username already exists
    const existing = await UserModel.findByUsername(userData.username);
    if (existing) {
      return res.status(409).json({
        error: 'Username already exists'
      });
    }

    const user = await UserModel.create(userData);

    logger.info(`User created by admin ${req.user.username}: ${user.username}`);

    res.status(201).json(user);
  })
);

// GET /api/admin/users/:id
router.get('/users/:id',
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password hash from response
    delete user.passwordHash;

    res.json(user);
  })
);

// PUT /api/admin/users/:id
router.put('/users/:id',
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const updates = req.validatedData;

    // If updating username, check for conflicts
    if (updates.username) {
      const existing = await UserModel.findByUsername(updates.username);
      if (existing && existing.id !== req.params.id) {
        return res.status(409).json({
          error: 'Username already exists'
        });
      }
    }

    const user = await UserModel.update(req.params.id, updates);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`User updated by admin ${req.user.username}: ${user.id}`);

    delete user.passwordHash;

    res.json(user);
  })
);

// DELETE /api/admin/users/:id
router.delete('/users/:id',
  asyncHandler(async (req, res) => {
    // Prevent deleting yourself
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        error: 'Cannot delete your own account'
      });
    }

    await UserModel.delete(req.params.id);

    logger.info(`User deleted by admin ${req.user.username}: ${req.params.id}`);

    res.json({ message: 'User deleted successfully' });
  })
);

/**
 * Connection Management
 */

// GET /api/admin/connections
router.get('/connections',
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';

    const connections = await ConnectionModel.list({ includeInactive });

    res.json({
      data: connections,
      count: connections.length
    });
  })
);

// POST /api/admin/connections
router.post('/connections',
  validate(connectionSchema),
  asyncHandler(async (req, res) => {
    const connectionData = req.validatedData;

    const connection = await ConnectionModel.create(connectionData);

    logger.info(`Connection created by admin ${req.user.username}: ${connection.name}`);

    res.status(201).json(connection);
  })
);

// GET /api/admin/connections/:id
router.get('/connections/:id',
  asyncHandler(async (req, res) => {
    const connection = await ConnectionModel.findById(req.params.id);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Don't expose encrypted config
    const { encryptedConfig, encryptedPassword, ...safeConnection } = connection;

    res.json(safeConnection);
  })
);

// PUT /api/admin/connections/:id
router.put('/connections/:id',
  asyncHandler(async (req, res) => {
    const updates = req.body;

    const connection = await ConnectionModel.update(req.params.id, updates);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    logger.info(`Connection updated by admin ${req.user.username}: ${connection.id}`);

    const { encryptedConfig, encryptedPassword, ...safeConnection } = connection;

    res.json(safeConnection);
  })
);

// DELETE /api/admin/connections/:id
router.delete('/connections/:id',
  asyncHandler(async (req, res) => {
    await ConnectionModel.delete(req.params.id);

    logger.info(`Connection deleted by admin ${req.user.username}: ${req.params.id}`);

    res.json({ message: 'Connection deleted successfully' });
  })
);

// POST /api/admin/connections/:id/test
router.post('/connections/:id/test',
  asyncHandler(async (req, res) => {
    const result = await SqlService.testConnection(req.params.id);

    res.json(result);
  })
);

/**
 * System Statistics
 */

// GET /api/admin/stats
router.get('/stats',
  asyncHandler(async (req, res) => {
    // This could be expanded with more comprehensive stats
    const users = await UserModel.list({ limit: 1000 });
    const connections = await ConnectionModel.list({ includeInactive: true });

    res.json({
      users: {
        total: users.length,
        active: users.filter(u => u.isActive).length,
        byRole: {
          admin: users.filter(u => u.role === ROLES.ADMIN).length,
          developer: users.filter(u => u.role === ROLES.DEVELOPER).length,
          analyst: users.filter(u => u.role === ROLES.ANALYST).length,
          viewer: users.filter(u => u.role === ROLES.VIEWER).length
        }
      },
      connections: {
        total: connections.length,
        active: connections.filter(c => c.isActive).length
      }
    });
  })
);

export default router;
