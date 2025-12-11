import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import prisma from '../lib/prisma';
import { config } from '../lib/config';
import {
  AuthInvalidCredentialsError,
  AuthTokenInvalidError,
  ConflictError,
  NotFoundError,
} from '../lib/errors';
import { JwtPayload } from '../middleware/auth';

const BCRYPT_ROUNDS = 12;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserWithoutPassword {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

function excludePassword(user: User): UserWithoutPassword {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function generateTokens(user: User): AuthTokens {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
  };

  const accessToken = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRY,
  });

  const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRY,
  });

  return { accessToken, refreshToken };
}

export async function register(
  email: string,
  password: string,
  name: string
): Promise<{ user: UserWithoutPassword; tokens: AuthTokens }> {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ConflictError('User', 'email');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
    },
  });

  const tokens = generateTokens(user);

  return {
    user: excludePassword(user),
    tokens,
  };
}

export async function login(
  email: string,
  password: string
): Promise<{ user: UserWithoutPassword; tokens: AuthTokens }> {
  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AuthInvalidCredentialsError();
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw new AuthInvalidCredentialsError();
  }

  const tokens = generateTokens(user);

  return {
    user: excludePassword(user),
    tokens,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string }> {
  try {
    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as JwtPayload;

    // Verify user still exists
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      throw new AuthTokenInvalidError('User no longer exists');
    }

    // Generate new access token
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
    };

    const accessToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRY,
    });

    return { accessToken };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthTokenInvalidError('Refresh token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthTokenInvalidError('Invalid refresh token');
    }
    throw error;
  }
}

export async function getCurrentUser(userId: string): Promise<UserWithoutPassword> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User', userId);
  }

  return excludePassword(user);
}
