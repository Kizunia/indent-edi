import { z } from "zod";
import { emptyToUndefined } from "./common";

// Item picker (DEC-025): at most 20 results, so no paging parameters.
export const itemSearchQuerySchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(100, "Search is too long.").default("")),
});

// Stock lookup: ?itemIds=1,2,3 (docs/spec/api.md).
export const stockQuerySchema = z.object({
  itemIds: z
    .string({ error: "Item ids are required." })
    // Number("") and Number("x") are 0 / NaN, which the id check below rejects.
    .transform((s) => s.split(",").map((p) => p.trim()).filter(Boolean).map(Number))
    .pipe(
      z
        .array(z.number({ error: "Item id is not valid." }).int("Item id is not valid.").positive("Item id is not valid."))
        .min(1, "Item ids are required.")
        .max(200, "Too many items requested.")
    ),
});

export type ItemSearchQuery = z.infer<typeof itemSearchQuerySchema>;
export type StockQuery = z.infer<typeof stockQuerySchema>;
