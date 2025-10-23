import express from 'express';
import { SqlService } from '../services/SqlService.js';
import { QueryHistoryModel } from '../models/QueryHistory.js';
import { authenticate } from '../middleware/auth.js';
import { validate, executeQuerySchema, validateQueryParams, queryHistorySchema } from '../utils/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { queryRateLimiter } from '../middleware/security.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * POST /api/query/execute
 * Execute SQL query
 */
router.post('/execute',
  authenticate,
  queryRateLimiter(),
  validate(executeQuerySchema),
  asyncHandler(async (req, res) => {
    const { connectionId, sql, parameters } = req.validatedData;

    logger.info(`Query execution requested by ${req.user.username} on connection ${connectionId}`);

    const result = await SqlService.executeQuery({
      connectionId,
      sql,
      parameters,
      userId: req.user.id,
      userRole: req.user.role
    });

    res.json(result);
  })
);

/**
 * POST /api/query/cancel/:queryId
 * Cancel running query
 */
router.post('/cancel/:queryId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { queryId } = req.params;

    logger.info(`Query cancellation requested by ${req.user.username} for query ${queryId}`);

    const result = await SqlService.cancelQuery(queryId, req.user.id);

    res.json(result);
  })
);

/**
 * GET /api/query/history
 * Get query history
 */
router.get('/history',
  authenticate,
  validateQueryParams(queryHistorySchema),
  asyncHandler(async (req, res) => {
    const { limit, offset, startDate, endDate, connectionId, status } = req.validatedQuery;

    // Users can only see their own history unless they're admin
    const userId = req.user.role === 'ADMIN' ? null : req.user.id;

    const history = await QueryHistoryModel.list({
      userId,
      connectionId,
      status,
      startDate,
      endDate,
      limit,
      offset
    });

    res.json({
      data: history,
      limit,
      offset,
      count: history.length
    });
  })
);

/**
 * GET /api/query/history/:id
 * Get specific query details
 */
router.get('/history/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const query = await QueryHistoryModel.findById(id);

    if (!query) {
      return res.status(404).json({ error: 'Query not found' });
    }

    // Users can only see their own queries unless they're admin
    if (query.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(query);
  })
);

/**
 * GET /api/query/running
 * Get user's running queries
 */
router.get('/running',
  authenticate,
  asyncHandler(async (req, res) => {
    const runningQueries = SqlService.getRunningQueries(req.user.id);

    res.json({
      queries: runningQueries,
      count: runningQueries.length
    });
  })
);

/**
 * GET /api/query/stats
 * Get query statistics for current user
 */
router.get('/stats',
  authenticate,
  asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 30;

    const stats = await QueryHistoryModel.getUserStats(req.user.id, days);

    res.json({
      period: `${days} days`,
      ...stats
    });
  })
);

export default router;
