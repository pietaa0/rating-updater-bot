import path from "node:path";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { setTestDb } from "../db/index.js";
import { characters } from "../db/schema.js";
import { striveCharacters } from "../game-data/characters.js";

export async function createInMemoryDb() {
  const testDb = drizzle(":memory:");

  await migrate(testDb, {
    migrationsFolder: path.join(import.meta.dirname, "../../drizzle"),
  });
  await testDb.insert(characters).values(striveCharacters);
  setTestDb(testDb);
  return testDb;
}
