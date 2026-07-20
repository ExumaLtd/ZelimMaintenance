// lib/env.ts
// Fail fast on missing required environment variables.
//
// Each module asserts only the variables it actually needs, at module load, so
// a misconfigured deployment fails immediately and loudly instead of surfacing
// later as a confusing runtime error during a technician's first action.
//
// Error messages name the missing variable but never print its value.

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        'Set it in .env.local for local development, or in the Vercel project ' +
        'settings for deployed environments.'
    );
  }
  return value;
}
