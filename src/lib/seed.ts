import { db } from "../db/index.js";
import { characters } from "../db/schema.js";
import { striveCharacters } from "../game-data/characters.js";

await db.insert(characters).values(striveCharacters).onConflictDoNothing();

console.log(`Seeded ${striveCharacters.length} characters`);
