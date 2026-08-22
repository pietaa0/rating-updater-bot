import { and, eq } from "drizzle-orm";
import { db } from "./index.js";
import { leaderboards } from "./schema.js";

export async function createLeaderboard(guildId: string, name: string) {
  await db.insert(leaderboards).values({ guildId, name });
}
export async function deleteLeaderboard(guildId: string, name: string) {
  await db
    .delete(leaderboards)
    .where(and(eq(leaderboards.guildId, guildId), eq(leaderboards.name, name)));
  // everything else will cascade-delete cleanly
}
export async function leaderboardExists(guildId: string, name: string) {
  const rows = await db
    .select()
    .from(leaderboards)
    .where(and(eq(leaderboards.guildId, guildId), eq(leaderboards.name, name)));
  return rows.length > 0;
}
export async function getAllLeaderboards(guildId: string) {
  const rows = await db.select().from(leaderboards).where(eq(leaderboards.guildId, guildId));
  return rows;
}
