# Data-transform fixes: item priority & validation

## Summary

The item data-transform path (`ItemService.calculatePriority` and
`ItemService.validate`) mishandled empty, malformed, and oversized inputs. The
logic has been refactored into small, independently testable pure functions
under `src/services/transform/`, with defensive handling added throughout.
`ItemService` is now a thin facade over that module, so its public API is
unchanged.

## Edge-case bugs that were fixed

1. **`NaN` leaking from bad timestamps.**
   `calculatePriority` did `new Date(record.createdAt).getTime()` directly. For
   an empty string, a missing field, or a garbage value this produced
   `Invalid Date`, so `ageMs` and `ageDays` became `NaN`. The `NaN > 30` guard
   silently evaluated to `false`, which masked the problem for the age bonus but
   left the score computation unreliable for any future arithmetic.
   Now `parseTimestamp` rejects unparseable values and `computeAgeInDays`
   returns `0` instead of `NaN`.

2. **`TypeError` on non-string names.**
   `validate` called `data.name?.trim()`. Optional chaining guards `null` and
   `undefined` but not wrong types, so a numeric or object `name` (easy to send
   through an untyped JSON body) threw `data.name.trim is not a function` and
   crashed the request. `validateName` now type-checks before calling string
   methods and returns a validation error instead.

3. **Unbounded inputs.**
   There were no length limits on `name` or `description`, and no clamp on the
   age bonus. A far-past or garbage timestamp could drive the age score
   arbitrarily high, and arbitrarily long strings were accepted. Length limits
   (`MAX_NAME_LENGTH`, `MAX_DESCRIPTION_LENGTH`) and an age clamp
   (`MAX_AGE_DAYS`) now bound these.

4. **Null / non-object records.**
   `calculatePriority` and `validate` assumed they received an object. They now
   return a safe default (`'low'` / an "Item data is required" error) for
   `null`, `undefined`, and non-object input.

## Structure

| File | Responsibility |
|---|---|
| `src/services/transform/constants.ts` | Shared thresholds, weights, and limits |
| `src/services/transform/dates.ts` | `parseTimestamp`, `computeAgeInDays` |
| `src/services/transform/priority.ts` | `scoreFromStatus`, `scoreFromAge`, `scoreToLevel`, `calculatePriority(ies)` |
| `src/services/transform/validation.ts` | Per-field validators + `validateItem` |
| `src/services/transform/index.ts` | Barrel export |
| `src/services/item-service.ts` | Thin facade (unchanged public API) |

A new `calculatePriorities` batch helper tolerates malformed entries element by
element and returns `[]` for empty or non-array input.

## Behavior compatibility

Scoring for well-formed records is unchanged: `urgent` adds 50, records older
than 30 days add `0.5` per day, and the thresholds remain
`critical ≥ 80`, `high ≥ 50`, `medium ≥ 20`, else `low`. `validate` still
reports `Name is required` and `Invalid status` for the same inputs as before;
the new checks only add coverage for cases that previously crashed or were
silently accepted.

## Tests

Regression coverage lives in `tests/transform/`:

- `dates.test.ts` — timestamp parsing and age edge cases
- `priority.test.ts` — status/age scoring, level mapping, batch handling, large input
- `validation.test.ts` — per-field and whole-item validation, including the non-string regression
- `item-service.test.ts` — facade delegation and no-throw guarantees

A `jest.config.js` (ts-jest preset + `@/` path mapping) was added so the suite
runs with `npm test`. Run a focused file with
`npx jest tests/transform/priority.test.ts`.
