import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const dbName = process.env.DB_FILE_NAME;
if (!dbName) {
  throw new Error("No DB_FILE_NAME found in .env");
}

export default defineConfig({
  out: "./drizzle",
  schema: "src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: { url: dbName },
});
