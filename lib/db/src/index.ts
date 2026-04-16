import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || process.env.SHARED_DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isNeonUrl = dbUrl.includes("neon.tech");
export const pool = new Pool({ connectionString: dbUrl, ssl: isNeonUrl ? { rejectUnauthorized: false } : undefined });
export const db = drizzle(pool, { schema });

export * from "./schema";
