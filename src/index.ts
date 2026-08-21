import "dotenv/config";
import { client } from "./client.js";
import { loadCommands } from "./commands/index.js";
import { loadEvents } from "./events/index.js";

await loadCommands(client);
await loadEvents(client);

client.login(process.env.DISCORD_TOKEN);
