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

### Rejection reasons

A rejected transition is more than a boolean. `StateMachine.transition`
returns a `reason` code alongside the human-readable `error`, so callers can
branch on a stable value instead of matching message text:

| `reason`        | Meaning                                                        |
|-----------------|----------------------------------------------------------------|
| `unknown-state` | the current state is not declared (corrupt/externally mutated) |
| `unknown-event` | no transition anywhere declares the event                      |
| `not-allowed`   | the event is declared, but not from the current state          |
| `guard-blocked` | a transition exists from the current state, but its guard failed |

A successful transition omits `reason` entirely. A transition whose target
equals its source is accepted but reports `changed: false`.

`ItemWorkflow.send` widens this set with two workflow-level reasons:
`not-found` (no item has the id) and `store-error` (the backing store threw).
The API route maps them to HTTP via `statusForReason`:

- `not-found` → `404`
- `unknown-event` → `400` (a defensive fallback; the request schema rejects
  unknown events first)
- `store-error` → `503`
- everything else (`not-allowed`, `guard-blocked`, `unknown-state`) → `409`

### Edge cases hardened

- **Ambiguous definitions fail fast.** The constructor rejects two
  *unconditional* transitions that share a source state and event, since the
  chosen target would otherwise depend on declaration order. Guarded
  transitions may still sit beside one another.
- **Store failures are contained.** `send` catches throws from both
  `store.get` and `store.save`, returns a `store-error` result instead of
  rejecting, and leaves the per-id lock chain healthy so later events on the
  same id still run. A failed write never advances the persisted item.
- **Corrupt persisted state is reported, not crashed on.** An item whose
  stored `status` is not a valid `ItemStatus` yields an `unknown-state`
  rejection rather than an exception.
- **Transition guards see the whole item.** `send` passes the current `Item`
  as the transition context, so a guard can inspect any field, not just the
  status.
