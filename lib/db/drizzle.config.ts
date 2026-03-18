import { defineConfig } from "drizzle-kit";
import path from "path";

const dbUrl = process.env.SHARED_DATABASE_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL must be set. Ensure the database is provisioned.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
    ssl: process.env.SHARED_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  },
});
