// Response shapes of the API (docs/spec/api.md). Pure types: safe to import
// from client components. Decimals are strings, dates are YYYY-MM-DD, times are
// HH:mm:ss, instants are ISO-8601 UTC.

export interface Ref {
  id: number;
  code: string;
  name: string;
}

export interface UnitRef extends Ref {
  symbol: string | null;
}

export interface StatusRef extends Ref {
  isEditable: boolean;
}

export interface Line {
  id: number;
  lineNumber: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  specification: string | null;
  drawingNumber: string | null;
  department: Ref;
  purpose: string | null;
  /** null = "Not available" (DEC-013); never 0. */
  currentStock: string | null;
  stockCheckedAt: string | null;
  requiredQuantity: string;
  unit: UnitRef;
  requiredDate: string;
}

export interface IndentPermissions {
  canEdit: boolean;
  canSubmit: boolean;
  canDelete: boolean;
  canPrint: boolean;
}

export interface IndentSummary {
  indentNumber: string;
  version: number;
  indentType: Ref;
  department: Ref | null;
  status: StatusRef;
  indentDate: string;
  indentTime: string;
  createdBy: { id: string; name: string };
  remark: string | null;
  itemCount: number;
  createdAt: string;
  submittedAt: string | null;
  permissions: IndentPermissions;
}

export interface IndentDetail extends IndentSummary {
  items: Line[];
}

export interface IndentPage {
  items: IndentSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ItemOption {
  id: number;
  itemCode: string;
  itemName: string;
  specification: string | null;
  drawingNumber: string | null;
  defaultUnit: UnitRef | null;
}

export interface StockEntry {
  itemId: number;
  /** null = "Not available". */
  quantity: string | null;
  updatedAt: string | null;
}

export interface Meta {
  departments: Ref[];
  indentTypes: Ref[];
  units: UnitRef[];
  statuses: StatusRef[];
}
