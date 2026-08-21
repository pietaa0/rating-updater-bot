import { db } from "./index.js";
import { characters } from "./schema.js";
import { CHARACTER_SEED } from "./seed-data/characters.js";

await db.insert(characters).values(CHARACTER_SEED).onConflictDoNothing();

console.log(`Seeded ${CHARACTER_SEED.length} characters`);
