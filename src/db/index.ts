import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";

const dbName = process.env.DB_FILE_NAME;
if (!dbName) {
  throw new Error("No DB_FILE_NAME found in .env");
}

export let db = drizzle(dbName);

export function setTestDb(testDb: typeof db) {
  db = testDb;
}
