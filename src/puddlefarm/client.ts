import { playerSchema, searchSchema } from "./schema.js";

export const SLEEP_JITTER = 0.3;
export const MAX_RETRIES = 3;
export const BASE_SLEEP_MS = 500;
export const TIMEOUT_MS = 10_000;

function sleepWithJitter(baseMs: number, attempt: number) {
  const delay = baseMs * 2 ** attempt;
  const jitter = Math.random() * delay * SLEEP_JITTER;
  return new Promise((resolve) => setTimeout(resolve, delay + jitter));
}

async function fetchWithRetry(url: string, attempt = 0) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

    if (res.status >= 500 && attempt < MAX_RETRIES) {
      await sleepWithJitter(BASE_SLEEP_MS, attempt);
      return fetchWithRetry(url, attempt + 1);
    }
    return res;
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      await sleepWithJitter(BASE_SLEEP_MS, attempt);
      return fetchWithRetry(url, attempt + 1);
    }
    throw err;
  }
}

const baseUrl = "https://puddle.farm/api";
export async function getPlayerById(id: string) {
  const res = await fetchWithRetry(`${baseUrl}/player/${id}`);

  // 404: no player found with that id
  // 400: id couldn't be parsed as a valid player id (64 bit int) - not a real error
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`puddle.farm returned ${res.status} for player ${id}`);

  const data = playerSchema.parse(await res.json());
  return data;
}

export async function getPlayerByName(name: string) {
  const encodedName = encodeURIComponent(name);
  const res = await fetchWithRetry(`${baseUrl}/player/search?search_string=${encodedName}`);

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`puddle.farm returned ${res.status} for player ${name}`);

  const data = searchSchema.parse(await res.json()).results;
  if (data.length === 0) {
    return null;
  }

  return data;
}

export type puddleSearchResult = NonNullable<Awaited<ReturnType<typeof getPlayerByName>>>;
