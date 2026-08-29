import { getTrackedCharacters, updatePlayerRating, upsertPlayer } from "../db/queries.js";
import { getPlayerById } from "../puddlefarm/client.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function syncPlayerRatings(
  guildId: string,
  leaderboardName: string,
  playerId: string,
) {
  const trackedCharacters = await getTrackedCharacters(guildId, leaderboardName, playerId);
  if (trackedCharacters.length === 0) return;

  const player = await getPlayerById(playerId);
  if (!player) {
    throw new Error(`player ${playerId} not found during sync`);
  }

  await upsertPlayer(player.id, player.name);

  const updates = [];

  for (const rating of player.ratings) {
    if (!trackedCharacters.includes(rating.char_short)) continue;
    updates.push(
      updatePlayerRating(guildId, leaderboardName, player.id, rating.char_short, rating.rating),
    );
  }
  await Promise.all(updates);
}

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 1000;
export const SYNC_STALENESS_MS = 20 * 60 * 1000;

export interface SyncResult {
  playerId: string;
  success: boolean;
  error?: unknown;
}

export async function syncLeaderboardRatings(
  guildId: string,
  leaderboardName: string,
  playerIds: string[],
) {
  const results: SyncResult[] = [];

  for (let i = 0; i < playerIds.length; i += BATCH_SIZE) {
    const batch = playerIds.slice(i, i + BATCH_SIZE);

    const outcomes = await Promise.allSettled(
      batch.map((id) => syncPlayerRatings(guildId, leaderboardName, id)),
    );

    for (const [j, outcome] of outcomes.entries()) {
      const playerId = batch[j];
      if (!playerId) continue;

      if (outcome.status === "rejected") {
        console.error(`failed to sync ${playerId}:`, outcome.reason);
      }

      results.push({
        playerId,
        success: outcome.status === "fulfilled",
        error: outcome.status === "rejected" ? outcome.reason : undefined,
      });
    }
    const moreBatches = i + BATCH_SIZE < playerIds.length;
    if (moreBatches) await sleep(BATCH_DELAY_MS);
  }

  return results;
}
