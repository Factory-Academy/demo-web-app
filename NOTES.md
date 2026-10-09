# Feature Flags Guide

This project includes a simple, environment-driven feature-flag system for toggling features on and off without requiring code changes or redeployment.

## Quick Start

### Enabling a Feature Flag

Set an environment variable with the prefix `NEXT_PUBLIC_FEATURE_` followed by the flag name:

```bash
# Enable the advanced priority calculation feature
export NEXT_PUBLIC_FEATURE_ADVANCED_PRIORITY=true

npm run dev
```

### Using in Code

Import the `featureFlags` singleton and check flags:

```typescript
import { featureFlags } from '@/services/feature-flags'

if (featureFlags.isEnabled('advanced_priority')) {
  // Run feature-specific logic
}
```

## API Reference

### `featureFlags.isEnabled(flagName: string): boolean`

Check if a feature flag is enabled. Returns `false` if the flag does not exist.

**Arguments:**
- `flagName` (string): The flag name without the `NEXT_PUBLIC_FEATURE_` prefix. Case-insensitive.

**Returns:** `boolean` - `true` if enabled, `false` otherwise.

```typescript
// These are all equivalent:
featureFlags.isEnabled('advanced_priority')
featureFlags.isEnabled('ADVANCED_PRIORITY')
featureFlags.isEnabled('Advanced_Priority')
```

### `featureFlags.getEnabledFlags(): string[]`

Get a list of all currently enabled flags (for debugging/monitoring).

```typescript
const enabledFlags = featureFlags.getEnabledFlags()
console.log('Active features:', enabledFlags)
// Output: ['advanced_priority', 'experimental_ui']
```

### `featureFlags.getAllFlags(): FeatureFlagConfig`

Get all loaded flags with their current values (for debugging).

```typescript
const allFlags = featureFlags.getAllFlags()
console.log(allFlags)
// Output: { advanced_priority: true, beta_mode: false, ... }
```

## Current Flags

### `advanced_priority`

**Status:** Implemented  
**Location:** `src/services/item-service.ts`

Enables advanced priority calculation in `ItemService.calculatePriority()`:
- Reduces score by 30 points for completed items
- Adds 10 points for items with descriptions longer than 100 characters

**Example Usage:**
```bash
export NEXT_PUBLIC_FEATURE_ADVANCED_PRIORITY=true
npm run dev
```

## Boolean String Values

The feature-flag system accepts various boolean string formats:

| Value | Interpreted As |
|-------|-----------------|
| `true` | ✓ Enabled |
| `1` | ✓ Enabled |
| `yes` | ✓ Enabled |
| `on` | ✓ Enabled |
| `false` | ✗ Disabled |
| `0` | ✗ Disabled |
| `no` | ✗ Disabled |
| `off` | ✗ Disabled |
| (empty) | ✗ Disabled |

## Implementation Details

### Flag Naming Convention

- **Prefix:** `NEXT_PUBLIC_FEATURE_`
- **Format:** `NEXT_PUBLIC_FEATURE_<FLAG_NAME>`
- **Case:** Converted to lowercase internally; matching is case-insensitive

### Server-Side vs. Client-Side

- **Server-side:** Flags are read from `process.env` during module initialization
- **Client-side:** Support for browser-side flags can be added by parsing `__NEXT_DATA__` or similar Next.js mechanisms

### Architecture

The feature-flag system is implemented as a singleton in `src/services/feature-flags.ts`:

```
FeatureFlags class
├── Loads all NEXT_PUBLIC_FEATURE_* env vars at instantiation
├── Stores flags in internal object (normalized to lowercase)
├── Provides public API for checking flag status
└── Supports debugging/inspection methods
```

## Testing

Feature flags are fully tested. Run tests with:

```bash
npm run test -- feature-flags.test.ts     # Feature flag unit tests
npm run test -- items.test.ts             # ItemService integration tests
```

### Test Coverage

- **Flag loading:** Correctly filters and parses NEXT_PUBLIC_FEATURE_* vars
- **Boolean parsing:** Handles various string representations of true/false
- **Case insensitivity:** Flag names are case-insensitive
- **Isolation:** Each test gets a fresh flag instance
- **Integration:** ItemService correctly uses flags to modify behavior

## Adding New Flags

1. **Define the flag** in your feature module or service:
   ```typescript
   if (featureFlags.isEnabled('my_new_feature')) {
     // Feature logic here
   }
   ```

2. **Enable locally** for testing:
   ```bash
   export NEXT_PUBLIC_FEATURE_MY_NEW_FEATURE=true
   npm run dev
   ```

3. **Add tests** to verify the feature works correctly both with and without the flag

4. **Document** the flag in this file under "Current Flags" section

## Best Practices

- **Use descriptive names:** `advanced_priority` is better than `new_calc`
- **Test both states:** Always test your feature with the flag enabled and disabled
- **Keep it simple:** Use for gradual rollouts and A/B testing, not complex logic
- **Clean up:** Remove flags once features are stable and universally enabled
- **Document:** Add new flags to the "Current Flags" section above with status and location
