import { foreignKey, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());

export const leaderboards = sqliteTable(
  "leaderboards",
  {
    guildId: text("guild_id").notNull(),
    name: text("name").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.guildId, t.name] })],
);
export const strivePlayers = sqliteTable("strive_players", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const ratings = sqliteTable(
  "ratings",
  {
    guildId: text("guild_id").notNull(),
    leaderboardName: text("leaderboard_name").notNull(),
    playerId: text("player_id")
      .notNull()
      .references(() => strivePlayers.id, { onDelete: "cascade" }),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({
      columns: [t.guildId, t.leaderboardName, t.playerId, t.characterId],
    }),
    foreignKey({
      columns: [t.guildId, t.leaderboardName],
      foreignColumns: [leaderboards.guildId, leaderboards.name],
    }).onDelete("cascade"),
  ],
);
