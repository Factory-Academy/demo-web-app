# Design Notes: Pluggable Priority Strategy

## Goal

Item priority was computed by a single hard-coded block inside
`ItemService.calculatePriority`. This spike extracts that logic into a small
**pluggable-strategy** module: one interface, two implementations, and a factory
that selects between them. `ItemService` now delegates to a strategy, and the
default strategy reproduces the original behaviour so the refactor is
behaviour-preserving.

## Shape of the module

```
src/models/priority-strategy.ts       Types + PriorityStrategy interface
src/services/priority-scoring.ts       Shared helpers (ageInDays, scoreToLevel)
src/services/priority-strategies.ts    StatusWeightedStrategy, AgeWeightedStrategy
src/services/priority-strategy-factory.ts  Factory + runtime registry
src/services/item-service.ts           Integration point (delegates to a strategy)
```

The `PriorityStrategy` interface is deliberately small:

```ts
interface PriorityStrategy {
  readonly name: string
  evaluate(item: PriorityInput, now?: Date): PriorityResult
}
```

Two decisions keep the strategies focused and comparable:

- **Score/level split.** A strategy only decides *how to score* an item. Turning
  a raw score into a `PriorityLevel` (`critical | high | medium | low`) lives in
  the shared `scoreToLevel`, so a "high" from one strategy means the same thing
  as a "high" from another.
- **Injected `now`.** Age calculations take an optional reference time, which
  keeps tests deterministic without mocking the clock.

`PriorityResult` also carries `score` and a `reasons[]` list so a caller can
explain *why* an item landed where it did (surfaced via
`ItemService.evaluatePriority`).

## The two implementations

| Strategy | How it scores | When it shines |
| --- | --- | --- |
| `status-weighted` (default) | `urgent` = +50; age only counts after a 30-day grace period (+0.5/day). Status dominates. | Triage where an explicit `urgent` label is the strongest signal. Matches legacy behaviour. |
| `age-weighted` | Age accrues linearly from day 0 (+2/day); `urgent` = +20, `pending` = +10. Age dominates. | Preventing backlog rot; surfacing stale items a status-first view buries. |

The same stale `pending` item that `age-weighted` rates `critical` stays low
under `status-weighted` (it only rewards `urgent`). That divergence is the whole
point of making the choice pluggable, and it is pinned down by a test.

## Why a factory (and a registry)

The factory (`createPriorityStrategy(kind)`) centralizes construction so callers
depend on a string kind, not concrete classes. It is backed by a mutable
`Map` registry with `registerPriorityStrategy` / `availableStrategies`, which
makes the module genuinely extensible: a new strategy can be added at runtime
without editing the factory. Unknown kinds throw an error that lists the
available kinds, which fails loudly and helpfully rather than silently falling
back.

Builders (`() => new Strategy()`) are stored rather than singletons, so each
`createPriorityStrategy` call returns a fresh, independent instance.

## Alternatives weighed

- **Leave the logic inline.** Simplest, but every new scheme means editing and
  re-testing `ItemService`, and A/B-ing two schemes is awkward. Rejected once a
  second scheme was in scope.
- **Config-driven weights on one class.** A single strategy parameterized by
  numbers covers linear tweaks, but not structurally different schemes (grace
  period vs. linear-from-zero, different status maps). The strategies here *are*
  parameterized (constructor args) so this is available *within* a strategy,
  while the interface still allows genuinely different algorithms.
- **Function strategies instead of classes.** A `type Strategy = (item, now) =>
  PriorityResult` would be lighter. Classes were chosen for parity with the
  existing service-class style, a stable `name`, and easy constructor-based
  configuration. The registry stores builders, so a plain function could still
  be adapted in later.
- **Enum-typed factory input.** `PriorityStrategyKind` documents the built-ins,
  but the factory accepts `string` so runtime-registered kinds work. The trade
  is losing exhaustive compile-time checking on the argument in exchange for
  real extensibility.

## Integration and compatibility

`ItemService` gained an optional second constructor argument:

```ts
new ItemService(flags?, priorityStrategy?)
```

Existing callers (`new ItemService()`, `new ItemService(mockFlags)`) are
unchanged and keep the legacy scoring because the default strategy is
`status-weighted`. The return type of `calculatePriority` is now the named
`PriorityLevel`, which is identical to the previous inline union.

## Edge cases handled

- Missing / unparseable / future `createdAt` all collapse to age `0` rather than
  `NaN` or negative ages that would corrupt a score.
- Missing `status` contributes nothing (no bonus, no crash).
- `status` is normalized (trimmed + lower-cased) before matching, so `'Urgent'`,
  `' urgent '`, and `'URGENT'` all score the same, and a blank/whitespace-only
  status collapses to "no status". Normalization lives in one shared helper
  (`normalizeStatus`) so every strategy matches tokens identically.
- Threshold boundaries (`>= 80/50/20`) are pinned by tests, including just-below
  values and negative / `NaN` scores mapping to `low`.
- Factory kinds are trimmed before lookup; empty/blank kinds are rejected on both
  register and create, unknown kinds throw with the list of valid kinds, and a
  builder that returns nothing throws rather than yielding an undefined strategy.

## Follow-up: review feedback

A reviewer flagged that status matching was case- and whitespace-sensitive:
records carrying `'Urgent'` or `' pending '` (common in real data) silently
missed their status bonus. The fix centralizes status normalization in
`normalizeStatus` (in `priority-scoring.ts`) and routes both strategies through
it, so matching is consistent and defined in exactly one place. The same pass
hardened the factory's input validation (empty/blank kinds and builders that
return nothing now fail loudly). Tests were extended to cover mixed-case and
padded statuses in both strategies, the shared helper directly, and the new
factory guards.

## Tests

- `tests/priority-scoring.test.ts` — age math and score→level boundaries.
- `tests/priority-strategies.test.ts` — both strategies, custom parameters, and
  the intentional divergence between them.
- `tests/priority-strategy-factory.test.ts` — defaults, dispatch, fresh
  instances, error on unknown kind, and runtime registration/override.
- `tests/items.test.ts` — `ItemService` default behaviour, strategy injection,
  and `evaluatePriority` output.

## Possible follow-ups

- An `sla-weighted` strategy keyed off a due date.
- Select the strategy from a feature flag (`ItemService` already takes a
  `IFeatureFlagProvider`) so the scheme is switchable per environment.
- Expose `reasons` in the API/UI to explain priority to end users.
