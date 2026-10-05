# Technical Notes

## ItemService Data Flow

The `ItemService` module processes item records through validation and priority calculation pipelines.

### Data Flow Overview

```
Item (model) → ItemService → ValidationResult | PriorityLevel
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
   validate()            calculatePriority()
        ↓                       ↓
   validation-utils        date-utils
                           priority-utils
```

### Validation Pipeline

1. **Input**: Partial `Item` data
2. **Processing**: 
   - Checks required `name` field is present and non-empty
   - Validates `status` against allowed values: `active`, `pending`, `completed`
3. **Output**: `ValidationResult` with `valid` boolean and `errors` array

### Priority Calculation Pipeline

1. **Input**: Complete `Item` record
2. **Processing**:
   - Calculates age in days from `createdAt` timestamp
   - Adds 50 points if status is `urgent`
   - Adds 0.5 points per day if age exceeds 30 days
3. **Scoring**: Converts numeric score to priority level
   - `≥80`: critical
   - `≥50`: high
   - `≥20`: medium
   - `<20`: low
4. **Output**: `PriorityLevel` enum value

### Dependencies

- `@/models/item`: Data structure definitions
- `@/utils/date-utils`: Age calculation
- `@/utils/priority-utils`: Score-to-level conversion
- `@/utils/validation-utils`: Result formatting

## Item Lifecycle State Machine

Item status used to be an unconstrained string: any value could be written
over any other, and each call site re-derived its own idea of which statuses
were valid. The async update path made this worse, because two in-flight
requests could both read the same status and then write conflicting results,
leaving the item in an inconsistent state. `ItemService.calculatePriority`
even branched on a `'urgent'` status that was never a legal value.

The lifecycle is now modelled explicitly.

### Pieces

- `@/utils/state-machine`: a generic, stateless finite state machine. It
  validates its own definition on construction and exposes `can`, `next`,
  `transition`, `availableEvents`, and `isFinal`. `transition` is pure — it
  takes the current state and an event and returns the outcome without
  mutating anything.
- `@/models/item`: `ItemStatus` and the canonical `ITEM_STATES` list are the
  single source of truth for valid statuses.
- `@/services/item-workflow`: defines the item state machine and the
  `ItemWorkflow` service that applies transitions against a store.

### Transitions

```
pending ──activate──▶ active ──complete──▶ completed
   │                    │                     │
   └──────cancel────────┤                     │
                        ▼                      │
                    cancelled                  │
                        │                      │
                        └──────reopen──────────┴──▶ pending
```

### Consistency guarantee

`ItemWorkflow.send(id, event)` serializes transitions per item id. Each
request waits for any in-flight transition on the same id to settle, then
re-reads the latest persisted status before applying its event. Two
concurrent requests therefore act on fresh state in order rather than racing
on a stale snapshot. Illegal events (for example `complete` from `pending`)
are rejected with the item left untouched; the API route surfaces these as
`409 Conflict`, and a missing item as `404 Not Found`.

### Call sites migrated

- `src/app/api/items/route.ts`: `POST` validates `status` against
  `ITEM_STATES`; a new `PATCH` handler drives transitions through the
  workflow.
- `src/services/item-service.ts`: `validate` checks `ITEM_STATES`, and
  `calculatePriority` now keys off the real `active` state instead of the
  dead `'urgent'` branch.
