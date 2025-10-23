import express from 'express';
import dotenv from 'dotenv';
import logger from './config/logger.js';
import { securityHeaders, corsConfig, generalRateLimiter, sanitizeRequest, requestLogger } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { SqlService } from './services/SqlService.js';

// Import routes
import authRoutes from './routes/auth.js';
import queryRoutes from './routes/query.js';
import adminRoutes from './routes/admin.js';
import connectionRoutes from './routes/connections.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (needed for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(securityHeaders());
app.use(corsConfig());
app.use(generalRateLimiter());
app.use(sanitizeRequest);
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/connections', connectionRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'SQL Browser API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/docs'
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');

  server.close(async () => {
    try {
      await SqlService.closeAllPools();
      logger.info('All database connections closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');

  server.close(async () => {
    try {
      await SqlService.closeAllPools();
      logger.info('All database connections closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`SQL Browser API server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

export default app;
