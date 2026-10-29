# Validation rules

Defined once as Zod schemas in `client/lib/shared/schemas/` ([DEC-014](../decisions/DEC-014-validation.md)) and used by forms and by route handlers. The server is authoritative. **No limits are invented** beyond those below (SRS 12.1, D-07). Message text lives in the `messages` module.

## Indent (create)

| Field | Rule | Column |
|---|---|---|
| `indentTypeId` | required integer; must exist and be active | `indent_type_id` |
| `departmentId` | required integer (app form requirement, DEC-022); must exist and be active | `department_id` |
| `remark` | optional string, trimmed, max 65 535 chars (TEXT) | `remark` |
| `items` | array, length >= 1 (FR-08) | |
| `submit` | optional boolean | |

Server-assigned (rejected if sent): `indentNumber`, `indentDate`, `indentTime`, `createdBy*`, `status`, `version`.

## Line

| Field | Rule | Column |
|---|---|---|
| `itemId` xor `newItem` | exactly one | |
| `itemId` | existing and active item | `item_id` |
| `newItem.itemName` | required, trimmed, 1-255 chars | `item_name` |
| `newItem.specification` | optional, TEXT | `specification` |
| `newItem.drawingNumber` | optional, trimmed, max 100 chars | `drawing_number` |
| `newItem.defaultUnitId` | required, existing and active unit | `default_unit_id` |
| `departmentId` | optional; default header department; must exist and be active | `department_id` |
| `purpose` | optional, TEXT | `purpose` |
| `requiredQuantity` | required decimal string `^\d+(\.\d{1,4})?$`, value **> 0** | `DECIMAL(18,4)`, CHECK `> 0` |
| `requiredUnitId` | required, existing and active unit | `required_unit_id` |
| `requiredDate` | required valid calendar date, **>= indent date** (the server's date today at creation) | `required_date` |
| duplicates | same `itemId` twice in one indent is rejected unless `ALLOW_DUPLICATE_ITEMS` (DEC-009) | |

Whitespace-only strings count as empty. Control characters are stripped. All text is stored as typed (no HTML escaping on write; escape on output, which React does by default).

## Edit

- `PATCH` indent: `{ version, remark }` only.
- `PATCH` line: any subset of `purpose`, `requiredQuantity`, `requiredDate`, `requiredUnitId`, `departmentId`, with the same rules as above. `requiredDate >= indentDate` is checked against the **indent's** date.
- Both require `version` (integer >= 1) and a Draft indent.

## Search and filters

| Param | Rule |
|---|---|
| `search` | trimmed, max 30 chars (`indent_number` is VARCHAR(30)); `%` and `_` treated literally |
| `indentTypeId`, `departmentId`, `statusId` | positive integers |
| `createdBy` | string, max 64 |
| `dateFrom`, `dateTo` | valid `YYYY-MM-DD`; `dateFrom <= dateTo` or `VALIDATION_FAILED` |
| `page` | integer >= 1; an out-of-range page returns an empty list with the totals |

## Column-safety bounds (not business limits)

These exist only so a value always fits its column; they are not invented business rules (SRS 12.1).

- TEXT fields (`remark`, `purpose`, `specification`): at most **16 383 characters** (a TEXT column holds 65 535 bytes and a utf8mb4 character takes up to 4).
- `requiredQuantity`: up to **14 integer digits and 4 decimals** (`DECIMAL(18,4)`).
- `GET /api/stock?itemIds=`: at most 200 ids per call (abuse guard).

Implemented in `client/lib/shared/schemas/` and covered by `client/tests/unit/shared/`.

## Client behaviour

- Show field errors next to the field, link with `aria-describedby`, and move focus to the first error.
- The client validates for speed; it never replaces server validation.
- The server returns `fieldErrors` keyed by path (`items.0.requiredQuantity`) so the form can map them.
