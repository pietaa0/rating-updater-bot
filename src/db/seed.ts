import { striveCharacters } from "../game-data/characters.js";
import { db } from "./index.js";
import { characters } from "./schema.js";

await db.insert(characters).values(striveCharacters).onConflictDoNothing();

console.log(`Seeded ${striveCharacters.length} characters`);
