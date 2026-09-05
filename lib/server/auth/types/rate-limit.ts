export type AuthRateLimitPolicy = {
  bucket: string;
  maxAttempts: number;
  windowSeconds: number;
};

export type AuthRateLimitRule = AuthRateLimitPolicy & {
  identifier: string;
};

export type AuthRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export type RateLimitRpcRow = {
  allowed?: boolean;
  remaining?: number;
  retry_after_seconds?: number;
};
