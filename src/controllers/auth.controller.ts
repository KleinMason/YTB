import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser } from '../services/auth.service.js';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    const result = await registerUser({ email, password });

    if (!result.success) {
      res.status(result.error.statusCode).json({
        error: result.error,
      });
      return;
    }

    res.status(201).json({
      message: 'User created successfully',
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    const result = await loginUser({ email, password });

    if (!result.success) {
      res.status(result.error.statusCode).json({
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      message: 'Login successful',
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    next(error);
  }
}
