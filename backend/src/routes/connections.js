import express from 'express';
import { ConnectionModel } from '../models/Connection.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /api/connections
 * List available connections (non-admin users can only see active connections)
 */
router.get('/',
  authenticate,
  asyncHandler(async (req, res) => {
    // Only return active connections with minimal info
    const connections = await ConnectionModel.list({ includeInactive: false });

    // Return only safe fields
    const safeConnections = connections.map(conn => ({
      id: conn.id,
      name: conn.name,
      isActive: conn.isActive
    }));

    res.json({
      data: safeConnections,
      count: safeConnections.length
    });
  })
);

/**
 * GET /api/connections/:id
 * Get connection details (only name and id, no sensitive info)
 */
router.get('/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const connection = await ConnectionModel.findById(req.params.id);

    if (!connection || !connection.isActive) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    res.json({
      id: connection.id,
      name: connection.name,
      isActive: connection.isActive
    });
  })
);

export default router;
