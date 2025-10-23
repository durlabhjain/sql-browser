import express from 'express';
import { UserModel } from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { validate, loginSchema } from '../utils/validation.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authRateLimiter } from '../middleware/security.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login',
  authRateLimiter(),
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { username, password } = req.validatedData;

    const user = await UserModel.verifyCredentials(username, password);

    if (!user) {
      logger.warn(`Failed login attempt for username: ${username}`);
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
    }

    // Update last login time
    await UserModel.updateLastLogin(user.id);

    // Generate JWT token
    const token = generateToken(user);

    logger.info(`User logged in: ${user.username}`);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  })
);

/**
 * POST /api/auth/logout
 * User logout (client-side token removal)
 */
router.post('/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    logger.info(`User logged out: ${req.user.username}`);

    res.json({
      message: 'Logged out successfully'
    });
  })
);

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    });
  })
);

/**
 * PUT /api/auth/change-password
 * Change current user's password
 */
router.put('/change-password',
  authenticate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Both currentPassword and newPassword are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters'
      });
    }

    // Verify current password
    const user = await UserModel.findById(req.user.id);
    const verified = await UserModel.verifyCredentials(user.username, currentPassword);

    if (!verified) {
      return res.status(401).json({
        error: 'Current password is incorrect'
      });
    }

    // Update password
    await UserModel.update(req.user.id, { password: newPassword });

    logger.info(`Password changed for user: ${req.user.username}`);

    res.json({
      message: 'Password changed successfully'
    });
  })
);

export default router;
