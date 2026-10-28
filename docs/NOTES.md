# Data-transform edge-case fixes

This note records the diagnosis and refactor of the item data-transform path
(priority scoring, validation, and input normalization).

## The bug class

The original `ItemService` concentrated two helpers in one file and assumed
clean, well-formed input. Several edge cases broke silently:

1. **Malformed / missing timestamps poisoned scoring.**
   `calculatePriority` did `Date.now() - new Date(record.createdAt).getTime()`.
   An unparseable `createdAt` produced `NaN`, every threshold comparison then
   failed, and the function silently returned `'low'` — even for records marked
   `urgent`.
2. **Future timestamps produced negative ages**, which were never intended and
   were never clamped.
3. **Absurd timestamps (e.g. year 9999) produced unbounded scores** with no
   upper bound.
4. **`null` / `undefined` records threw** instead of degrading gracefully.
5. **Status inconsistency.** `calculatePriority` granted an urgent bonus for
   `status === 'urgent'`, but `validate` only allowed `active | pending |
   completed`. A record could therefore never be *legitimately* urgent: the
   scoring path rewarded a value the validation path rejected.
6. **No bounds on string inputs.** `name` / `description` were never checked for
   type or length, so oversized or non-string payloads flowed straight through.

## The fix

The helper was split into small, pure, independently testable functions across
focused modules. `ItemService` is now a thin facade so its public API is
unchanged.

| Module | Responsibility |
|---|---|
| `src/services/priority.ts` | `parseTimestamp`, `computeAgeInDays`, `computeAgeScore`, `computeBaseScore`, `scoreToPriority`, `calculatePriority` |
| `src/services/validation.ts` | `validateName`, `validateStatus`, `validateDescription`, `validateItem`, `isValidStatus` |
| `src/services/item-transform.ts` | `toSafeString`, `normalizeStatus`, `normalizeTimestamp`, `normalizeItem` |
| `src/services/item-service.ts` | Facade delegating to the modules above |

Defensive behavior added:

- Unparseable timestamps resolve to an age of `0` instead of `NaN`.
- Age is clamped to `[0, MAX_AGE_DAYS]` (future dates → `0`, absurd dates → cap).
- `null` / `undefined` records and data are tolerated, not thrown on.
- `'urgent'` is now a valid status, reconciling scoring and validation.
- `name` / `description` are type- and length-checked; `normalizeItem`
  truncates oversized strings rather than discarding an otherwise usable record.
- The `POST /api/items` handler normalizes and validates the untrusted body,
  and returns `400` for invalid JSON or invalid records.

`Date.now()` is injectable (`now` parameter) throughout the scoring and
normalization code so tests are deterministic without mocking the clock.

## Tests

- `tests/priority.test.ts` — timestamp parsing, age clamping, scoring buckets,
  and the malformed-timestamp regressions.
- `tests/validation.test.ts` — per-field rules, the `urgent` reconciliation,
  and error aggregation.
- `tests/item-transform.test.ts` — empty / malformed / oversized normalization.
- `tests/items.test.ts` — the original `ItemService` cases plus facade-level
  null-tolerance and normalize-then-validate round trips.

`jest.config.js` uses `next/jest` so TS/TSX transform and the `@/*` path alias
resolve the same way they do in the app.

## Follow-up: tightening the instant + string edges (review feedback)

Review of the first pass surfaced two edge cases the original fix still let
through, both in the same "a malformed field poisons the transform" family:

1. **Finite-but-unrepresentable numeric timestamps crashed normalization.**
   `parseTimestamp` only checked `Number.isFinite`, so a value like `1e300`
   passed through, and `new Date(1e300).toISOString()` throws a `RangeError`.
   A single bad epoch number in a `POST /api/items` body would therefore turn
   a 400-worthy record into a 500.
2. **String truncation split surrogate pairs.** `toSafeString` sliced on UTF-16
   code units, so an oversized value ending in an astral codepoint (emoji, etc.)
   left a lone high surrogate — a corrupted trailing character.

### What changed

- Added `src/services/time.ts` as the single source of truth for instants:
  `MS_PER_DAY`, `MAX_TIMESTAMP_MS`, `isValidInstant`, `parseInstant`, and a
  non-throwing `toIsoString`. `parseInstant` rejects finite numbers outside the
  representable `Date` range in addition to `NaN`/`Infinity`.
- `priority.ts` now imports `MS_PER_DAY` and re-exports `parseTimestamp` from
  the shared module, so scoring and normalization agree on what a usable
  timestamp is. The public API is unchanged.
- `item-transform.ts` converts timestamps via `toIsoString` (falling back
  instead of throwing) and truncates strings without orphaning a surrogate,
  re-trimming whitespace exposed by the cut.

### Tests

- `tests/time.test.ts` — range validation, `parseInstant`, and the
  non-throwing `toIsoString`.
- Extended `tests/priority.test.ts` (out-of-range numbers → `null` / age `0`)
  and `tests/item-transform.test.ts` (surrogate-safe truncation, out-of-range
  timestamp falls back without throwing).
