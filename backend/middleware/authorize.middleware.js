import { AuthorizationError } from '../utils/errorHandler.js';

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('User not authenticated'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AuthorizationError(
          `Only ${allowedRoles.join(', ')} can access this resource`
        )
      );
    }

    next();
  };
};

export const authorizeOwner = (req, res, next) => {
  if (
    req.user.role !== 'ADMIN' &&
    req.user.userId !== req.params.id
  ) {
    return next(
      new AuthorizationError('You can only access your own data')
    );
  }
  next();
};