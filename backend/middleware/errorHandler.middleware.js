import { AppError } from '../utils/errorHandler.js';

export const errorHandler = (err, req, res, next) => {
  const error = err instanceof AppError ? err : new AppError(err.message);

  const response = {
    success: false,
    statusCode: error.statusCode,
    error: {
      code: error.code,
      message: error.message,
    },
    timestamp: error.timestamp,
    path: req.path,
  };

  if (error.details) {
    response.error.details = error.details;
  }

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(error.statusCode).json(response);
};