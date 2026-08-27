import { describe, expect, it } from "vitest";
import { striveCharacters } from "../game-data/characters.js";
import { getFuzzyAutocomplete } from "./shared.logic.js";

describe("getFuzzyAutocomplete", () => {
  it("returns choices unaltered when query is an empty string", () => {
    const results = getFuzzyAutocomplete("", striveCharacters);

    expect(results.slice(0, 3)).toEqual([
      { name: "Sol", value: "Sol" },
      { name: "Ky", value: "Ky" },
      { name: "May", value: "May" },
    ]);
  });

  it("ranks exact and fuzzy matches to the top of the array", () => {
    const results = getFuzzyAutocomplete("aba", striveCharacters);

    expect(results[0]).toEqual({ name: "A.B.A.", value: "A.B.A." });
  });

  it("limits choices to 25 when choices exceed 25", () => {
    const largeList = Array.from({ length: 40 }, (_, i) => ({ name: `item ${i + 1}` }));

    const emptyQuery = getFuzzyAutocomplete("", largeList);
    const fuzzyQuery = getFuzzyAutocomplete("item", largeList);

    expect(emptyQuery).toHaveLength(25);
    expect(fuzzyQuery).toHaveLength(25);
  });

  it("returns an empty array when choices are empty", () => {
    const results = getFuzzyAutocomplete("sol", []);

    expect(results).toHaveLength(0);
  });
});
