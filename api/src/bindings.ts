export interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

export type Bindings = {
  DB: D1Database
  RATE_LIMITER: RateLimit
}
