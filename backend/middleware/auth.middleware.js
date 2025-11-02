import { JWTHelper } from '../utils/jwt.js';
import { AuthenticationError } from '../utils/errorHandler.js';

export const authenticate = (req, res, next) => {
  try {
    const token = JWTHelper.extractTokenFromHeader(
      req.headers.authorization
    );

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const decoded = JWTHelper.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(new AuthenticationError(error.message));
  }
};