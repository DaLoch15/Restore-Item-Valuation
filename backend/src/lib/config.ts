import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  REFRESH_TOKEN_EXPIRY_DAYS: z.string().transform(Number).default('7'),
  COOKIE_DOMAIN: z.string().optional(),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  PORT: z.string().transform(Number).default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Optional GCS config
  GCS_PROJECT_ID: z.string().default('restore-item-inventory'),
  GCS_BUCKET_NAME: z.string().default('restoration-app-photos'),
  GCS_KEY_FILE: z.string().optional(),

  // n8n config
  N8N_WEBHOOK_URL: z.string().url().optional(),
  N8N_WEBHOOK_API_KEY: z.string().min(1, 'N8N_WEBHOOK_API_KEY is required').optional(),
  N8N_CALLBACK_SECRET: z.string().min(16, 'N8N_CALLBACK_SECRET must be at least 16 characters'),
  N8N_CALLBACK_BASE_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
