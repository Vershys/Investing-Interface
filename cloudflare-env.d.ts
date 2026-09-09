declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    FINNHUB_API_KEY?: string;
    BUCKET?: R2Bucket;
  }
}
