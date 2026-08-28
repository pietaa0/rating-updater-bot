import "dotenv/config";
import { client } from "./client.js";
import { loadCommands } from "./commands/index.js";
import { loadEvents } from "./events/index.js";

await loadCommands(client);
await loadEvents(client);

await client.login(process.env.DISCORD_TOKEN);

process.on("SIGTERM", async () => await client.destroy());
process.on("SIGINT", async () => await client.destroy());
