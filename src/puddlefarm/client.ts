import { playerSchema, searchSchema } from "./schema.js";

const baseUrl = "https://puddle.farm/api";
export async function getPlayerById(id: string) {
  const res = await fetch(`${baseUrl}/player/${id}`);

  // 404: no player found with that id
  // 400: id couldn't be parsed as a valid player id (64 bit int) - not a real error
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`puddle.farm returned ${res.status} for player ${id}`);

  const data = playerSchema.parse(await res.json());
  return data;
}

export async function getPlayerByName(name: string) {
  const res = await fetch(`${baseUrl}/player/search?search_string=${name}`);

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`puddle.farm returned ${res.status} for player ${name}`);

  const data = searchSchema.parse(await res.json()).results;
  if (data.length === 0) {
    return null;
  }
  return data;
}

export type puddleSearchResult = NonNullable<Awaited<ReturnType<typeof getPlayerByName>>>;
