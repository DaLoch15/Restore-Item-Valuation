import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import prisma from '../lib/prisma';
import { config } from '../lib/config';
import {
  AuthInvalidCredentialsError,
  NotFoundError,
  ConflictError,
} from '../lib/errors';
import { JwtPayload } from '../middleware/auth';
import * as tokenService from './tokenService';

const BCRYPT_ROUNDS = 12;

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

function generateAccessToken(user: User): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
  };

  return jwt.sign(payload, config.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: config.JWT_ACCESS_EXPIRY as jwt.SignOptions['expiresIn'],
  });
}

export async function register(
  email: string,
  password: string,
  name: string
): Promise<{ user: UserWithoutPassword; accessToken: string; rawRefreshToken: string }> {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ConflictError('User', 'email');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  const accessToken = generateAccessToken(user);
  const rawRefreshToken = await tokenService.createRefreshToken(user.id);

  return {
    user: excludePassword(user),
    accessToken,
    rawRefreshToken,
  };
}

export async function login(
  email: string,
  password: string
): Promise<{ user: UserWithoutPassword; accessToken: string; rawRefreshToken: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AuthInvalidCredentialsError();
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw new AuthInvalidCredentialsError();
  }

  const accessToken = generateAccessToken(user);
  const rawRefreshToken = await tokenService.createRefreshToken(user.id);

  return {
    user: excludePassword(user),
    accessToken,
    rawRefreshToken,
  };
}

export async function refreshAccessToken(
  rawRefreshToken: string
): Promise<{ accessToken: string; newRawRefreshToken: string }> {
  const { newRawToken, userId } = await tokenService.rotateRefreshToken(rawRefreshToken);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User', userId);
  }

  const accessToken = generateAccessToken(user);

  return { accessToken, newRawRefreshToken: newRawToken };
}

export async function logout(rawRefreshToken: string): Promise<void> {
  await tokenService.revokeToken(rawRefreshToken);
}

export async function logoutAll(userId: string): Promise<void> {
  await tokenService.revokeAllUserTokens(userId);
}

export async function getCurrentUser(userId: string): Promise<UserWithoutPassword> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User', userId);
  }

  return excludePassword(user);
}
