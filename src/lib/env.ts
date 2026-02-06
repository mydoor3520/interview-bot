import { z } from 'zod';

const envSchema = z.object({
  // Required
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),

  // Required with defaults
  AI_PROXY_URL: z.string().min(1).default('http://localhost:3456'),
  AI_MODEL: z.string().default('claude-sonnet-4'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Optional
  APP_PASSWORD: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PRO_YEARLY: z.string().optional(),
  REDIS_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('InterviewBot <noreply@interviewbot.com>'),
  CRON_SECRET: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Interview Bot'),
  ADMIN_ALLOWED_IPS: z.string().optional(),
  TRUSTED_PROXY_IPS: z.string().optional(),
  DISABLE_TOKEN_LOGGING: z.string().optional(),
  INITIAL_USER_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ 환경 변수 검증 실패:');
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    throw new Error('환경 변수 설정이 올바르지 않습니다. 위의 오류를 확인해주세요.');
  }
  return result.data;
}

export const env = validateEnv();
