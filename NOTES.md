# Feature Flag System

## Overview

This project now includes a lightweight, environment-driven feature flag system. Feature flags allow you to toggle features on or off without code changes, making it easy to control feature rollout, A/B testing, and environment-specific behavior.

## Architecture

The feature flag system is built around three core components:

1. **Interface** (`IFeatureFlagProvider`): Defines the contract for feature flag evaluation
2. **Implementation** (`EnvFeatureFlagProvider`): Reads flags from environment variables
3. **Integration**: Services accept the interface as a dependency for testability

## Usage

### Basic Usage

Set environment variables with the prefix `FEATURE_FLAG_`:

```bash
# Enable a feature
export FEATURE_FLAG_ENHANCED_VALIDATION=true

# Disable a feature
export FEATURE_FLAG_BETA_FEATURES=false
```

Use the default feature flag provider in your code:

```typescript
import { featureFlags } from '@/services/feature-flags'

// Check if a feature is enabled (defaults to false if not set)
if (featureFlags.isEnabled('enhanced_validation')) {
  // Use enhanced validation logic
}

// Check with a custom default
if (featureFlags.isEnabledWithDefault('experimental_ui', true)) {
  // Experimental UI is enabled by default
}
```

### Advanced Usage

#### Custom Prefix

Create a provider with a custom environment variable prefix:

```typescript
import { EnvFeatureFlagProvider } from '@/services/feature-flags'

const customFlags = new EnvFeatureFlagProvider('APP_FEATURE_')
// Now reads from APP_FEATURE_* environment variables
```

#### Dependency Injection

Services accept the feature flag provider as a constructor parameter for better testability:

```typescript
import { ItemService } from '@/services/item-service'
import { featureFlags } from '@/services/feature-flags'

// Use default provider
const service1 = new ItemService()

// Use custom provider
const service2 = new ItemService(featureFlags)
```

#### Get All Flags

Retrieve all configured feature flags:

```typescript
const allFlags = featureFlags.getAllFlags()
console.log(allFlags)
// Output: { enhanced_validation: true, beta_features: false }
```

## Environment Variable Format

Feature flags accept various truthy/falsy values:

**Truthy values** (case-insensitive):
- `true`
- `1`
- `yes`
- `on`

**Falsy values** (case-insensitive):
- `false`
- `0`
- `no`
- `off`

Any other value is treated as `false`.

## Testing

### Mock Provider

Use a mock provider in tests for predictable behavior:

```typescript
import { IFeatureFlagProvider } from '@/models/feature-flag'

class MockFeatureFlagProvider implements IFeatureFlagProvider {
  private flags = new Map<string, boolean>()

  setFlag(key: string, value: boolean) {
    this.flags.set(key, value)
  }

  isEnabled(key: string): boolean {
    return this.flags.get(key) || false
  }

  // ... implement other methods
}

// In your test
const mockFlags = new MockFeatureFlagProvider()
mockFlags.setFlag('my_feature', true)
const service = new ItemService(mockFlags)
```

### Integration Testing

Test with actual environment variables:

```typescript
describe('with feature flags', () => {
  beforeEach(() => {
    process.env.FEATURE_FLAG_TEST_FEATURE = 'true'
  })

  test('uses feature when enabled', () => {
    const provider = new EnvFeatureFlagProvider()
    expect(provider.isEnabled('test_feature')).toBe(true)
  })
})
```

## Real-World Example

The `ItemService` uses feature flags to conditionally enable enhanced validation:

```typescript
// src/services/item-service.ts
export class ItemService {
  private readonly flags: IFeatureFlagProvider

  constructor(flags?: IFeatureFlagProvider) {
    this.flags = flags || featureFlags
  }

  validate(data: Partial<Item>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Always run basic validation
    if (!data.name?.trim()) {
      errors.push('Name is required')
    }
    
    // Conditionally apply enhanced rules
    if (this.flags.isEnabled('enhanced_validation')) {
      if (data.name && data.name.trim().length < 3) {
        errors.push('Name must be at least 3 characters')
      }
    }
    
    return { valid: errors.length === 0, errors }
  }
}
```

## Best Practices

1. **Default to off**: Feature flags should default to `false` for safety
2. **Meaningful names**: Use descriptive snake_case names (e.g., `enhanced_validation`, not `flag1`)
3. **Document flags**: Comment the purpose and expected behavior when using flags
4. **Remove old flags**: Clean up flags once features are fully rolled out
5. **Test both paths**: Write tests for both enabled and disabled states
6. **Inject dependencies**: Accept the interface in constructors for testability

## Files Modified/Created

- `src/models/feature-flag.ts` - Interface definitions
- `src/services/feature-flags.ts` - Implementation
- `src/services/item-service.ts` - Integration example
- `tests/feature-flags.test.ts` - Feature flag tests
- `tests/items.test.ts` - Updated with feature flag testing
- `NOTES.md` - This documentation

## Future Enhancements

Possible extensions to consider:

- Remote flag configuration (database, API, etc.)
- User-based targeting (enable for specific users)
- Percentage rollouts (enable for X% of traffic)
- Flag analytics and usage tracking
- Admin UI for managing flags
