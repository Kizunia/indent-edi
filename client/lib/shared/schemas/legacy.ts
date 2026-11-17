import { z } from "zod";
import {
  TEXT_MAX,
  editableText,
  emptyToUndefined,
  isoDate,
  optionalText,
  quantity,
  requiredText,
} from "./common";

// INTERIM (until WI-06): request schemas for the prototype API contract that the
// current routes, repositories and UI still use (names instead of ids, numbers
// instead of decimal strings, client-sent status/createdBy/date). They give the
// legacy routes and the forms real validation without changing the contract.
// The final contract lives in ./indent.ts and replaces these in WI-06; delete
// this file then.

const numericId = (label: string) =>
  z
    .string({ error: `${label} is required.` })
    .regex(/^\d+$/, `${label} is not valid.`);

const positiveNumber = (label: string) =>
  z
    .number({ error: `Enter a valid ${label}.` })
    .positive(`${label} must be greater than 0.`)
    .refine((n) => Math.abs(Math.round(n * 1e4) - n * 1e4) < 1e-6, `${label} can have at most 4 decimal places.`);

const timeOfDay = z
  .string({ error: "Time is required." })
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Enter a valid time.");

const legacyStatus = z.enum(["Draft", "Submitted"], { error: "Status is not valid." });

// Columns: created_by_name VARCHAR(150), item_name VARCHAR(255).
const NAME_MAX = 255;

export const legacyLineSchema = z.object({
  itemId: numericId("Item"),
  department: requiredText("Department", NAME_MAX),
  purpose: optionalText("Purpose", TEXT_MAX),
  currentStockAtEntry: z.number({ error: "Current stock is not valid." }).min(0, "Current stock is not valid."),
  requiredQuantity: positiveNumber("Required Quantity"),
  requiredDate: isoDate("Required Date"),
  unit: requiredText("Unit", NAME_MAX),
});

// Add Item form (client side): the raw text the user typed, before it is
// converted to the line shape above.
export const legacyItemEntrySchema = z.object({
  itemName: requiredText("Item Name", NAME_MAX),
  unit: requiredText("Unit", NAME_MAX),
  specification: optionalText("Specification", TEXT_MAX),
  drawingNumber: optionalText("Drawing Number", 100),
  department: requiredText("Department", NAME_MAX),
  purpose: optionalText("Purpose", TEXT_MAX),
  requiredQuantity: quantity,
  requiredDate: isoDate("Required Date"),
});

// Edit-mode row on the detail page (client side): raw text from the inputs.
export const legacyEditRowSchema = z.object({
  purpose: editableText("Purpose", TEXT_MAX),
  requiredQuantity: quantity,
  requiredDate: isoDate("Required Date"),
  unit: requiredText("Unit", NAME_MAX),
});

// New Indent header (client side).
export const legacyHeaderSchema = z.object({
  indentType: requiredText("Indent Type", NAME_MAX),
  indentDate: isoDate("Indent Date"),
  time: timeOfDay,
  department: requiredText("Department", NAME_MAX),
  createdBy: requiredText("Created By", 150),
  remark: optionalText("Remark", TEXT_MAX),
});

export const legacyCreateIndentSchema = z
  .object({
    indentType: requiredText("Indent Type", NAME_MAX),
    indentDate: isoDate("Indent Date"),
    time: timeOfDay,
    department: requiredText("Department", NAME_MAX),
    createdBy: requiredText("Created By", 150),
    remark: optionalText("Remark", TEXT_MAX),
    status: legacyStatus,
    items: z.array(legacyLineSchema).min(1, "An Indent cannot be saved without at least one Item."),
  })
  .superRefine((v, ctx) => {
    v.items.forEach((line, i) => {
      if (line.requiredDate < v.indentDate) {
        ctx.addIssue({
          code: "custom",
          path: ["items", i, "requiredDate"],
          message: "Required Date cannot be before the Indent Date.",
        });
      }
    });
  });

export const legacyUpdateIndentSchema = z
  .object({
    remark: editableText("Remark", TEXT_MAX).optional(),
    status: legacyStatus.optional(),
    version: z.number().int("Version is not valid.").min(1, "Version is not valid.").optional(),
    items: z
      .array(
        z.object({
          indentItemId: numericId("Item"),
          purpose: editableText("Purpose", TEXT_MAX).optional(),
          requiredQuantity: positiveNumber("Required Quantity").optional(),
          requiredDate: isoDate("Required Date").optional(),
          unit: requiredText("Unit", NAME_MAX).optional(),
        })
      )
      .optional(),
  })
  .refine((v) => v.remark !== undefined || v.status !== undefined || (v.items?.length ?? 0) > 0, {
    path: ["_"],
    message: "Provide at least one field to change.",
  });

export const legacyCreateItemSchema = z.object({
  itemName: requiredText("Item Name", NAME_MAX),
  unit: requiredText("Unit", NAME_MAX),
  specification: optionalText("Specification", TEXT_MAX),
  drawingNumber: optionalText("Drawing Number", 100),
});

const optionalName = (label: string, max = NAME_MAX) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max, `${label} is too long.`).optional());

const legacyOptionalDate = (label: string) => z.preprocess(emptyToUndefined, isoDate(label).optional());

const legacyFilterFields = {
  search: optionalName("Search", 30),
  indentType: optionalName("Indent Type"),
  department: optionalName("Department"),
  status: optionalName("Status"),
  createdBy: optionalName("Created By", 150),
  dateFrom: legacyOptionalDate("From date"),
  dateTo: legacyOptionalDate("To date"),
};

const dateRange = (v: { dateFrom?: string; dateTo?: string }) => !v.dateFrom || !v.dateTo || v.dateFrom <= v.dateTo;
const dateRangeIssue = { path: ["dateTo"], message: "The 'to' date must not be before the 'from' date." };

export const legacyFiltersSchema = z.object(legacyFilterFields).refine(dateRange, dateRangeIssue);

export const legacyListQuerySchema = z
  .object({
    ...legacyFilterFields,
    page: z.preprocess(emptyToUndefined, z.coerce.number({ error: "Page is not valid." }).int().min(1, "Page is not valid.").default(1)),
    pageSize: z.preprocess(
      emptyToUndefined,
      z.coerce.number({ error: "Page size is not valid." }).int().min(1, "Page size is not valid.").max(100, "Page size is not valid.").default(10)
    ),
  })
  .refine(dateRange, dateRangeIssue);

export const legacyExportSchema = z.union([
  z.object({
    mode: z.literal("all"),
    filters: legacyFiltersSchema.optional(),
  }),
  z.object({
    mode: z.literal("selected").optional(),
    ids: z.array(numericId("Indent")).min(1, "Select at least one indent to export."),
  }),
]);

export const legacyItemSearchSchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(100, "Search is too long.").default("")),
});

export const legacyIdParamSchema = z.object({ id: numericId("Indent") });
export const legacyLineParamsSchema = z.object({ id: numericId("Indent"), indentItemId: numericId("Item") });
export const legacyItemCodeSchema = z.object({
  itemCode: z.string().trim().min(1, "Item code is required.").max(64, "Item code is not valid."),
});

export type LegacyCreateIndentInput = z.infer<typeof legacyCreateIndentSchema>;
export type LegacyUpdateIndentInput = z.infer<typeof legacyUpdateIndentSchema>;
