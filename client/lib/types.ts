// Core domain types for the Organize Indent System.
// Field lists follow the SRS. Where the SRS marks something TBD, a
// reasonable placeholder decision is made and called out in a comment
// so it is easy to find and swap once the company confirms it.

export type IndentStatus =
  | "Draft"
  | "Submitted"
  | "Pending Approval"
  | "Approved"
  | "Rejected"
  | "Cancelled";
// TBD (SRS §7.9): exact status list is not confirmed by the approval team.
// The values above are placeholders for demo purposes only.

export interface Department {
  id: string;
  name: string;
}

export interface IndentType {
  id: string;
  name: string;
}

export interface StockRecord {
  itemCode: string;
  currentQuantity: number;
  updatedAt: string;
}

export interface Item {
  id: string;
  itemCode: string; // auto-generated, read-only
  itemName: string;
  specification?: string;
  drawingNumber?: string;
  unit: string;
}

export interface IndentItem {
  indentItemId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  specification?: string;
  drawingNumber?: string;
  department: string;
  purpose?: string;
  currentStockAtEntry: number; // stock value shown to the user at the time the item was added
  requiredQuantity: number;
  requiredDate: string;
  unit: string;
}

export interface Indent {
  id: string;
  indentNumber: string; // auto-generated, unique, read-only
  indentType: string;
  indentDate: string;
  time: string;
  department: string;
  createdBy: string;
  remark?: string;
  status: IndentStatus;
  items: IndentItem[];
  createdAt: string;
  updatedAt: string;
}

export interface IndentFilters {
  search?: string;
  indentType?: string;
  department?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
  page?: number;
  pageSize?: number;
}
