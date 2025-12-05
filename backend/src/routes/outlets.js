import express from 'express';
import { OutletModel } from '../models/Outlet.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * GET /api/outlets
 * List all outlets with pagination
 */
router.get('/',
  authenticate,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';

    const result = await OutletModel.list({ limit, offset, search });

    res.json(result);
  })
);

/**
 * GET /api/outlets/:id
 * Get a single outlet by ID
 */
router.get('/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const outlet = await OutletModel.findById(req.params.id);

    if (!outlet) {
      return res.status(404).json({
        error: 'Outlet not found'
      });
    }

    res.json(outlet);
  })
);

/**
 * POST /api/outlets
 * Create a new outlet (admin only)
 */
router.post('/',
  authenticate,
  asyncHandler(async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only administrators can create outlets'
      });
    }

    const { code, name, image } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Code and name are required'
      });
    }

    // Check if outlet with same code already exists
    const existing = await OutletModel.findByCode(code);
    if (existing) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'An outlet with this code already exists'
      });
    }

    const outlet = await OutletModel.create({ code, name, image });

    logger.info(`Outlet created by ${req.user.username}: ${code}`);

    res.status(201).json(outlet);
  })
);

/**
 * PUT /api/outlets/:id
 * Update an outlet (admin only)
 */
router.put('/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only administrators can update outlets'
      });
    }

    const outlet = await OutletModel.findById(req.params.id);

    if (!outlet) {
      return res.status(404).json({
        error: 'Outlet not found'
      });
    }

    const { code, name, image } = req.body;
    const updates = {};

    if (code !== undefined) updates.code = code;
    if (name !== undefined) updates.name = name;
    if (image !== undefined) updates.image = image;

    const updatedOutlet = await OutletModel.update(req.params.id, updates);

    logger.info(`Outlet updated by ${req.user.username}: ${req.params.id}`);

    res.json(updatedOutlet);
  })
);

/**
 * DELETE /api/outlets/:id
 * Delete an outlet (admin only)
 */
router.delete('/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only administrators can delete outlets'
      });
    }

    const outlet = await OutletModel.findById(req.params.id);

    if (!outlet) {
      return res.status(404).json({
        error: 'Outlet not found'
      });
    }

    await OutletModel.delete(req.params.id);

    logger.info(`Outlet deleted by ${req.user.username}: ${req.params.id}`);

    res.json({
      message: 'Outlet deleted successfully'
    });
  })
);

export default router;
