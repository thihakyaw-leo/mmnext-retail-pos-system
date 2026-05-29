export interface Env {
  // Environment variables
  ENVIRONMENT: string;

  // D1 Database
  DB: D1Database;

  // KV Namespaces
  KV: KVNamespace;
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;
  SETTINGS: KVNamespace;

  // R2 Buckets
  R2: R2Bucket;

  // Durable Objects
  POS_DO: DurableObjectNamespace;

  // Queues
  EMAIL_QUEUE: Queue<any>;

  // Analytics Engine
  POS_EVENTS: AnalyticsEngineDataset;

  // AI & External APIs
  GEMINI_API_KEY: string;
}

// Variables passed through Hono context (c.get('key'))
export type Variables = {
  requestId: string;
  startTime: number;
  user?: any; // To be typed later when Auth is fully migrated
  orgId?: string;
};

// Hono bindings wrapper
export type Bindings = {
  Bindings: Env;
  Variables: Variables;
};
