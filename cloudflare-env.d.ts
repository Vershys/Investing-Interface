declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    FINNHUB_API_KEY?: string;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    AI_DAILY_TOKEN_LIMIT?: string;
    MONITOR_JOB_TOKEN?: string;
    BUCKET?: R2Bucket;
  }
}
