# Feature Flag System

A lightweight, environment-driven feature flag helper for controlling feature rollouts and A/B testing.

## Overview

The feature flag system provides:
- **Interface-based design** (`IFeatureFlagProvider`) for pluggable implementations
- **Environment variable integration** via `EnvFeatureFlagProvider`
- **Boolean flags** for on/off features
- **Percentage-based rollouts** for gradual feature launches
- **Type-safe service layer** with convenience methods

## Quick Start

### 1. Define a Feature Flag

Set an environment variable with the prefix `FEATURE_FLAG_`:

```bash
# Boolean flag (on/off)
export FEATURE_FLAG_ENHANCED_PRIORITY=true

# Percentage-based rollout
export FEATURE_FLAG_NEW_UI_PERCENT=25
```

### 2. Check the Flag in Code

```typescript
import { FeatureFlagService } from '@/services/feature-flags'

const flags = new FeatureFlagService()

// Check a boolean flag
if (flags.isEnabled('ENHANCED_PRIORITY')) {
  // Use new feature
}

// Check percentage rollout
const rollout = flags.getRollout('NEW_UI')
if (rollout >= 50) {
  // Show to 50%+ of users
}
```

## Architecture

### Interface (`IFeatureFlagProvider`)

Defines the contract for feature flag providers:

```typescript
interface IFeatureFlagProvider {
  isEnabled(flagName: string): boolean
  getRolloutPercentage(flagName: string): number | undefined
}
```

### Environment Provider (`EnvFeatureFlagProvider`)

Reads flags from `process.env`:

- **Boolean flags**: `FEATURE_FLAG_{NAME}=true|false|1|0`
- **Percentage flags**: `FEATURE_FLAG_{NAME}_PERCENT=0-100`

### Service Layer (`FeatureFlagService`)

Wraps the provider with convenience methods and defaults:

```typescript
class FeatureFlagService {
  isEnabled(flagName: string): boolean
  getRollout(flagName: string): number
  isEnhancedPriorityEnabled(): boolean  // Typed helper
}
```

## Integration Example

The `ItemService` demonstrates feature flag integration:

```typescript
import { FeatureFlagService } from './feature-flags'

export class ItemService {
  private featureFlags: FeatureFlagService

  constructor(featureFlags?: FeatureFlagService) {
    this.featureFlags = featureFlags ?? new FeatureFlagService()
  }

  calculatePriority(record: Item): Priority {
    if (this.featureFlags.isEnhancedPriorityEnabled()) {
      return this.calculateEnhancedPriority(record)
    }
    // Standard logic
  }
}
```

**Benefits**:
- Services accept optional `FeatureFlagService` for dependency injection
- Defaults to environment-based flags in production
- Easy to mock in tests

## Testing

### Test with Custom Provider

```typescript
import { FeatureFlagService, IFeatureFlagProvider } from '@/services/feature-flags'

const mockProvider: IFeatureFlagProvider = {
  isEnabled: jest.fn().mockReturnValue(true),
  getRolloutPercentage: jest.fn().mockReturnValue(50)
}

const flags = new FeatureFlagService(mockProvider)
const service = new ItemService(flags)

// Test with feature enabled
expect(service.calculatePriority(item)).toBe('high')
```

### Test with Environment Variables

```typescript
process.env.FEATURE_FLAG_ENHANCED_PRIORITY = 'true'
const service = new ItemService()
// Feature is now enabled
```

## Environment Variable Reference

| Variable | Type | Values | Description |
|----------|------|--------|-------------|
| `FEATURE_FLAG_ENHANCED_PRIORITY` | Boolean | `true`, `false`, `1`, `0` | Enhanced priority calculation |
| `FEATURE_FLAG_{NAME}` | Boolean | `true`, `false`, `1`, `0` | Generic boolean flag |
| `FEATURE_FLAG_{NAME}_PERCENT` | Number | `0-100` | Percentage-based rollout |

**Notes**:
- Values are case-insensitive (`TRUE` = `true`)
- Whitespace is trimmed
- Invalid or missing values default to `false` or `undefined`
- Percentage values outside 0-100 return `undefined`

## Best Practices

### 1. Use Typed Helpers

Add convenience methods to `FeatureFlagService` for common flags:

```typescript
class FeatureFlagService {
  isNewDashboardEnabled(): boolean {
    return this.provider.isEnabled('NEW_DASHBOARD')
  }
}
```

### 2. Inject Dependencies

Pass `FeatureFlagService` to constructors for testability:

```typescript
export class MyService {
  constructor(private flags: FeatureFlagService) {}
}
```

### 3. Document Feature Flags

Add JSDoc comments explaining what each flag controls:

```typescript
/**
 * Check if enhanced priority calculation is enabled.
 * Flag: FEATURE_FLAG_ENHANCED_PRIORITY
 * 
 * When enabled, uses logarithmic age decay and improved status scoring.
 */
isEnhancedPriorityEnabled(): boolean
```

### 4. Clean Up Old Flags

Remove feature flag checks once a feature is fully rolled out:

1. Set flag to `true` in all environments
2. Verify stability
3. Remove conditional logic and the old code path
4. Delete the flag from documentation

## Future Enhancements

Potential extensions:

- **Remote config provider**: Fetch flags from a config service
- **User-based targeting**: Enable features for specific user IDs
- **Time-based flags**: Auto-enable/disable at specific times
- **Metrics integration**: Track feature usage and performance
- **Admin UI**: Manage flags without redeploying

## Files

| File | Purpose |
|------|---------|
| `src/services/feature-flags.ts` | Core implementation (interface, provider, service) |
| `tests/feature-flags.test.ts` | Comprehensive unit tests |
| `src/services/item-service.ts` | Integration example |
| `tests/items.test.ts` | Integration tests |
| `NOTES.md` | This documentation |
