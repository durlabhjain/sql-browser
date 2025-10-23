import logger from '../config/logger.js';

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    user: req.user?.username || 'anonymous'
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Handle specific error types
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: isDevelopment ? err.details : undefined
    });
  }

  if (err.name === 'ConnectionError') {
    return res.status(503).json({
      error: 'Database Connection Error',
      message: 'Unable to connect to the database'
    });
  }

  if (err.name === 'QueryError') {
    return res.status(400).json({
      error: 'Query Error',
      message: isDevelopment ? err.message : 'Failed to execute query'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: isDevelopment ? err.message : 'An unexpected error occurred',
    stack: isDevelopment ? err.stack : undefined
  });
}

/**
 * 404 handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
}

/**
 * Async handler wrapper to catch errors in async routes
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
