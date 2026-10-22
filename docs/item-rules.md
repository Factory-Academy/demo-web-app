# Item rules (pure core + thin adapter)

A small, dependency-free core for the two pieces of item business logic —
**priority scoring** and **input validation** — plus a thin adapter that wires
in the wall clock. The core lives in `src/lib/item-rules/`; the adapter is the
existing `ItemService` in `src/services/item-service.ts`.

## Why

`ItemService` previously tangled several concerns into one class:

- it read the wall clock directly (`Date.now()`), so priority could not be
  tested without mocking globals;
- scoring, score-to-level classification, and validation rules were all inlined
  as magic numbers and literal arrays;
- the two responsibilities (priority, validation) shared a class but nothing
  else, and their rule sets had quietly drifted apart.

Splitting a pure core from a thin adapter fixes all of this without changing
behavior or the public API.

## Layout

| File | Responsibility |
|---|---|
| `src/lib/item-rules/priority.ts` | `ageInDays`, `scorePriority`, `classifyPriority`, `computePriority` — all take the clock as an argument |
| `src/lib/item-rules/validation.ts` | `requireName`, `validStatus`, the `ITEM_VALIDATION_RULES` set, and `validateItem` |
| `src/lib/item-rules/index.ts` | Public barrel exports |
| `src/services/item-service.ts` | `ItemService` adapter: owns the real clock, delegates to the core |

## Design

**Pure core.** Every function is referentially transparent. Priority takes the
current time as an explicit `now` (epoch ms) rather than calling `Date.now()`,
so the same inputs always produce the same output. Scoring is split into three
composable steps — `record → score → level` — each independently testable, with
the thresholds and weights named as exported constants. Validation is a list of
small rules (`data → string | null`) aggregated by `validateItem`, which also
accepts a custom rule set.

**Thin adapter.** `ItemService` keeps the same public methods
(`calculatePriority`, `validate`) and the same `new ItemService()` constructor.
Its only job is to supply the one impure dependency — the clock — and forward to
the core. A `now` option makes even the adapter deterministic in tests:

```ts
const service = new ItemService({ now: () => Date.UTC(2024, 5, 1) })
service.calculatePriority(record) // deterministic
```

## Behavior preserved

The refactor is behavior-neutral. In particular:

- **Score formula** is unchanged: `+50` for `status === 'urgent'`, plus
  `0.5 × ageDays` only when `ageDays > 30` (strictly greater).
- **Level thresholds** are unchanged: `>= 80` critical, `>= 50` high,
  `>= 20` medium, else low.
- **Validation** still requires a non-blank `name` and, if a `status` is
  supplied, restricts it to `active` / `pending` / `completed`, pushing the same
  messages in the same order.

Note the pre-existing quirk, preserved intentionally: `urgent` drives priority
but is **not** an accepted status for `validate`. The split now makes that
divergence visible (`URGENT_STATUS` in `priority.ts` vs. `ALLOWED_STATUSES` in
`validation.ts`) rather than burying it.

## Edge cases handled

- **Unparseable `createdAt`** → `ageInDays` returns `NaN`; the `> 30` guard is
  `false` for `NaN`, so a bad timestamp contributes no age score (same as
  before).
- **Partial days** are floored.
- **Future `createdAt`** yields a negative age, which never exceeds the
  threshold and so adds nothing.
- **Blank / whitespace-only name** fails `requireName` (via `trim()`).
- **Absent or empty status** is accepted by `validStatus`; only a *supplied*
  unknown status is rejected.

## Testing

Tests mirror the source under `tests/item-rules/`:

- `priority.test.ts` — the pure scoring pipeline and its boundaries, driven by a
  fixed `NOW` so no clock is mocked.
- `validation.test.ts` — each rule in isolation plus the aggregator, including a
  custom rule set.
- `item-service.test.ts` — the adapter delegates correctly and honors the
  injected clock.

They run under Jest with `ts-jest` (`jest.config.js`); the `@/*` alias is
mirrored in `moduleNameMapper`. Static type-checking is separate
(`npx tsc --noEmit`).
