import crypto from 'crypto';
import prisma from '../lib/prisma';
import { config } from '../lib/config';
import { AuthTokenInvalidError } from '../lib/errors';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRawToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

function getExpiresAt(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.REFRESH_TOKEN_EXPIRY_DAYS);
  return expiresAt;
}

export async function createRefreshToken(
  userId: string,
  familyId?: string
): Promise<string> {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const family = familyId || crypto.randomUUID();

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      familyId: family,
      expiresAt: getExpiresAt(),
    },
  });

  return rawToken;
}

export async function rotateRefreshToken(
  rawToken: string
): Promise<{ newRawToken: string; userId: string }> {
  const tokenHash = hashToken(rawToken);

  const existingToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!existingToken) {
    throw new AuthTokenInvalidError('Invalid refresh token');
  }

  // Reuse detection: if token was already revoked, invalidate entire family
  if (existingToken.revokedAt) {
    await revokeTokenFamily(existingToken.familyId);
    throw new AuthTokenInvalidError('Refresh token reuse detected');
  }

  // Check expiry
  if (existingToken.expiresAt < new Date()) {
    throw new AuthTokenInvalidError('Refresh token has expired');
  }

  // Create new token in the same family
  const newRawToken = generateRawToken();
  const newTokenHash = hashToken(newRawToken);

  // Revoke old token and create new one in a transaction
  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: {
        revokedAt: new Date(),
        replacedByHash: newTokenHash,
      },
    }),
    prisma.refreshToken.create({
      data: {
        tokenHash: newTokenHash,
        userId: existingToken.userId,
        familyId: existingToken.familyId,
        expiresAt: getExpiresAt(),
      },
    }),
  ]);

  return { newRawToken, userId: existingToken.userId };
}

export async function revokeToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);

  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeTokenFamily(familyId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
