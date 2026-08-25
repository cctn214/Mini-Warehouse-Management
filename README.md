# Cytan WHS - Mini Warehouse Management System

This is a clean, minimal client-side **Warehouse Management System (WMS)** built for simplicity and lightweight execution.

## Technologies Used

This system uses only core frontend technologies:
1. **HTML5**: Structured semantic layout containing tabular directories and modular modal overlays.
2. **Tailwind CSS**: A modern utility-first CSS library pulled via CDN for spacing, responsive grid alignment, and typography.
3. **jQuery**: A fast, traditional JavaScript library used for low-level DOM event listeners, modal triggers, view tab transitions, and rendering table templates step-by-step.
4. **IndexedDB (Raw Browser Storage)**: The browser's native client-side transactional database, used to persist warehouses and items locally without the need for external database servers.

---

## Data Model & Relationship Rules

The system manages exactly two entities:
- **Warehouse**: Consists of Code, Name, Location, and Capacity.
- **Item**: Consists of SKU, Name, Quantity, Price, and Assigned Warehouse.

### Relationship:
- The relationship is defined as **One Warehouse to Many Items** (one warehouse has multiple items, each item belongs to exactly one warehouse).
- This relationship is managed manually inside JavaScript.

### Validation Rules:
- **Unique Constraints**: Warehouse Codes and Item SKUs must be unique.
- **Capacity Constraint**: Items cannot be added or edited such that their cumulative quantity exceeds the maximum storage capacity of their assigned warehouse.
- **Cascading Integrity**: Deleting a warehouse containing items displays a prompt allowing you to either cascade-delete all stored items or disassociate them (marking them as `<Unassigned>`).

---

## Code Writing Guidelines

To ensure maximum readability and code simplicity:
- **Traditional Syntaxes Only**: High-level ES6 arrow functions (`=>`) and functional array abstractions (`.filter()`, `.map()`, `.some()`, `.find()`, `.forEach()`) have been omitted in favor of standard `function` declarations and low-level explicit `for` loops.
- **Plain Control Flow**: Control statements are structured using traditional `if-else` blocks rather than complex ternary statements inside rendering loops.
