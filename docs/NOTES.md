---
layout: default
title: Priority Strategy Spike
---

# Design notes: pluggable priority strategies

Spike to explore making `ItemService.calculatePriority` pluggable instead of a
single hard-coded formula. The goal is to be able to swap scoring policies (per
tenant, per experiment, per demo persona) without touching the service.

## Shape

```
src/services/priority/
  types.ts                     PriorityStrategy interface, PriorityLevel, context
  level.ts                     shared score -> level mapping (one meaning of "critical")
  age.ts                       safe age-in-days helper
  age-weighted-strategy.ts     implementation #1 (original behaviour)
  status-weighted-strategy.ts  implementation #2 (status-first)
  factory.ts                   createPriorityStrategy(key) + registry
  index.ts                     barrel
```

A strategy returns a numeric **score**; a single shared table
(`scoreToLevel`) turns the score into a `PriorityLevel`. Splitting "how do we
score" from "where are the thresholds" means every strategy agrees on what
`critical` means, and the bands can be tuned in one place.

`ItemService` now takes a strategy (key or instance) in its constructor and
delegates. The default is `age-weighted`, which reproduces the previous output
exactly, so existing callers are unaffected.

## Two implementations, weighed

**Age-weighted** (default). Urgent records get a flat boost; records older than
30 days accrue weight linearly with age. This is the behaviour that shipped
before the spike.

- Good when staleness is itself the problem (aging backlogs, SLA breaches).
- Weakness: an old-enough record can outrank a freshly-flagged urgent one, and
  the score is unbounded, so "critical" can be reached purely by sitting around.

**Status-weighted**. Status sets the baseline (urgent > pending > active >
completed); age is only a bounded tie-breaker (capped at +25).

- Good when declared state is the signal of record and age should only break
  ties among equals.
- Weakness: needs a maintained status->weight table and a sensible default for
  unknown statuses; it is less sensitive to genuinely ancient items.

## Why a factory

The factory (a small key->constructor registry) keeps call sites declarative:
config or a request carries a string key, the factory resolves it, and callers
never import concrete classes. Alternatives considered:

- **Direct instantiation** — simplest, but every call site must know the
  concrete classes and a config-driven choice turns into a `switch` that gets
  copy-pasted.
- **DI container** — overkill for two stateless strategies in a template app.
- **Plain function strategies** (`(item, ctx) => number`) — lighter than
  classes, but the class form carries `key`/`label` for logging and UI and
  reads consistently with the existing `ItemService` class.

The registry is the pragmatic middle: one place to add a strategy, string keys
that survive serialization, and an `availableStrategies()` helper for UIs.

## Edge cases handled

- Unparseable or future `createdAt` contributes 0 age rather than `NaN` or a
  negative score (`age.ts`).
- Non-finite or negative scores normalize to the lowest band (`level.ts`).
- Unknown status falls back to a default weight instead of scoring `undefined`.
- Unknown strategy key throws a clear error from the factory.
- `calculatePriority` accepts an injected `now` so age-based scoring is
  deterministic under test.

## Trade-offs / follow-ups

- Scores are not normalized to a fixed 0–100 range across strategies; the
  shared thresholds assume roughly comparable scales. A real system would pin a
  contract (e.g. every strategy returns 0–100) and test it.
- Strategy selection is global per `ItemService` instance; per-record or
  per-tenant selection would need the key threaded through the call.
- Thresholds live in code. If product wants to tune bands at runtime, lift
  `PRIORITY_THRESHOLDS` into config.
