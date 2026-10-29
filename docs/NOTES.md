# Architecture Notes

## Item Module Data Flow

The Item module follows a layered architecture pattern:

### 1. Model Layer (`src/models/item.ts`)
Defines the core data structures:
- `Item` interface: full item record with id, timestamps
- `ItemCreate` interface: payload for creating new items

### 2. API Layer (`src/app/api/items/route.ts`)
Next.js route handlers:
- `GET /api/items` - returns all items from in-memory store
- `POST /api/items` - validates, generates id/timestamps, persists item

Data flows in: HTTP request → JSON parsing → item creation → in-memory array

### 3. Service Layer (`src/services/item-service.ts`)
Business logic:
- `calculatePriority()` - derives priority level from status + age
- `validate()` - checks required fields and status enum

Called by API handlers or components needing computed values.

### 4. Component Layer (`src/components/item-list.tsx`)
React presentation:
- Receives `Item[]` array as props
- Maps to list UI with name, status, description
- No direct data fetching

## Flow Summary
```
HTTP POST → API route → ItemService.validate() → persist → return Item
HTTP GET → API route → return Item[] → ItemList component → render
```

Priority calculation happens on-demand via `ItemService.calculatePriority()`.
