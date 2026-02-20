import { z } from "zod";

const envSchema = z.object({
  UPSTASH_URL: z.string().url().optional(),
  UPSTASH_TOKEN: z.string().min(1).optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  CRUST_ACCESS_TOKEN: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_VERSION: z.string().optional(),
  NEXT_PUBLIC_BUILD_TIME: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const isServer = typeof window === "undefined";
  const isBuildTime = process.env.NODE_ENV === "production" && !process.env.UPSTASH_URL;
  
  if (isBuildTime) {
    return {
      UPSTASH_URL: undefined,
      UPSTASH_TOKEN: undefined,
      ADMIN_PASSWORD: undefined,
      CRUST_ACCESS_TOKEN: undefined,
      NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
      NEXT_PUBLIC_BUILD_TIME: process.env.NEXT_PUBLIC_BUILD_TIME,
    };
  }

  const result = envSchema.safeParse({
    UPSTASH_URL: isServer ? process.env.UPSTASH_URL : undefined,
    UPSTASH_TOKEN: isServer ? process.env.UPSTASH_TOKEN : undefined,
    ADMIN_PASSWORD: isServer ? process.env.ADMIN_PASSWORD : undefined,
    CRUST_ACCESS_TOKEN: isServer ? process.env.CRUST_ACCESS_TOKEN : undefined,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_BUILD_TIME: process.env.NEXT_PUBLIC_BUILD_TIME,
  });

  if (!result.success) {
    if (isServer && process.env.NODE_ENV === "production") {
      console.error("Environment validation failed:", result.error.flatten());
    }
    return {
      UPSTASH_URL: undefined,
      UPSTASH_TOKEN: undefined,
      ADMIN_PASSWORD: undefined,
      CRUST_ACCESS_TOKEN: undefined,
      NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
      NEXT_PUBLIC_BUILD_TIME: process.env.NEXT_PUBLIC_BUILD_TIME,
    };
  }

  return result.data;
}

export const env = validateEnv();

export function getRequiredEnv(key: keyof Env): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function isEnvConfigured(): boolean {
  return !!(env.UPSTASH_URL && env.UPSTASH_TOKEN && env.ADMIN_PASSWORD);
}
