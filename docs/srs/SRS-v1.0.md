# Software Requirements Specification: Organize Indent System

> **Source of truth.** Faithful Markdown conversion of `Organize_Indent_System_SRS.docx` (SRS v1.0, 8 Sep 2026). Wording is unedited; only the layout was converted. Do not change requirements here. Inconsistencies are tracked in [`srs-errata.md`](srs-errata.md), and company answers to TBD items go in [`../open-questions.md`](../open-questions.md) and the matching decision records. Red callouts in the original are shown as `> **TBD:**` blockquotes.

Document Version: 1.0 (Draft for Review)

Date: September 8, 2026

*Status: Contains Confirmed Requirements and Open (TBD) Items*

*This document distinguishes confirmed business requirements from items that remain to be determined (TBD). Callout boxes shaded in red indicate unresolved requirements requiring company confirmation before implementation.*

## Table of Contents
1. Introduction
2. Overall Description
3. System Scope
4. Business Process
5. Functional Requirements
6. User Roles and Permissions
7. Indent Management Requirements
8. Item Management Requirements
9. Current Stock Requirements
10. Search, Filter and List Requirements
11. Export and Print Requirements
12. Validation and Error Handling
13. Non-Functional Requirements
14. External Interfaces
15. Data Requirements
16. Use Cases
17. System Workflows
18. UML Modeling Requirements
19. Business Rules
20. Requirements Traceability Matrix
21. Assumptions
22. Dependencies
23. Constraints
24. Open Issues / TBD Requirements
25. Future Enhancements
26. Conclusion

## 1. Introduction

### 1.1 Purpose

The Organize Indent System is a system for managing Indents, where an Indent represents a request raised by a department for purchasing or obtaining required materials or items. This Software Requirements Specification (SRS) defines the functional and non-functional requirements for the system, and is intended to serve as the primary reference for software development, database design, UI/UX design, UML modeling, testing, and client/company review.

The system allows authorized users to create and manage Indents, add multiple items to an Indent, maintain item information, view Indents, search and filter Indents, edit or delete information where permitted, export Indent information, and print Indent information.

### 1.2 Scope

This document covers the Indent creation, item management, stock display, draft/save, submission, listing, search/filter, export, and print capabilities of the Organize Indent System. The approval workflow, purchase order processing, goods receipt, full inventory management, supplier management, payment processing, user management, and authentication implementation are explicitly out of scope (see Section 3).

> **Note:** The system will initially use its own application database, with the architecture designed to allow future integration with the company's ERP / existing database without major redesign.

### 1.3 Intended Audience

This document is intended for the following audiences:

- Software developers and architects implementing the system
- Database designers defining the physical schema
- UI/UX designers building the Indent creation and listing screens
- QA/testers designing test cases and validation scenarios
- UML modelers preparing use case, activity, sequence, and state diagrams
- Company/client stakeholders reviewing and confirming business requirements
- The approval-workflow team, for defining the integration boundary

### 1.4 Definitions and Terminology

| Term | Definition |
|---|---|
| Indent | A request raised by a department for purchasing or obtaining required materials/items. |
| Item | A material/product entity that can be added to one or more Indents. |
| Current Stock | The quantity of an item currently available, retrieved from the Inventory/Stock database. |
| Indent Type | A classification of an Indent, sourced from the existing Indent Type Master. |
| Department | The organizational unit associated with an Indent or Item. |
| Created By | The authenticated user who created the Indent. |
| Required Quantity | The quantity of an item requested in the Indent (also referred to as Order Quantity). |
| Required Date | The date by which the requested item is needed. |
| Unit | The unit of measure for the Required Quantity (also referred to as Required Quantity Unit). |
| Draft | The saved-but-not-submitted state of an Indent. |
| TBD | To Be Determined / Confirmed with Company — an item not yet finalized by the business. |

### 1.5 References

This SRS is derived from the requirement clarification notes and question/answer sessions conducted for the Organize Indent System project. No external standards documents have been referenced at this stage; any applicable company standards (e.g., accessibility, print, Excel formats) are to be supplied by the company (see Section 24).

## 2. Overall Description

### 2.1 Product Perspective

The Organize Indent System is a standalone module that will initially operate against its own application database. It is designed to later integrate with the company's ERP / existing systems for Item Master, Department Master, Stock/Inventory, and Approval workflow. Authentication is provided by an external module and is not implemented by this system.

### 2.2 Product Functions

- Create, save (as Draft), and submit Indents
- Add one or more Items to an Indent, with automatic Item Code generation
- Retrieve and display Current Stock for selected items from the Inventory/Stock database
- Prevent saving of an Indent that has no Items
- View, search, and filter Indents in a paginated list
- Edit and delete Indents/Items according to authorization rules (details TBD, see Section 6)
- Export one, multiple, or all Indents (with item details) to Excel
- Print the complete Indent webpage

### 2.3 User Classes and Characteristics

The exact user-role structure has not yet been completely finalized. Roles mentioned during requirement gathering include Department Employee, Department Head, Purchase Employee, Store Employee, and Admin; however, these should not be assumed to be the final implemented roles.

> **TBD:** The exact user roles and permissions are subject to confirmation from the company. The system shall nevertheless support authorization so that users can only perform actions for which they have permission (see Section 6 and the Permission Matrix).

### 2.4 Operating Environment

- The application is designed primarily for desktop use (NFR-01).
- The initial page rendering approach is Server-Side Rendering with Next.js — a development-team technical decision, not a confirmed business requirement (NFR-04).
- The system integrates with an externally provided authentication context.

### 2.5 Design Constraints

- Authentication/login must be provided by another module/team; this system integrates with, but does not implement, authentication.
- The approval workflow is owned by another team; this system is responsible only up to Submit and for displaying status information received from the approval process.
- The initial database is application-owned; the architecture must allow future ERP/database integration without major redesign (service/API/database abstraction layers recommended).

### 2.6 Assumptions and Dependencies

See Section 21 (Assumptions) and Section 22 (Dependencies) for the complete lists.

## 3. System Scope

### 3.1 In Scope

#### Indent Management

- Create Indent
- Save Indent (as Draft)
- Submit Indent
- Edit Indent where permitted
- Delete Indent where permitted
- View Indent
- Display Indent details

#### Item Management

- Add items to an Indent (single and multiple)
- Enter Item Name
- Automatically generate Item Code
- Maintain item details
- Display Current Stock
- Edit permitted item fields
- Delete items where permitted

#### Indent Listing

- Display Indents in a list/table
- Select an Indent and display its details and associated items
- Pagination
- Search
- Filtering

#### Search and Filters

- Indent Type
- Department
- Date
- Date Range
- Created By
- Status

#### Export

- Export one selected Indent
- Export multiple selected Indents
- Export all Indents
- Exported Excel contains complete Indent and associated item information

#### Printing

- Print the complete webpage containing the Indent information and associated item details.

#### Authentication and Current Stock (Integration Points)

- Authentication/login is provided by another module/team.
- Current Stock is obtained from the Inventory/Stock database.

### 3.2 Out of Scope

The following are not part of the primary responsibility of this module unless the company later changes the scope:

- Approval workflow implementation
- Purchase Order processing
- Goods Receipt
- Full Inventory Management
- Stock Adjustment
- Supplier Management
- Payment processing
- User Management
- Authentication implementation

> **Note:** The approval workflow is explicitly handled by another team.

> **TBD:** The exact status integration between this module and the approval system is still to be confirmed.

## 4. Business Process

### 4.1 Current / Expected Workflow

- Department/User initiates Create Indent
- User enters Indent information
- User adds one or more Items
- System validates Items
- User saves the Indent as Draft
- User edits the Draft if necessary
- User submits the Indent
- Higher-authority approval takes place (outside this module)
- Further company processing occurs (outside this module)

### 4.2 Approval Boundary

The Organize Indent System does not own the approval workflow. Another team is responsible for the approval process. This module's responsibility is limited to:

- Creating the Indent
- Saving the Indent
- Managing the Indent before submission
- Submitting the Indent
- Displaying relevant status information received from the approval process

> **TBD:** The exact integration boundary and status contract must be defined jointly with the approval team.

### 4.3 Stock Behavior

Creating an Indent does not directly reduce physical stock. For example, if Current Stock = 100 and Required Quantity = 30, the physical stock remains 100 immediately after the Indent is created. Stock is reduced only when items are actually issued/consumed, or according to the company's actual inventory process.

> **Note:** If the company treats an approved Indent as a stock reservation, that reservation behavior must be defined as a separate requirement; it is not assumed here.

## 5. Functional Requirements

The following functional requirements use "shall" to denote formal, testable system behavior.

| ID | Name | Description | Priority |
|---|---|---|---|
| FR-01 | Create Indent | The system shall allow authorized users to create a new Indent. | High |
| FR-02 | Generate Indent Number | The system shall automatically generate a unique, read-only Indent Number. Exact format is TBD (Section 7.2). | High |
| FR-03 | Enter Indent Details | The system shall allow users to enter the required Indent information (Indent Type, Date, Time, Department, Created By, Remark/Note). | High |
| FR-04 | Add Item | The system shall allow users to add Items to the current Indent via an Add Item action. | High |
| FR-05 | Multiple Items | The system shall support multiple Item records within a single Indent. | High |
| FR-06 | Generate Item Code | The system shall automatically generate an Item Code when a new Item is created. Exact format is TBD (Section 8.4). | High |
| FR-07 | Retrieve Current Stock | The system shall retrieve Current Stock from the Stock/Inventory table using the Item's unique Item Code. | High |
| FR-08 | Prevent Empty Indent | The system shall prevent saving an Indent that contains no Items (Number of items >= 1) and shall display an appropriate error message. | High |
| FR-09 | Save Draft | The system shall allow an Indent to be saved as a Draft. | High |
| FR-10 | Submit Indent | The system shall provide a separate Submit action, distinct from Save. | High |
| FR-11 | View Indents | The system shall allow authorized users to view Indents and their details. | High |
| FR-12 | Search Indents | The system shall allow users to search for Indents by Indent ID/Number. Exact/partial behavior is TBD (Section 10.2). | High |
| FR-13 | Filter Indents | The system shall support filtering by Indent Type, Department, Date, Date Range, Created By, and Status, combinable where applicable. | High |
| FR-14 | Select Indent | The system shall allow users to select an Indent from the list and view its details and associated items. | High |
| FR-15 | Pagination | The system shall display 10 records per page in the Indent List. | Medium |
| FR-16 | Edit | The system shall allow authorized users to edit permitted information. Exact editable fields are TBD (Sections 7.7, 8.10, 7.10). | Medium |
| FR-17 | Delete Item | The system shall allow authorized users to delete an Item from an Indent when permitted. | Medium |
| FR-18 | Delete Indent | The system shall allow authorized users to delete an Indent when permitted. | Medium |
| FR-19 | Excel Export | The system shall support exporting one selected Indent, multiple selected Indents, or all Indents to Excel, including complete Indent and Item information. | Medium |
| FR-20 | Print | The system shall allow users to print the complete Indent webpage, including Indent and associated Item details. | Medium |
| FR-21 | Confirmation | The system shall request explicit confirmation before Delete, Save, Update, and Submit actions. | High |
| FR-22 | Error Handling | The system shall display an appropriate popup/dialog when an error occurs, without exposing raw technical/database errors. | High |

## 6. User Roles and Permissions

The exact user-role structure has not yet been completely finalized. The following roles were mentioned during requirement gathering and are documented for planning purposes only:

- Department Employee
- Department Head
- Purchase Employee
- Store Employee
- Admin

> **TBD:** Do not assume all of the above roles will be implemented. The exact user roles and permissions are subject to confirmation from the company.

Regardless of the final role list, the system shall enforce authorization so that users can only perform actions for which they have permission (NFR-09).

### 6.1 Permission Matrix

Cells are marked TBD where the responsible role has not been confirmed. This matrix must be completed and validated with the company before implementation.

| Role | Create Indent | Add/Edit Item | Save Draft | Submit | Edit Indent | Delete Indent | Export | Print |
|---|---|---|---|---|---|---|---|---|
| Department Employee | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Department Head | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Purchase Employee | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Store Employee | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Admin | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

> **TBD:** The complete role-to-permission matrix is TBD and must be confirmed with the company rather than guessed.

## 7. Indent Management Requirements

### 7.1 Indent Concept

An Indent represents a request for purchasing/obtaining materials and contains:

- Indent Number
- Indent Type
- Indent Date
- Time
- Remark/Note
- Created By
- Department
- One or more Items

> **TBD:** The exact mandatory/optional classification of every Indent-level field is to be documented only once confirmed.

### 7.2 Indent Number

The Indent Number shall be automatically generated, unique, read-only, and not editable by the user.

> **TBD:** The exact company format for the Indent Number has not been confirmed. A previously discussed example such as "PURC000123" is only an example and must NOT be treated as the final company format.

### 7.3 Indent Type

An Indent has an Indent Type. An existing Indent Type Master is understood to already exist.

*"The system shall obtain available Indent Types from the existing Indent Type Master."*

> **TBD:** The exact list of Indent Types has not been provided and shall not be invented (e.g., "Purchase", "Maintenance", "Production" are not confirmed). Whether users can dynamically create new Indent Types is also not fully confirmed.

### 7.4 Department

Departments are associated with Indents/Items as required by the business process.

> **TBD:** Department Master source and management responsibility must be confirmed.

### 7.5 Save Function

The Save action stores the Indent as a Draft. The draft can subsequently be edited according to applicable rules and then submitted for further processing.

### 7.6 Submit Function

There is a separate Submit action, distinct from Save. Workflow: Create Indent → Add Items → Save as Draft → Edit if required → Submit → Higher-authority approval (handled by another team).

### 7.7 Editing Indents

Indent-level attributes cannot be edited after creation; the system shall prevent modification of immutable Indent attributes.

> **TBD:** Item-level editing rules after Indent creation require further clarification (see Section 8.10).

### 7.8 Deleting Indents

An Indent can be deleted by an authorized user with the required permission.

*"Deletion shall be restricted to authorized users according to the applicable business permissions."*

> **TBD:** The exact role responsible for deletion has not been confirmed.

### 7.9 Indent Status

Status values mentioned during requirement gathering (not confirmed) include: Draft, Submitted, Pending Approval, Approved, Rejected, Cancelled.

*"The status values displayed by the module shall be finalized based on the status contract/integration provided by the approval team."*

> **TBD:** Exact statuses displayed are TBD.

### 7.10 Editing After Submission

> **TBD:** After submission, only certain fields may be editable; the exact fields are not yet confirmed and must be confirmed with the company/approval team.

## 8. Item Management Requirements

### 8.1 Items Overview

An Indent can contain multiple Items. For example, Indent #123 may contain Item A, Item B, and Item C. The system shall support multiple item records within a single Indent.

### 8.2 Item Information

The following item-level fields have been identified:

- Item Name
- Item Code
- Specification
- Drawing Number
- Department
- Purpose
- Current Stock
- Required Quantity / Order Quantity
- Required Date
- Required Quantity Unit / Unit

> **TBD:** The exact required/optional/editable/auto-filled status of every field is to be documented carefully once confirmed.

### 8.3 Item Name

Item Name is entered manually by the user when creating a new Item.

### 8.4 Item Code

Item Code is automatically generated by the system; the user shall not manually generate the Item Code.

> **TBD:** The exact Item Code generation format has not been specified.

### 8.5 Item Master

An existing company Item Master may contain Item Code, Item Name, UOM, Drawing Number, and Specification. The current implementation team's working assumption is that the Item Master will be recreated within the application's database.

> **TBD:** Confirm whether the existing company Item Master should be recreated, integrated with, or used directly. The architecture should nevertheless allow future integration.

### 8.6 Duplicate Items

Whether the same Item can be added multiple times to one Indent has not been confirmed. Possible behaviors discussed include: prevent duplicate items, combine quantities, or allow duplicate entries.

> **TBD:** The duplicate-item handling rule is TBD and must be confirmed with the company. No single behavior should be assumed as the confirmed business rule.

### 8.7 Add Item

The Add Item action adds the entered item information to the current Indent. Process: Fill item information → Click Add Item → Item is added to the current Indent → Item appears in the Current Indent Item List. The entered item data is bound to the current Indent's item list/grid.

### 8.8 Remove Item Before Saving

> **TBD:** Whether a user can remove an item from the Current Indent Item List before the Indent is saved has not been confirmed with the company.

### 8.9 Saving Without Items

An Indent cannot be saved without at least one item. The system shall validate that the number of items in the Indent is greater than or equal to 1. If no items have been added, the Save operation shall be prevented and an appropriate error message shall be displayed.

### 8.10 Item Editing

Previously discussed potentially editable fields (not finalized) include: Item Name, Item Code, Purpose, Required Quantity, Required Date, and Required Quantity Unit.

> **TBD:** The exact item fields that can be edited after creation are TBD. This list must not automatically be treated as final. Editing rules for Specification, Drawing Number, Department, and Current Stock are also not finalized.

### 8.11 Delete Item

An item can be deleted from an existing Indent provided the user has the required permission and the Indent is in a status that permits modification.

> **TBD:** The exact status/role restrictions for item deletion must be confirmed.

## 9. Current Stock Requirements

### 9.1 Definition

Current Stock represents the quantity of an item currently available in storage. Stock quantity increases when items are received/purchased and decreases when items are issued/consumed.

### 9.2 Source

Current Stock is obtained from the Inventory/Stock database. The system maintains or accesses the available quantity of each item.

### 9.3 Retrieval Process

The system retrieves Current Stock from the Stock/Inventory table using the item's unique Item Code. Basic process:

- User selects/enters Item
- System identifies Item Code
- System retrieves Current Stock
- System displays Current Stock

### 9.4 Refresh While Creating an Indent

The system should retrieve the latest stock quantity from the database so that the Current Stock displayed to the user remains updated, and should avoid relying indefinitely on an old stock value.

> **TBD:** The exact real-time refresh mechanism is not fully defined and shall not be over-specified at this stage.

### 9.5 Effect of Creating an Indent on Stock

Creating an Indent does not directly reduce physical stock. Example: if Current Stock = 100 and Required Quantity = 30, the physical stock remains 100 immediately after the Indent is created. Stock is reduced when items are actually issued/consumed, or according to the company's actual inventory process.

> **Note:** If the company treats an approved Indent as a reservation, reservation behavior must be defined as a separate, explicitly confirmed requirement.

### 9.6 Stock-Outdated Warning

A stock-change warning concept was proposed during requirement discussions (e.g., a notice showing the previously displayed stock versus the current stock, with an "Update Stock" option).

> **TBD:** It has not been confirmed whether this warning is an official company requirement or merely a proposed UI solution. Confirm whether stock-change notification is required.

## 10. Search, Filter and List Requirements

### 10.1 Indent List

The Indent List provides a structured view of Indents. Previously identified display fields include Item Code, Item Name, Specifications, Drawing Number, Department, Purpose, Current Stock, Required Date, Order Quantity, and Unit.

> **Note:** These fields are based on the current requirement clarification and may represent item-level information rather than pure Indent-level columns. The UI should be structured logically (e.g., an Indent-level summary row combined with an expandable/associated item grid) rather than blindly treating all of these as Indent-level database fields.

### 10.2 Search

The system shall support searching by Indent ID/Number.

> **TBD:** The exact search behavior — exact search, partial search, or both — is not finalized and must not be invented.

### 10.3 Filters

The following filters are required, and the system should allow users to combine filters where applicable:

- Indent Type
- Department
- Date
- Date Range
- Created By
- Status

### 10.4 Selecting an Indent (Confirmed)

When the user selects an Indent from the Indent List: (1) the selected Indent is identified, (2) Indent details are displayed, (3) associated items are displayed, and (4) authorized users can perform permitted actions such as edit/delete. This behavior is confirmed.

### 10.5 Pagination (Confirmed)

The Indent List shall use pagination with a confirmed page size of 10 records per page, with Prev/Next and page-number navigation.

## 11. Export and Print Requirements

### 11.1 Excel Export (Confirmed)

Excel export is a confirmed requirement. The system shall support:

- One selected Indent
- Multiple selected Indents
- All Indents (according to applicable filters/permissions)

Requirement: All of the above shall be supported.

### 11.2 Excel Content

For now, the Excel export should contain everything, including:

#### Indent Information

- Indent Number
- Indent Type
- Date
- Time
- Department
- Created By
- Remark/Note
- Status (where available)

#### Item Information

- Item Code
- Item Name
- Specification
- Drawing Number
- Department
- Purpose
- Current Stock
- Required Quantity / Order Quantity
- Required Date
- Unit

> **Note:** The final Excel layout (column order, sheet structure, formatting) can be defined during UI/report design.

> **TBD:** Any company-specific Excel format has not been confirmed.

### 11.3 Print

The current requirement is to print the whole webpage. The Print function shall print the complete visible Indent information and associated item information.

> **TBD:** A company-specific print template has not been confirmed.

## 12. Validation and Error Handling

### 12.1 Validation Requirements

The system shall validate:

- Required Indent information
- At least one Item exists before Save
- Valid Item information
- Valid quantities
- Valid dates
- Valid Item Code
- Valid Department
- Valid Indent Type

> **TBD:** Exact validation limits (e.g., minimum/maximum quantities, date ranges) are not specified and shall not be invented unless supplied by the company.

### 12.2 Confirmation Dialogues

The following actions require explicit user confirmation:

| Action | Example Confirmation Text |
|---|---|
| Delete | "Are you sure you want to delete this Indent/Item?" |
| Save | "Are you sure you want to save this Indent?" |
| Update | "Are you sure you want to update this Indent?" |
| Submit | "Are you sure you want to submit this Indent?" |

> **Note:** Exact wording can be finalized during UI design.

### 12.3 Error Handling

Errors shall be communicated through appropriate popup/dialog components. Situations that should produce errors include:

- Saving without an Item
- Invalid input
- Database failure
- Stock retrieval failure
- Unauthorized operation
- Invalid Indent
- Failed export
- Failed update
- Failed deletion

The system shall provide understandable error messages rather than exposing technical database/system errors directly to end users.

## 13. Non-Functional Requirements

| ID | Name | Requirement | Classification |
|---|---|---|---|
| NFR-01 | Desktop First | The application shall be designed primarily for desktop use. | Business Requirement |
| NFR-02 | Responsive Design | Although desktop-first, the UI shall remain responsive on different screen sizes. | Business Requirement |
| NFR-03 | Accessibility | The UI should be accessible. Exact accessibility standard is TBD. | Business Requirement (standard TBD) |
| NFR-04 | Server-Side Rendering | The initial page shall use server-side rendering with Next.js. | Technical Decision (dev team), not a confirmed business requirement |
| NFR-05 | Error Handling | The system shall provide clear popup/dialog messages when errors occur. | Business Requirement |
| NFR-06 | Confirmation | Important actions shall require explicit user confirmation. | Business Requirement |
| NFR-07 | Reusable Components | The development team should use reusable UI components as a development practice. | Technical/Development Practice, not a separate business requirement |
| NFR-08 | Maintainability | The system shall be structured so future database/ERP integration can be implemented without requiring a complete rewrite. | Business Requirement |
| NFR-09 | Security | The system shall enforce authorization for protected actions. Specific authentication mechanisms are not invented, since authentication is provided externally. | Business Requirement |
| NFR-10 | Data Integrity | The system shall maintain valid relationships between Indents, Items, Stock, Departments, and Indent Types. | Business Requirement |

> **Note:** Technical decisions (SSR/Next.js, reusable components) are explicitly distinguished from confirmed business requirements in the Classification column above.

## 14. External Interfaces

| Interface | Description | Status |
|---|---|---|
| Authentication | Provided by another module/team. This system integrates with the authenticated user context; it does not implement login. | Confirmed (boundary); mechanism TBD |
| Database | Application uses its own database initially; future integration with company ERP/existing database is expected. | Confirmed direction; ERP integration details TBD |
| Inventory/Stock | Current Stock is retrieved from the Inventory/Stock database using Item Code. | Confirmed |
| Item Master | May exist in the company's systems; current plan is to recreate it in the application database. | TBD — recreate vs. integrate vs. use directly |
| Department Master | Source and management responsibility not yet confirmed. | TBD |
| Indent Type Master | An existing Indent Type Master supplies the list of Indent Types. | Confirmed to exist; exact types TBD |
| Approval System | Owned by another team; this module submits Indents and displays received status. | Confirmed boundary; status contract TBD |
| Future ERP | Long-term integration target for database and master data. | Planned; details TBD |

## 15. Data Requirements

> **Note:** The following entities are a logical starting point only and must not be treated as a finalized physical database schema. They must be aligned with the final company database requirements.

### 15.1 Logical Entities

#### Indent

| Field |
|---|
| indent_id |
| indent_number |
| indent_type |
| indent_date |
| time |
| department |
| created_by |
| remark |
| status |
| created_at |
| updated_at |

#### Item

| Field |
|---|
| item_id |
| item_code |
| item_name |
| specification |
| drawing_number |
| unit |
| department |
| purpose |

#### Indent Item

| Field |
|---|
| indent_item_id |
| indent_id |
| item_id |
| current_stock |
| required_quantity |
| required_date |
| unit |

#### Stock

| Field |
|---|
| stock_id |
| item_code / item_id |
| current_quantity |
| updated_at |

#### Indent Type

| Field |
|---|
| indent_type_id |
| indent_type_name |

#### Department

| Field |
|---|
| department_id |
| department_name |

### 15.2 Relationships

- One Indent has many Indent Items (1 : N).
- One Item can appear in many Indent Items across different Indents (1 : N), subject to the TBD duplicate-item rule within a single Indent (Section 8.6).
- One Indent Type classifies many Indents (1 : N).
- One Department is associated with many Indents and/or Items (1 : N).
- Each Item relates to a Stock record via Item Code (1 : 1), used to retrieve Current Stock.

### 15.3 Item Code Relationship

Item Code uniquely identifies an Item and is used when retrieving the corresponding stock information. Conceptually: Item → Item Code → Stock record → Current Stock.

## 16. Use Cases

Potential use cases identified for UML modeling purposes:

- Login (owned by another module — not implemented here)
- Create Indent
- Add Item
- Save Draft
- Edit Indent
- Delete Indent
- Submit Indent
- View Indent
- Search Indent
- Filter Indent
- Export Excel
- Print Indent

> **Note:** Login is listed for completeness of the use-case diagram only; it is not assumed to be implemented by this module.

### 16.1 UC-01 Create Indent

| Field | Details |
|---|---|
| Use Case ID | UC-01 |
| Use Case Name | Create Indent |
| Actor | Authorized Indent User |
| Description | Allows an authorized user to create a new Indent, add items, and save it as a Draft. |
| Precondition | User is authenticated and has permission to create an Indent. |
| Main Flow | 1. User opens Create Indent. 2. System generates an Indent Number. 3. User enters Indent information. 4. User enters/adds Item information. 5. System validates the data. 6. User saves the Indent. 7. System creates the Draft. |
| Alternative Flow | User adds multiple items before saving (repeats step 4). |
| Exception Flow | If no Item has been added, the system prevents Save and displays an error message (FR-08). |
| Postcondition | A valid Draft Indent exists. |

### 16.2 UC-02 Add Item

| Field | Details |
|---|---|
| Use Case ID | UC-02 |
| Use Case Name | Add Item |
| Actor | Authorized Indent User |
| Description | Allows a user to add an item to the current (in-progress) Indent. |
| Precondition | User has an Indent open for creation/editing. |
| Main Flow | 1. User fills item information. 2. User clicks Add Item. 3. System adds the item to the current Indent's item list. 4. Item appears in the Current Indent Item List. |
| Alternative Flow | User adds another item (repeats flow). |
| Exception Flow | Invalid item information is rejected with an error message. |
| Postcondition | The item is bound to the current Indent's item list/grid. |

### 16.3 UC-03 Save Draft

| Field | Details |
|---|---|
| Use Case ID | UC-03 |
| Use Case Name | Save Draft |
| Actor | Authorized Indent User |
| Description | Saves the current Indent as a Draft. |
| Precondition | At least one Item has been added to the Indent. |
| Main Flow | 1. User clicks Save. 2. System requests confirmation. 3. User confirms. 4. System validates item count >= 1. 5. System stores the Indent as Draft. |
| Alternative Flow | N/A |
| Exception Flow | If no items exist, Save is blocked and an error is shown (FR-08). |
| Postcondition | Indent exists in Draft status. |

### 16.4 UC-04 Submit Indent

| Field | Details |
|---|---|
| Use Case ID | UC-04 |
| Use Case Name | Submit Indent |
| Actor | Authorized Indent User |
| Description | Submits a Draft Indent for higher-authority approval. |
| Precondition | Indent exists in Draft status and user has Submit permission. |
| Main Flow | 1. User clicks Submit. 2. System requests confirmation. 3. User confirms. 4. System forwards the Indent to the approval boundary. |
| Alternative Flow | N/A |
| Exception Flow | Submission failure displays an appropriate error message. |
| Postcondition | Indent status reflects submission (exact status values TBD, Section 7.9). |

### 16.5 UC-05 View / Select Indent

| Field | Details |
|---|---|
| Use Case ID | UC-05 |
| Use Case Name | View / Select Indent |
| Actor | Authorized Indent User |
| Description | Allows a user to select an Indent from the list and view its details and items. |
| Precondition | User has permission to view Indents. |
| Main Flow | 1. User opens Indent List. 2. User selects an Indent. 3. System identifies the selected Indent. 4. System displays Indent details and associated items. |
| Alternative Flow | User performs a permitted action (edit/delete) from the details view. |
| Exception Flow | N/A |
| Postcondition | Selected Indent's details and items are displayed. |

### 16.6 UC-06 Search / Filter Indents

| Field | Details |
|---|---|
| Use Case ID | UC-06 |
| Use Case Name | Search / Filter Indents |
| Actor | Authorized Indent User |
| Description | Allows a user to locate Indents using search by Indent ID/Number and/or filters. |
| Precondition | User has permission to view Indents. |
| Main Flow | 1. User enters a search term and/or selects filters (Indent Type, Department, Date, Date Range, Created By, Status). 2. System applies search/filter criteria. 3. System displays the matching, paginated results. |
| Alternative Flow | User combines multiple filters. |
| Exception Flow | No matching results displays an appropriate empty-state message. |
| Postcondition | Filtered/paginated Indent List is displayed. |

### 16.7 UC-07 Export to Excel

| Field | Details |
|---|---|
| Use Case ID | UC-07 |
| Use Case Name | Export to Excel |
| Actor | Authorized Indent User |
| Description | Exports one, multiple, or all Indents (with items) to an Excel file. |
| Precondition | User has export permission. |
| Main Flow | 1. User selects one/multiple Indents, or chooses Export All. 2. User triggers Export. 3. System generates an Excel file containing full Indent and item information. 4. File is delivered to the user. |
| Alternative Flow | N/A |
| Exception Flow | Export failure displays an appropriate error message (FR-22). |
| Postcondition | Excel file containing the selected Indent(s) is produced. |

### 16.8 UC-08 Print Indent

| Field | Details |
|---|---|
| Use Case ID | UC-08 |
| Use Case Name | Print Indent |
| Actor | Authorized Indent User |
| Description | Prints the complete Indent webpage, including Indent and item details. |
| Precondition | An Indent's details are currently displayed. |
| Main Flow | 1. User triggers Print. 2. System renders the complete visible Indent and item information for printing. |
| Alternative Flow | N/A |
| Exception Flow | N/A |
| Postcondition | The Indent page is sent to the printer/print preview. |

## 17. System Workflows

### 17.1 Basic Workflow

- Department/User
- Create Indent
- Enter Indent Information
- Add Item(s)
- Validate Items
- Save as Draft
- Edit if necessary
- Submit
- Higher Authority Approval
- Further company processing

> **Note:** The approval and subsequent purchasing/material processes are outside this module's main responsibility.

### 17.2 Activity Flow Summary

Create Indent → Enter Details → Add Items → Validate → Save Draft → Submit → Approval Boundary.

### 17.3 Interaction Flow Summary

User → UI → Indent Service → Database, with the Indent Service additionally calling the Stock Service/Database to retrieve Current Stock during item entry.

## 18. UML Modeling Requirements

### 18.1 Use Case Diagram

Actors: Authorized Indent User (role details TBD), Approval System/Team (external), Authentication Module (external).

Use cases: Login (external, not implemented here), Create Indent, Add Item, Save Draft, Edit Indent, Delete Indent, Submit Indent, View Indent, Search Indent, Filter Indent, Export Excel, Print Indent.

### 18.2 Activity Diagram

Model: Create Indent → Enter Details → Add Items → Validate → Save Draft → Submit → Approval Boundary (hand-off to the approval team's process).

### 18.3 Sequence Diagram

Model interactions between: User → UI → Indent Service → Database, and Indent Service → Stock Service/Database for Current Stock retrieval during item entry.

### 18.4 State Machine Diagram

Conceptual states discussed: Draft → Submitted → Pending Approval → Approved / Rejected.

> **TBD:** These states are subject to confirmation because the exact approval status model is not finalized (Section 7.9).

## 19. Business Rules

| ID | Business Rule | Status |
|---|---|---|
| BR-01 | An Indent shall not be saved unless it contains at least one Item. | Confirmed |
| BR-02 | The Indent Number shall be system-generated, unique, and read-only. | Confirmed (format TBD) |
| BR-03 | The Item Code shall be system-generated and shall not be manually entered by the user. | Confirmed (format TBD) |
| BR-04 | Creating an Indent shall not directly reduce physical Current Stock. | Confirmed |
| BR-05 | Save stores the Indent as a Draft; Submit is a distinct, separate action. | Confirmed |
| BR-06 | Indent-level attributes are immutable after creation. | Confirmed |
| BR-07 | Delete, Save, Update, and Submit actions require explicit user confirmation. | Confirmed |
| BR-08 | Access to Create/Edit/Delete/Submit/Update actions is restricted by user authorization. | Confirmed (role mapping TBD) |
| BR-09 | Duplicate-item handling within a single Indent (prevent / combine / allow). | TBD |
| BR-10 | Item removal from the Current Indent Item List before Save. | TBD |
| BR-11 | Editable item fields after Indent creation. | TBD |
| BR-12 | Editable fields after submission. | TBD |
| BR-13 | Search behavior for Indent ID/Number (exact/partial/both). | TBD |
| BR-14 | Whether the stock-change/outdated-stock warning is required. | TBD |

## 20. Requirements Traceability Matrix

| Requirement ID | Requirement | Source/Decision | Priority | Status |
|---|---|---|---|---|
| FR-01 | Create Indent | Confirmed | High | Confirmed |
| FR-02 | Generate Indent Number | Confirmed (format TBD) | High | Partially Confirmed |
| FR-03 | Enter Indent Details | Confirmed | High | Confirmed |
| FR-04 | Add Item | Confirmed | High | Confirmed |
| FR-05 | Multiple Items | Confirmed | High | Confirmed |
| FR-06 | Generate Item Code | Confirmed (format TBD) | High | Partially Confirmed |
| FR-07 | Retrieve Current Stock | Confirmed | High | Confirmed |
| FR-08 | Prevent empty Indent | Confirmed | High | Confirmed |
| FR-09 | Save as Draft | Confirmed | High | Confirmed |
| FR-10 | Submit | Confirmed | High | Confirmed |
| FR-11 | View Indents | Confirmed | High | Confirmed |
| FR-12 | Search Indents | Confirmed (behavior TBD) | High | Partially Confirmed |
| FR-13 | Filter Indents | Confirmed | High | Confirmed |
| FR-14 | Select Indent | Confirmed | High | Confirmed |
| FR-15 | Pagination (10/page) | Confirmed | Medium | Confirmed |
| FR-16 | Edit (permitted fields) | Partially confirmed | Medium | TBD |
| FR-17 | Delete Item | Confirmed (restrictions TBD) | Medium | Partially Confirmed |
| FR-18 | Delete Indent | Confirmed (role TBD) | Medium | Partially Confirmed |
| FR-19 | Excel Export | Confirmed | Medium | Confirmed |
| FR-20 | Print | Confirmed | Medium | Confirmed |
| FR-21 | Confirmation dialogues | Confirmed | High | Confirmed |
| FR-22 | Error handling | Confirmed | High | Confirmed |

## 21. Assumptions

- Authentication is supplied by another module/team.
- The initial application uses its own database.
- Future ERP integration is expected.
- Current Stock is obtained from a Stock/Inventory database.
- Creating an Indent does not directly decrease physical stock.
- At least one Item is mandatory for saving an Indent.
- Save creates a Draft.
- Submit is a separate action.
- The approval workflow is managed by another team.
- Pagination uses 10 records per page.
- Excel export includes complete Indent and Item information.
- Printing currently prints the whole webpage.

## 22. Dependencies

The system may depend on the following, several of which are marked TBD where not yet confirmed:

- Authentication module (external — confirmed boundary)
- Inventory/Stock database (confirmed)
- Item Master — TBD (recreate, integrate, or use directly)
- Department Master — TBD (source and ownership)
- Indent Type Master (confirmed to exist; exact types TBD)
- Approval workflow/team (confirmed boundary; status contract TBD)
- Future ERP integration (planned; details TBD)

## 23. Constraints

- Authentication and approval workflow implementation are explicitly out of scope for this module.
- The application must initially operate against its own database while remaining architecturally open to future ERP/database integration.
- The UI is desktop-first, though it must remain responsive across screen sizes.
- Server-side rendering with Next.js is a development-team technical decision and constrains the initial front-end architecture, but is not itself a business requirement.
- No confirmed company standards currently exist for accessibility, Item Code/Indent Number formats, print templates, or Excel layout; these constrain final implementation once confirmed.

## 24. Open Issues / TBD Requirements

The following items are explicitly unresolved and must be confirmed with the company before final implementation. None of these have been guessed or assumed elsewhere in this document.

- Exact Indent Number format.
- Exact Indent Types.
- Who can create new Indent Types.
- Exact Department Master source.
- Exact user roles.
- Exact role permissions (Permission Matrix, Section 6.1).
- Whether the same Item can be added multiple times to one Indent.
- Whether users can remove an Item before saving.
- Exact editable Item fields.
- Exact search behavior — exact vs. partial vs. both.
- Exact statuses displayed.
- Exact fields editable after submission.
- Whether the stock-change warning is required.
- Exact approval-system integration/status contract.
- Whether the existing Item Master should be recreated or integrated.
- Exact accessibility standard.
- Exact company-specific print format.
- Any company-specific Excel format.
- Any additional validation rules.
- Any additional business rules supplied by the company.

## 25. Future Enhancements

The current architecture should support future integration with the company's ERP/database:

*Current: Application → Application Database.*

*Future: Application → Company ERP / Existing Database.*

It is recommended that service/API/database abstraction layers be designed so that future integration can be performed with minimal changes to the UI and business logic. Additional future enhancements (e.g., real-time stock synchronization, dynamic Indent Type management, expanded reporting) may be considered once the corresponding TBD items in Section 24 are resolved.

## 26. Conclusion

This SRS defines the confirmed functional and non-functional requirements for the Organize Indent System covering Indent creation, item management, current stock display, save/draft/submit behavior, listing, search and filtering, export, and print, while explicitly separating these from the twenty open items listed in Section 24 that require company confirmation.

The document is structured to support software development, database design, UI/UX design, UML modeling, and testing and validation activities, and should be revisited and updated as each TBD item is resolved with the company and the approval-workflow team.
