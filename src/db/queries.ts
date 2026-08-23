import { and, eq } from "drizzle-orm";
import { db } from "./index.js";
import { leaderboards, ratings, strivePlayers } from "./schema.js";

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
export async function upsertPlayer(id: string, name: string) {
  await db
    .insert(strivePlayers)
    .values({ id, name })
    .onConflictDoUpdate({ target: [strivePlayers.id], set: { name } });
}

export async function addPlayerRating(
  guildId: string,
  leaderboardName: string,
  playerId: string,
  characterId: string,
  rating: number,
) {
  await db
    .insert(ratings)
    .values({ guildId, leaderboardName, playerId, characterId, rating })
    .onConflictDoUpdate({
      target: [ratings.guildId, ratings.leaderboardName, ratings.playerId, ratings.characterId],
      set: { rating },
    });
}

export async function getRating(
  guildId: string,
  leaderboardName: string,
  playerId: string,
  characterId: string,
) {
  const player = await db
    .select()
    .from(ratings)
    .where(
      and(
        eq(ratings.guildId, guildId),
        eq(ratings.leaderboardName, leaderboardName),
        eq(ratings.playerId, playerId),
        eq(ratings.characterId, characterId),
      ),
    );
  return player;
}

export async function getLeaderboardData(guildId: string, leaderboardName: string) {
  return await db
    .select({
      playerId: ratings.playerId,
      playerName: strivePlayers.name,
      characterId: ratings.characterId,
      rating: ratings.rating,
      updatedAt: ratings.updatedAt,
      leaderboardName: ratings.leaderboardName,
    })
    .from(ratings)
    .innerJoin(strivePlayers, eq(ratings.playerId, strivePlayers.id))
    .where(and(eq(ratings.guildId, guildId), eq(ratings.leaderboardName, leaderboardName)));
}

export async function removeLeaderboardEntry(
  guildId: string,
  leaderboardName: string,
  playerId: string,
  characterId: string,
) {
  if (!guildId || !leaderboardName || !playerId || !characterId) {
    throw new Error("removeLeaderboardEntry called with missing args");
  }
  return await db
    .delete(ratings)
    .where(
      and(
        eq(ratings.guildId, guildId),
        eq(ratings.leaderboardName, leaderboardName),
        eq(ratings.playerId, playerId),
        eq(ratings.characterId, characterId),
      ),
    )
    .returning();
}

export type LeaderboardRow = Awaited<ReturnType<typeof getLeaderboardData>>[number];
