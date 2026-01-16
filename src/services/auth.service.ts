import { prisma } from '../db/prisma.js';
import { hashPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { isValidEmail, isValidPassword } from './validation.service.js';

export interface RegisterUserInput {
  email: string;
  password: string;
}

export interface RegisterUserResult {
  success: true;
  user: {
    id: string;
    email: string;
    createdAt: Date;
  };
  token: string;
}

export interface RegisterUserError {
  success: false;
  error: {
    message: string;
    statusCode: number;
    details?: string[];
  };
}

export type RegisterUserResponse = RegisterUserResult | RegisterUserError;

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface LoginUserError {
  success: false;
  error: {
    message: string;
    statusCode: number;
  };
}

export type LoginUserResponse = LoginUserError;

export async function loginUser(input: LoginUserInput): Promise<LoginUserResponse> {
  const { email, password } = input;

  // Validate required fields
  if (!email || !password) {
    return {
      success: false,
      error: {
        message: 'Email and password are required',
        statusCode: 400,
      },
    };
  }

  // Query database for user by email (normalized to lowercase)
  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // Return 401 if user not found
  if (!user) {
    return {
      success: false,
      error: {
        message: 'Invalid credentials',
        statusCode: 401,
      },
    };
  }

  // Placeholder for password verification and token generation (next features)
  return {
    success: false,
    error: {
      message: 'Not implemented',
      statusCode: 501,
    },
  };
}

export async function registerUser(input: RegisterUserInput): Promise<RegisterUserResponse> {
  const { email, password } = input;

  // Validate required fields
  if (!email || !password) {
    return {
      success: false,
      error: {
        message: 'Email and password are required',
        statusCode: 400,
      },
    };
  }

  // Validate email format
  if (!isValidEmail(email)) {
    return {
      success: false,
      error: {
        message: 'Invalid email format',
        statusCode: 400,
      },
    };
  }

  // Validate password requirements
  const passwordValidation = isValidPassword(password);
  if (!passwordValidation.valid) {
    return {
      success: false,
      error: {
        message: 'Password does not meet requirements',
        statusCode: 400,
        details: passwordValidation.errors,
      },
    };
  }

  // Check if email already exists in database
  const normalizedEmail = email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    return {
      success: false,
      error: {
        message: 'Email already registered',
        statusCode: 409,
      },
    };
  }

  // Hash password using utility function
  const passwordHash = await hashPassword(password);

  // Create user in database
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
    },
  });

  // Generate JWT token for the new user
  const token = signToken(user.id);

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    },
    token,
  };
}
