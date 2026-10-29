# 1. The problem and the solution

## What is an indent?

An **indent** is a request raised by a department to buy or obtain materials. Example: the maintenance department needs 40 bolts and 5 litres of oil, so it raises one indent with two items.

Before this system, requests like that depend on paper or scattered files. The Organize Indent System gives every request one controlled, searchable record.

## What the system does

| Capability | In one line | SRS |
|---|---|---|
| Create an indent | Pick the type and department, add one or more items | FR-01 to FR-05 |
| Automatic numbers | The indent number and any new item code are generated, never typed | FR-02, FR-06 |
| Live stock | Shows how much of an item is in stock while you request it | FR-07 |
| Save as Draft, then Submit | Work in progress is safe; submitting is a separate, confirmed step | FR-09, FR-10 |
| Find indents | Search by number; filter by type, department, date range, creator, status; 10 per page | FR-12 to FR-15 |
| Edit and delete | Only while the indent is still a Draft, and only if you are allowed | FR-16 to FR-18 |
| Export to Excel | One, several, or all matching indents, with every item | FR-19 |
| Print | Print the full indent page | FR-20 |
| Confirmations and clear errors | Asks before saving, submitting, updating or deleting; errors are explained in plain words | FR-21, FR-22 |

## What the system deliberately does not do

These belong to other teams or later phases (SRS section 3.2):

- **Approval** of indents (another team owns it; we only submit and show the status they send back).
- Purchase orders, goods receipt, supplier and payment handling.
- Managing stock (we only **read** it; creating an indent never reduces stock - BR-04).
- User management and login (provided by another module).

## Who uses it

The SRS names five possible roles: Department Employee, Department Head, Purchase Employee, Store Employee and Admin. The company has **not** confirmed the roles or what each may do, so the system is built so the permission table can be changed in one place. Our current table is a clearly labelled **provisional** default ([permissions](../spec/permissions.md)).

## The one-sentence pitch

> One reliable place to raise, track and export material requests, with rules enforced by the server so the data can be trusted, and built so the company can later connect its own ERP and login without a rewrite.

Next: [02 - How it works](02-how-it-works.md)
