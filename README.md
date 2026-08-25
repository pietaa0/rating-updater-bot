# rating-updater

A Discord bot (discord.js v14) that tracks Guilty Gear Strive player ratings and
displays per-server, per-character leaderboards. Ratings are pulled from the
[puddle.farm](https://puddle.farm) API.

[Get the bot here!](https://discord.com/oauth2/authorize?client_id=1521605708028575861) _(requires basic slash command and message permissions)_

## Features

- Track up to 10 distinct leaderboards per server.
- Add players by puddle.farm name or player id, with a specific character.
- Add/Remove players via an interactive menu.
- Fuzzy autocomplete for leaderboard and character names.
- Automatic rating syncing: when a player's rating is older than the staleness
  threshold, it is refreshed from puddle.farm the next time the leaderboard is shown.

| Command                                             | Description                                            |
| --------------------------------------------------- | ------------------------------------------------------ |
| `/ping`                                             | Health check; replies `pong`.                          |
| `/addleaderboard <name>`                            | Create a leaderboard (max 10 per guild).               |
| `/deleteleaderboard <name>`                         | Delete a leaderboard.                                  |
| `/showallleaderboards`                              | List all leaderboards in the current guild.            |
| `/leaderboard <name>`                               | Display a leaderboard; auto-syncs stale ratings first. |
| `/addplayer <name_or_id> <leaderboard> <character>` | Add a player's rating (by name or puddle.farm id).     |
| `/removeplayer <leaderboard>`                       | Remove a player via an interactive menu.               |

## Self-Hosting and Development

Follow these steps if you want to run or contribute to the project.

### Prerequisites

- A recent Node.js (tested on v24.19.0).
- A Discord application with a bot token.

### Setup

```sh
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable            | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `DISCORD_TOKEN`     | Your Discord bot token.                                |
| `DISCORD_CLIENT_ID` | The application / client id used to register commands. |
| `DISCORD_GUILD_ID`  | The guild id commands are registered to.               |
| `DB_FILE_NAME`      | libSQL database url, e.g. `file:data/bot.db`.          |
| `COMMAND_SCOPE`     | Where to register commands, either `guild` or `global` |

Then run the one-time setup steps:

```sh
npm run db:migrate    # create tables
npm run db:seed       # populate the characters table
npm run register      # register slash commands
npm run upload-emoji  # optional: upload character emoji to your application, see below
```

### Emoji

`npm run upload-emoji` depends on character images not included in this repo (see [Attribution](#attribution)). Source your own from the [Fan Kit](https://www.guiltygear.com/ggst/en/fankit/), and save them as `assets/emoji/<character-id>.png` before running it.

### Running

```sh
npm run dev     # run with tsx watch (reloads on change)
npm run build   # compile TypeScript to dist/
npm run start   # run the compiled bot from dist/index.js
```

### Architecture

```
src/
  client.ts            BotClient subclass holding the command Collection.
  index.ts             Entry point: loads commands/events and logs in.
  types.ts             Command interface (data, execute, optional autocomplete).
  commands/            Slash command implementations (leaderboard/, player/).
  events/              Event handlers (ready, interactionCreate).
  db/                  drizzle schema, queries, and libSQL client.
  discord/             Discord component builders and emoji helpers.
  puddlefarm/          puddle.farm API client and response schemas.
  game-data/           Strive character list and generated emoji map.
  lib/                 Scripts and helpers (register, seed, sync, upload-emoji).
```

### Data source

Player ratings are fetched from the puddle.farm API:

- `GET https://puddle.farm/api/player/{id}` — ratings for a known player id.
- `GET https://puddle.farm/api/player/search?search_string={name}` — search by name.

### Attribution

Character art (used for emoji) © ARC SYSTEM WORKS.

Lucy character content: this is unofficial fan content and is not endorsed by CD PROJEKT RED.
