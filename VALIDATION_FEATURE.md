# Input Validation Module Feature

## Overview
Added a lightweight, schema-lite input validation module to the application and integrated it with the `/api/items` POST endpoint.

## Files Added/Modified

### New Files (4)
1. **src/models/validators.ts** - Core validation module
   - Provides composable validators (required, minLength, maxLength, oneOf, pattern, email, range, type)
   - Schema-based validation without external dependencies
   - Type-safe validation with TypeScript

2. **src/services/validator-service.ts** - Validation service
   - Pre-configured schema for item creation
   - Method to validate ItemCreate requests
   - Extensible for custom validation schemas

3. **tests/validators.test.ts** - Comprehensive unit tests
   - Tests all built-in validators
   - Tests validateField and validate functions
   - Tests ValidatorService integration
   - 50+ test cases covering edge cases

4. **tests/api-items.test.ts** - API integration tests
   - Tests successful item creation
   - Tests validation error handling
   - Tests all validation rules at the API level

### Modified Files (1)
1. **src/app/api/items/route.ts** - API route handler
   - Integrated ValidatorService into POST handler
   - Returns 400 with detailed validation errors on failure
   - Sets default status to 'pending' when not provided

## Validation Rules

### Item Creation (`validateItemCreate`)
- **name**: Required, string, 1-100 characters
- **description**: Optional, string, max 500 characters
- **status**: Optional, must be one of: 'active', 'pending', 'completed'

## Features

### Built-in Validators
- `required()` - Validates non-null, non-undefined, non-empty values
- `minLength(n)` - Minimum string length
- `maxLength(n)` - Maximum string length
- `oneOf(values)` - Value must be in allowed list
- `pattern(regex, msg?)` - Regex pattern matching
- `email()` - Email format validation
- `range(min, max)` - Numeric range validation
- `type(type)` - Type checking (string, number, boolean, object)

### Schema Definition
```typescript
const schema: Schema = {
  fieldName: {
    validators: [validators.required(), validators.minLength(3)],
    optional: false // or true
  }
}
```

### Usage Example
```typescript
import { ValidatorService } from '@/services/validator-service'

const validator = new ValidatorService()
const result = validator.validateItemCreate({
  name: 'New Item',
  status: 'active'
})

if (!result.valid) {
  console.error('Validation errors:', result.errors)
}
```

## API Error Response Format
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "name is required"
    },
    {
      "field": "status",
      "message": "status must be one of: active, pending, completed"
    }
  ]
}
```

## Design Principles
1. **Zero external dependencies** - Pure TypeScript implementation
2. **Composable** - Validators can be combined flexibly
3. **Type-safe** - Full TypeScript support with proper typing
4. **Extensible** - Easy to add new validators or schemas
5. **Framework-agnostic** - Can be used in any JavaScript/TypeScript project

## Testing
Run the test suite:
```bash
npm test validators.test.ts
npm test api-items.test.ts
```

Test coverage includes:
- All built-in validators with edge cases
- Optional field handling
- Schema validation
- API integration
- Error message formatting

## Future Enhancements
Potential additions for future iterations:
- Array validation
- Nested object validation
- Custom error message templates
- Async validators (e.g., database uniqueness checks)
- Conditional validation rules
- Transform/coerce values before validation
