import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  // Two independent secrets so a leaked access key can never mint refresh keys.
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),

  // Comma-separated list; only used when the client hits this API cross-origin
  // (local dev without the Next.js rewrite proxy).
  CLIENT_ORIGIN: z.string().default('http://localhost:3000'),
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),

  ADMIN_NAME: z.string().default('Admin'),
  ADMIN_EMAIL: z.string().default('admin@doctortracker.dev'),
  // The default exists so `npm run seed` works on a fresh clone. It is refused in
  // production below, because the seed writes this password straight into the only
  // admin account.
  ADMIN_PASSWORD: z.string().default('Admin@1234'),
  SEED_PATIENTS: z.coerce.number().int().min(1).max(20000).default(600),
  // Must equal the connected database name before `seed.ts` will drop anything in
  // production. Deliberately not defaulted: an empty string never matches.
  SEED_CONFIRM_DB: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  // Never fall through with a half-populated config: an undefined secret would
  // silently sign unverifiable tokens in production.
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

const raw = parsed.data;
const isProduction = raw.NODE_ENV === 'production';

// A deployed API that still accepts the shipped seed password is a public admin
// login waiting to be guessed, so this is a hard failure rather than a warning.
if (isProduction && raw.ADMIN_PASSWORD === 'Admin@1234') {
  console.error('Refusing to start in production with the default ADMIN_PASSWORD.');
  process.exit(1);
}

export const env = {
  ...raw,
  isProduction,
  isDev: raw.NODE_ENV === 'development',
  // Proxied through the frontend origin in production, so cookies stay first-party.
  cookieSecure: raw.COOKIE_SECURE ? raw.COOKIE_SECURE === 'true' : isProduction,
  clientOrigins: raw.CLIENT_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;
