# Design note: refactoring the item service

## What was tangled

`src/services/item-service.ts` was a single `ItemService` class that mixed four
unrelated concerns in two methods:

- **Reading the clock** — `calculatePriority` called `Date.now()` directly.
- **Scoring** — turning a record's status and age into a number.
- **Classifying** — mapping that number to `critical` / `high` / `medium` /
  `low` via magic thresholds.
- **Validation** — unrelated input checks with hard-coded status strings.

Because scoring reached for the wall clock, it could not be tested without
mocking global time, and the scoring weights, age window, and label thresholds
were buried as literals inside a conditional.

## The shape now

A pure core plus a thin adapter:

```
src/services/
  item/
    priority.ts     pure scoring + classification (no clock, no I/O)
    validation.ts   pure input validation
    clock.ts        the one time boundary (systemClock / fixedClock)
    index.ts        barrel re-export
  item-service.ts   thin adapter: ItemService, unchanged public API
```

- **`priority.ts`** is pure. Every function takes an explicit `nowMs`, so
  results are deterministic. The weights (`PRIORITY_WEIGHTS`), grace window
  (`AGE_GRACE_DAYS`), and label cutoffs (`PRIORITY_THRESHOLDS`) are named
  constants. `scorePriority` → `classifyPriority` → `computePriority` compose.
- **`validation.ts`** is pure. The accepted statuses live in `VALID_STATUSES`
  and messages in `ValidationMessages`, so there are no stray literals.
- **`clock.ts`** is the only place that reads real time. `systemClock` is used
  by the app; `fixedClock(instant)` freezes time for tests.
- **`item-service.ts`** keeps the exact `ItemService` API
  (`calculatePriority(record)`, `validate(data)`). It injects a `Clock`
  (defaulting to `systemClock`) and delegates everything else to the core.

## Behavior preserved

The refactor is behavior-preserving. Notable existing quirks are intentionally
kept, documented, and pinned by tests:

- Age only counts **beyond** 30 whole days (`ageDays > 30`), so day 30 adds
  nothing and day 31 adds 15.5.
- `urgent` drives priority but is **not** an accepted input status in
  `validate` — the two methods use different status vocabularies.
- A missing, future, or unparseable `createdAt` contributes no age score
  rather than throwing.
- An empty-string status passes validation (treated as "no status").

`tests/services/item-service.test.ts` includes the original algorithm inline
and asserts the refactored service matches it across representative inputs.

## Why it is easier to work with

- Scoring is testable without mocking global time; tests inject a fixed clock.
- Thresholds, weights, and valid statuses are discoverable, named constants.
- Each concern can change independently, and the adapter's public API is a
  stable seam for callers (API route, components).

## Tests

- `tests/services/item/priority.test.ts` — scoring and classification,
  including threshold boundaries and bad/future dates.
- `tests/services/item/validation.test.ts` — all rules, multi-error output,
  and input immutability.
- `tests/services/item-service.test.ts` — the adapter, clock injection, and
  behavior-preservation check against the original algorithm.
- `tests/items.test.ts` — the pre-existing test, still green against the
  unchanged public API.

Run with `npm test`. Jest is configured via `jest.config.js` using
`next/jest`, which applies the SWC transform and the `@/*` path alias from
`tsconfig.json`.
