import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  AWS_REGION: z.string().default('us-east-1'),
  S3_BUCKET_IMAGENES: z.string().default('semi1proyecto-g8-2s2026'),
  S3_PUBLIC_URL: z.string().url().default('https://semi1proyecto-g8-2s2026.s3.amazonaws.com'),
  COGNITO_USER_POOL_ID: z.string().default(''),
  COGNITO_CLIENT_ID: z.string().default(''),
  LEX_BOT_ID: z.string().default(''),
  LEX_BOT_ALIAS_ID: z.string().default(''),
  LEX_LOCALE_ID: z.string().default('es_US'),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default('root'),
  DB_NAME: z.string().default('semisocial'),
  CORS_ORIGINS: z.string().default(
    'http://proyecto-web-g8.s3-website-us-east-1.amazonaws.com,http://localhost:5173',
  ),
});

export function loadConfig(env = process.env) {
  const values = envSchema.parse(env);
  return {
    ...values,
    corsOrigins: values.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
  };
}
