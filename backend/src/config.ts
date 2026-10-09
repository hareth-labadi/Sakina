/**
 * All settings come from environment variables, checked once at startup.
 * A missing or malformed value stops the process with a clear message instead of failing later.
 * Never log the parsed config: it holds the database password and the encryption key.
 */
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  /** The site's public origin. Used in emailed links and to reject cross-site requests. */
  PUBLIC_WEB_URL: z.url({ protocol: /^https?$/ }).transform((u) => new URL(u).origin),
  /** 32 random bytes, base64. Encrypts recovery emails. Generate: openssl rand -base64 32 */
  DATA_ENCRYPTION_KEY: z
    .string()
    .refine((k) => Buffer.from(k, 'base64').length === 32, 'must be 32 bytes, base64 (openssl rand -base64 32)'),
  /** smtp://user:pass@host:port. Empty: emails are not sent (development prints the link instead). */
  SMTP_URL: z.url({ protocol: /^smtps?$/ }).optional().or(z.literal('').transform(() => undefined)),
  MAIL_FROM: z.string().default('Sakina <no-reply@sakina.invalid>')
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return parseEnv(schema, env);
}

/** For one-off tools (migrations, staff CLI) that need the database and nothing else. */
export function loadDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return parseEnv(schema.pick({ DATABASE_URL: true }), env).DATABASE_URL;
}

function parseEnv<T extends z.ZodType>(s: T, env: NodeJS.ProcessEnv): z.infer<T> {
  const parsed = s.safeParse(env);
  if (!parsed.success) {
    // Names only, never values: a bad DATABASE_URL still contains the password.
    const problems = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment:\n${problems}`);
  }
  return parsed.data;
}
