---
layout: default
title: Architecture Notes
---
# Architecture Notes

## Item Module Data Flow

The Item module follows a simple layered architecture with clear separation of concerns.

### Flow Overview

```
Client → API Route → In-Memory Store
  ↓         ↓
  ↓    ItemService (validation, priority)
  ↓         ↓
ItemList ← appConfig (typed constants)
```

### Layers

| Layer | Files | Responsibility |
|---|---|---|
| **Model** | `models/item.ts` | Type definitions (`Item`, `ItemCreate`) |
| **API** | `app/api/items/route.ts` | REST handlers (GET, POST), timestamp injection |
| **Service** | `services/item-service.ts` | Business logic (priority scoring, validation) |
| **Config** | `config/app-config.ts` | Typed constants (statuses, thresholds) |
| **UI** | `components/item-list.tsx` | Presentation with optional compact mode |

### Key Operations

**Create**: Client POST → API assigns `id`, `createdAt`, `updatedAt` → push to in-memory array → return 201

**Read**: Client GET → API returns full array → ItemList renders

**Validate**: Service checks name presence and status against `appConfig.validItemStatuses`

**Prioritize**: Service calculates score from age + status, maps to priority level via thresholds

### Configuration Dependency

ItemService relies on `appConfig` for all magic numbers:
- Age thresholds (30 days)
- Score multipliers (0.5x per day)
- Priority cutoffs (80/50/20)
- Valid status values

This centralization replaced scattered literals across the codebase (see commit `18723ab`).
