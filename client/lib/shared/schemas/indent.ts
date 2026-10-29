import { z } from "zod";
import {
  TEXT_MAX,
  editableText,
  emptyToUndefined,
  id,
  isoDate,
  optionalText,
  quantity,
  requiredText,
  version,
} from "./common";

// Request schemas for the indent endpoints (docs/spec/api.md, validation.md).
// All object schemas are strict: unknown fields (status, createdBy, stock,
// indentNumber, ...) are rejected instead of ignored (DEC-014, BR-06).

export const EMPTY_INDENT_MESSAGE = "An Indent cannot be saved without at least one Item.";

// --- New item entered on the form (created inside the save transaction, DEC-025)
export const newItemSchema = z.strictObject({
  itemName: requiredText("Item name", 255),
  specification: optionalText("Specification", TEXT_MAX),
  drawingNumber: optionalText("Drawing number", 100),
  defaultUnitId: id("Unit"),
});

// --- Line (create / add)
const lineFields = {
  departmentId: id("Department").optional(),
  purpose: optionalText("Purpose", TEXT_MAX),
  requiredQuantity: quantity,
  requiredUnitId: id("Unit"),
  requiredDate: isoDate("Required date"),
};

export const createLineSchema = z
  .strictObject({
    itemId: id("Item").optional(),
    newItem: newItemSchema.optional(),
    ...lineFields,
  })
  .superRefine((line, ctx) => {
    if ((line.itemId === undefined) === (line.newItem === undefined)) {
      ctx.addIssue({
        code: "custom",
        path: ["itemId"],
        message: "Select an existing item or enter a new item.",
      });
    }
  });

// --- Create indent (FR-01, FR-08, FR-09, FR-10)
export const createIndentSchema = z.strictObject({
  indentTypeId: id("Indent type"),
  departmentId: id("Department"),
  remark: optionalText("Remark", TEXT_MAX),
  submit: z.boolean().optional(),
  items: z.array(createLineSchema).min(1, EMPTY_INDENT_MESSAGE),
});

// --- Edit (Draft only; DEC-007)
export const updateIndentSchema = z.strictObject({
  version,
  remark: editableText("Remark", TEXT_MAX),
});

export const addLineSchema = z.strictObject({
  version,
  line: createLineSchema,
});

export const updateLineSchema = z
  .strictObject({
    version,
    purpose: editableText("Purpose", TEXT_MAX).optional(),
    requiredQuantity: quantity.optional(),
    requiredDate: isoDate("Required date").optional(),
    requiredUnitId: id("Unit").optional(),
    departmentId: id("Department").optional(),
  })
  .refine(
    (v) =>
      v.purpose !== undefined ||
      v.requiredQuantity !== undefined ||
      v.requiredDate !== undefined ||
      v.requiredUnitId !== undefined ||
      v.departmentId !== undefined,
    { path: ["purpose"], message: "Provide at least one field to change." }
  );

export const submitSchema = z.strictObject({ version });

/** `?version=` on DELETE requests. */
export const versionQuerySchema = z.object({
  version: z.coerce.number({ error: "Version is required." }).int().min(1, "Version is not valid."),
});

// --- List / filters (FR-12, FR-13, FR-15)
export const PAGE_SIZE = 10; // FR-15, confirmed

const optionalId = (label: string) =>
  z.preprocess(emptyToUndefined, z.coerce.number({ error: `${label} is not valid.` }).int().positive().optional());

const optionalDate = (label: string) =>
  z.preprocess(emptyToUndefined, isoDate(label).optional());

export const indentFiltersSchema = z
  .object({
    search: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(30, "Search is too long.").optional()
    ),
    indentTypeId: optionalId("Indent type"),
    departmentId: optionalId("Department"),
    statusId: optionalId("Status"),
    createdBy: z.preprocess(emptyToUndefined, z.string().trim().max(64).optional()),
    dateFrom: optionalDate("From date"),
    dateTo: optionalDate("To date"),
  })
  .refine((v) => !v.dateFrom || !v.dateTo || v.dateFrom <= v.dateTo, {
    path: ["dateTo"],
    message: "The 'to' date must not be before the 'from' date.",
  });

export const listQuerySchema = indentFiltersSchema.and(
  z.object({
    page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
  })
);

// --- Export (FR-19)
export const exportSchema = z.union([
  z.strictObject({
    indentNumbers: z
      .array(z.string().trim().min(1).max(30))
      .min(1, "Select at least one indent to export."),
  }),
  z.strictObject({
    mode: z.literal("filtered"),
    filters: indentFiltersSchema,
  }),
]);

export type CreateIndentInput = z.infer<typeof createIndentSchema>;
export type CreateLineInput = z.infer<typeof createLineSchema>;
export type UpdateIndentInput = z.infer<typeof updateIndentSchema>;
export type AddLineInput = z.infer<typeof addLineSchema>;
export type UpdateLineInput = z.infer<typeof updateLineSchema>;
export type IndentFilters = z.infer<typeof indentFiltersSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
export type ExportInput = z.infer<typeof exportSchema>;

/**
 * Required Date must not be before the indent date (invariant 7). The indent
 * date is server-assigned, so the form passes the one it was given.
 * Returns field errors keyed by path, ready to merge into a validation error.
 */
export function requiredDateErrors(
  lines: ReadonlyArray<{ requiredDate: string }>,
  indentDate: string,
  basePath: string = "items"
): Record<string, string> {
  const errors: Record<string, string> = {};
  lines.forEach((line, i) => {
    if (line.requiredDate < indentDate) {
      errors[`${basePath}.${i}.requiredDate`] = "Required date cannot be before the indent date.";
    }
  });
  return errors;
}
