import { z } from "zod";

export const ratingSchema = z.object({
  rating: z.number(),
  char_short: z.string(),
  character: z.string(),
});
export const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  ratings: z.array(ratingSchema),
});
