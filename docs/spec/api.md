# API contract

All endpoints are Next.js route handlers under `client/app/api/`. JSON in, JSON out, UTF-8. Every handler follows: **authenticate -> validate (Zod) -> authorize -> service -> envelope** ([DEC-015](../decisions/DEC-015-error-handling.md)). An indent is addressed by `indentNumber` (D-01, D-11), not by the numeric id.

Conventions:
- Decimals (quantity, stock) are **strings** (`"12.5000"`); dates are `YYYY-MM-DD`; times `HH:mm:ss`; instants ISO-8601 UTC.
- Write requests carry the `version` the client last saw (DEC-016).
- Request bodies are strict: unknown fields are rejected (`VALIDATION_FAILED`).
- Ids in bodies are integers. The client never sends `status`, `createdBy`, `indentNumber`, `indentDate`, `indentTime`, stock values, or item snapshots.

## Error envelope

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Please correct the highlighted fields.",
             "fieldErrors": { "items.0.requiredQuantity": "Quantity must be greater than 0." },
             "requestId": "b3f1..." } }
```

| Code | HTTP | When |
|---|---|---|
| `UNAUTHENTICATED` | 401 | no current user |
| `FORBIDDEN` | 403 | `can()` false |
| `NOT_FOUND` | 404 | missing, deleted, or out of the user's view scope |
| `VALIDATION_FAILED` | 400 | schema/master/date/quantity errors |
| `INDENT_EMPTY` | 400 | no lines on save, or deleting the last line |
| `DUPLICATE_ITEM` | 409 | item already on the indent (DEC-009) |
| `NOT_EDITABLE` | 409 | status does not allow the change |
| `VERSION_CONFLICT` | 409 | stale `version` |
| `STOCK_UNAVAILABLE` | 502 | stock provider failed |
| `EXPORT_FAILED` | 500 | export failed |
| `INTERNAL` | 500 | anything else; generic message + requestId |

## Shared shapes

```ts
type Ref = { id: number; code: string; name: string };
type Line = {
  id: number; lineNumber: number; itemId: number;
  itemCode: string; itemName: string; specification: string | null; drawingNumber: string | null;
  department: Ref; purpose: string | null;
  currentStock: string | null; stockCheckedAt: string | null;   // null = "Not available"
  requiredQuantity: string; unit: Ref & { symbol: string | null }; requiredDate: string;
};
type IndentSummary = {
  indentNumber: string; version: number;
  indentType: Ref; department: Ref | null; status: Ref & { isEditable: boolean };
  indentDate: string; indentTime: string; createdBy: { id: string; name: string };
  remark: string | null; itemCount: number; createdAt: string; submittedAt: string | null;
  permissions: { canEdit: boolean; canSubmit: boolean; canDelete: boolean; canPrint: boolean };
};
type IndentDetail = IndentSummary & { items: Line[] };
```

## Endpoints

### Session and metadata
| Method / path | Permission | Purpose |
|---|---|---|
| `GET /api/me` | any signed-in user | `{ user: {id,name,roles,departmentId}, actions: string[] }` |
| `POST /api/dev/session` | dev provider only (404 in production) | set the dev user/role cookie |
| `GET /api/meta` | `indent.view` | `{ departments, indentTypes, units, statuses }` (active masters; statuses all active) |

### Indents
| Method / path | Permission | Purpose |
|---|---|---|
| `GET /api/indents` | `indent.view` (scope filter) | list. Query: `search`, `indentTypeId`, `departmentId`, `statusId`, `createdBy` (user id), `dateFrom`, `dateTo`, `page` (1-based). Page size is fixed at **10** (FR-15). Returns `{ items: IndentSummary[], total, page, pageSize: 10 }`. Order `indent_date DESC, id DESC`; exact number match first on page 1 (DEC-011). `departmentId` matches header or any line (DEC-022) |
| `GET /api/indents/creators` | `indent.view` | distinct `{id,name}` of creators within the view scope, for the Created By filter |
| `GET /api/indents/next-number` | `indent.create` | `{ expectedNumber }` preview only (DEC-010) |
| `POST /api/indents` | `indent.create` (+ `indent.submit` if `submit`) | create. Body below. `201` returns `IndentDetail` and `numberDiffersFromPreview` |
| `GET /api/indents/{indentNumber}` | `indent.view` (scope) | `IndentDetail` |
| `PATCH /api/indents/{indentNumber}` | `indent.edit` | body `{ version, remark }` (Draft only) -> `IndentDetail` |
| `POST /api/indents/{indentNumber}/items` | `indent.edit` | add a line: `{ version, line }` -> `IndentDetail` |
| `PATCH /api/indents/{indentNumber}/items/{lineId}` | `indent.edit` | `{ version, purpose?, requiredQuantity?, requiredDate?, requiredUnitId?, departmentId? }` -> `IndentDetail` |
| `DELETE /api/indents/{indentNumber}/items/{lineId}?version=` | `indent.edit` | delete a line (not the last) -> `IndentDetail` |
| `POST /api/indents/{indentNumber}/submit` | `indent.submit` | `{ version }` -> `IndentDetail` |
| `DELETE /api/indents/{indentNumber}?version=` | `indent.delete` | soft delete (Draft only) -> `204` |

**Create body:**
```ts
{
  indentTypeId: number; departmentId: number; remark?: string; submit?: boolean;
  items: Array<{
    itemId?: number;                                   // existing item
    newItem?: { itemName: string; specification?: string; drawingNumber?: string; defaultUnitId: number };
    departmentId?: number;                             // defaults to the header department
    purpose?: string; requiredQuantity: string; requiredUnitId: number; requiredDate: string;
  }>;                                                  // exactly one of itemId / newItem per line; >= 1 line
}
```

### Items and stock
| Method / path | Permission | Purpose |
|---|---|---|
| `GET /api/items?q=` | `indent.create` or `indent.edit` | active items, max 20, `startsWith` before `contains`; returns `{ items: [{id,itemCode,itemName,specification,drawingNumber,defaultUnit}], hasMore }` |
| `GET /api/stock?itemIds=1,2,3` | `indent.create` or `indent.edit` | `{ stock: [{ itemId, quantity: string \| null, updatedAt: string \| null }] }`; `null` = "Not available"; provider failure -> `STOCK_UNAVAILABLE` |

### Export
| Method / path | Permission | Purpose |
|---|---|---|
| `POST /api/indents/export` | `indent.export` (scope) | body `{ indentNumbers: string[] }` or `{ mode: "filtered", filters: {...same as list...} }`; streams `.xlsx` ([export-print.md](export-print.md)) |

## Notes for implementers

- Check `permissions` flags from the server in the UI; never infer from status alone.
- Route files stay thin (about 30 lines). Business logic lives in services.
- Add an endpoint here before adding the route file.
