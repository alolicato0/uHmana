import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  port: parseInt(process.env.PORT ?? '8787', 10),
  corsOrigins: (process.env.CORS_ORIGINS ?? '*')
    .split(',')
    .map((s) => s.trim()),

  mongoUri: required('MONGODB_URI'),

  clerk: {
    secretKey: required('CLERK_SECRET_KEY'),
    publishableKey: required('CLERK_PUBLISHABLE_KEY'),
  },

  openrouter: {
    apiKey: required('OPENROUTER_API_KEY'),
    baseUrl: 'https://openrouter.ai/api/v1',
    modelPrimary: optional(
      'OPENROUTER_MODEL_PRIMARY',
      'meta-llama/llama-3.3-70b-instruct:free',
    ),
    modelFallback: optional(
      'OPENROUTER_MODEL_FALLBACK',
      'deepseek/deepseek-r1:free',
    ),
    modelVision: optional(
      'OPENROUTER_MODEL_VISION',
      'mistralai/mistral-small-3.1-24b-instruct:free',
    ),
    referer: optional('APP_REFERER', 'https://uhmana.app'),
    title: optional('APP_TITLE', 'uHmana'),
  },
};
