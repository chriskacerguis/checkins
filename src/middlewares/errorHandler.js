import { logger } from '../config/logger.js';

export function notFound(_req, res, _next) {
  res.status(404).json({ error: 'Not Found' });
}

export function errorHandler(err, _req, res, _next) {
  logger.error({ err }, 'Request error');
  const status = err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
}
