# Pluggable priority strategies — design notes

A small spike that turns the hard-coded `ItemService.calculatePriority` into a
pluggable strategy: one interface, two implementations, selected through a
factory. It lives in `src/lib/priority/` and is wired into
`src/services/item-service.ts`.

## Why

Priority scoring is exactly the kind of rule that changes often and differs by
team or deployment. Baking one formula into `ItemService` means every tweak
edits the service, re-tests the service, and risks regressions elsewhere.
Extracting the rule behind an interface lets the algorithm vary independently
of the code that consumes a priority level.

## Layout

| File | Responsibility |
|---|---|
| `types.ts` | `PriorityLevel`, `ScoringContext`, `PriorityResult`, and the `PriorityStrategy` interface |
| `age.ts` | `ageInDays()` — shared, defensive age math (bad/future dates → `0`) |
| `weighted-strategy.ts` | `WeightedScoreStrategy` — additive points bucketed by thresholds |
| `threshold-strategy.ts` | `ThresholdStrategy` — ordered rule table, first match wins |
| `factory.ts` | `createPriorityStrategy()` + a registry (`registerPriorityStrategy`) |
| `index.ts` | Public barrel exports |

## The interface

```ts
interface PriorityStrategy {
  readonly name: string
  score(item: Item, context?: ScoringContext): PriorityResult
}
```

`score` returns a `PriorityResult` (`level`, numeric `score`, and `reasons`),
not just a bare level. The extra detail is cheap to produce and makes the
decision explainable; `ItemService.calculatePriority` still returns only the
level, so existing callers are untouched.

The clock is passed in via `ScoringContext.now` rather than read from
`Date.now()` inside a strategy. That one choice makes all aging-based scoring
deterministic under test with no fake timers.

## The two approaches, weighed

### Weighted additive score (`weighted`, the default)

Each signal contributes points; the total is bucketed against thresholds. This
is the original algorithm, preserved exactly by the default options
(`urgentBonus: 50`, aging past 30 days at `0.5`/day, thresholds `80/50/20`).

- **Pros:** signals compose naturally — adding a new factor is "add more
  points"; one number captures "how urgent"; easy to nudge by changing a
  weight.
- **Cons:** thresholds and weights are coupled, so adding a signal usually
  forces re-tuning the cutoffs; the final number is opaque (why 73?); two
  different signal mixes can collide on the same score.

### Threshold rule table (`threshold`)

An ordered list of predicates; the first match wins. No intermediate number —
the mapping from signals to level is written out explicitly.

- **Pros:** reads like a spec and is trivial to audit ("urgent and older than
  30 days → critical"); each rule is independent; no cutoff tuning.
- **Cons:** rules grow combinatorially as signals interact; ordering is
  load-bearing and easy to get subtly wrong; no natural notion of "how close"
  an item was to the next level.

### Verdict

Keep `weighted` as the default because it is behaviour-compatible and composes
well for a handful of numeric signals. Reach for `threshold` when the policy is
genuinely categorical and must be human-auditable (e.g. compliance/SLA rules).
The point of the spike is that this choice is now a one-line swap, per call
site, with no change to `ItemService`.

## The factory

`createPriorityStrategy(kind, options?)` builds a strategy by name. It is
backed by a module-level registry, which is what makes it *pluggable*: callers
can `registerPriorityStrategy('my-kind', builder)` and build their own strategy
through the same entry point as the built-ins. Overloads give precise option
typing for `weighted` and `threshold`; unknown kinds throw a `RangeError`
listing what is available (consistent with the `RangeError` validation style in
`src/lib/resilience/`).

```ts
const service = new ItemService({
  priorityStrategy: createPriorityStrategy('threshold'),
})
```

## Edge cases handled

- **Bad/empty `createdAt`** → age `0` (matches the legacy behaviour of silently
  skipping the aging term when the date math was `NaN`).
- **Future `createdAt`** (clock skew) → clamped to age `0` instead of negative.
- **Boundary semantics** are strictly-greater-than for aging, so exactly 30
  days does not trip the 30-day rule — preserved from the original and pinned
  by tests.
- **Option validation:** misordered weighted thresholds, a negative aging
  threshold, an empty rule set, and an empty registry key all throw
  `RangeError`.
- **Backwards compatibility:** `new ItemService()` and
  `calculatePriority(item)` behave exactly as before.

## Testing

Tests live in `tests/priority/` and run under Jest with `ts-jest`
(`diagnostics: false`), mirroring the existing suite. The injected `now` clock
keeps every aging assertion deterministic without real or fake timers. Coverage
spans the age helper, both strategies (including custom options and validation),
the factory/registry, and the `ItemService` integration — including a case
where the two strategies are shown to agree and where they can diverge.
