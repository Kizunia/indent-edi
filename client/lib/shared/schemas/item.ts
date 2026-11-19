import { z } from "zod";
import { emptyToUndefined } from "./common";

// Item picker (DEC-025, DEC-027): at most 20 results, so no paging parameters.
// `field` limits the match to the Item Name or the Item Code input; without it
// both are searched.
export const ITEM_SEARCH_FIELDS = ["name", "code"] as const;
export type ItemSearchField = (typeof ITEM_SEARCH_FIELDS)[number];

export const itemSearchQuerySchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(100, "Search is too long.").default("")),
  field: z.preprocess(emptyToUndefined, z.enum(ITEM_SEARCH_FIELDS, { error: "Search field is not valid." }).optional()),
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
