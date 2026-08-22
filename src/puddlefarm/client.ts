import { playerSchema } from "./schema.js";

const baseUrl = "https://puddle.farm/api";
export async function getPlayerById(id: string) {
  const res = await fetch(`${baseUrl}/player/${id}`);

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`puddle.farm returned ${res.status} for player ${id}`);

  const data = playerSchema.parse(await res.json());
  return data;
}
