import { extract } from "fuzzball";

export function getFuzzyAutocomplete<T extends { name: string }>(query: string, choices: T[]) {
  if (choices.length === 0) {
    return [];
  }
  if (query === "") {
    return choices.slice(0, 25).map((c) => ({ name: c.name, value: c.name }));
  }
  const names = choices.map((n) => n.name);
  const fuzzed = extract(query, names)
    .sort((a, b) => b[1] - a[1])
    .map((n) => n[0]);
  // Discord limits choices to 25
  return fuzzed.slice(0, 25).map((n) => ({ name: n, value: n }));
}
