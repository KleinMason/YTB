import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.js';

/**
 * Extended Request interface with authenticated user data
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

/**
 * Authentication middleware that verifies JWT tokens from Authorization header
 * 
 * Expects token in format: "Bearer <token>"
 * 
 * On success: Attaches user.userId to request object and calls next()
 * On failure: Returns 401 Unauthorized response
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Extract Authorization header
    const authHeader = req.headers.authorization;

    // Check if Authorization header is present
    if (!authHeader) {
      res.status(401).json({
        error: {
          message: 'Authorization header is required',
          statusCode: 401,
        },
      });
      return;
    }

    // Check if header follows Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          message: 'Invalid authorization format. Expected: Bearer <token>',
          statusCode: 401,
        },
      });
      return;
    }

    // Extract token from header
    const token = authHeader.slice(7); // Remove "Bearer " prefix

    // Check if token is present after Bearer prefix
    if (!token) {
      res.status(401).json({
        error: {
          message: 'Token is required',
          statusCode: 401,
        },
      });
      return;
    }

    // Verify token and get payload
    const payload: JwtPayload = verifyToken(token);

    // Attach user id to request object
    req.user = {
      userId: payload.userId,
    };

    next();
  } catch (error) {
    // Handle JWT verification errors
    res.status(401).json({
      error: {
        message: 'Invalid or expired token',
        statusCode: 401,
      },
    });
  }
}
