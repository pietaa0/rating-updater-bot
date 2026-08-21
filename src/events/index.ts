import { readdir } from "node:fs/promises";
import type { BotClient } from "../client.js";

export async function loadEvents(client: BotClient) {
  const eventsDir = import.meta.dirname;
  const files = (await readdir(eventsDir)).filter((f) => f.endsWith(".js") && f !== "index.js");

  for (const file of files) {
    const event = await import(`./${file}`);
    if (event.once) {
      client.once(event.name, (...args: unknown[]) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args: unknown[]) => event.execute(...args, client));
    }
  }
}
