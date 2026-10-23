# Error Handling Refactor

## Overview

Fixed inconsistent error handling across the `ItemService` and `ItemClient` by introducing a shared error type and standardizing error handling patterns throughout the application.

## Problem

The codebase had two different error handling approaches:
- **ItemClient**: Threw typed errors (`HttpError`) for failures
- **ItemService**: Returned validation results as `{ valid: boolean, errors: string[] }`

This inconsistency made error handling unpredictable and harder to maintain.

## Solution

### 1. Shared Error Utility (`src/utils/errors.ts`)

Created a new `ValidationError` class that:
- Extends the base `Error` class with proper prototype chains for ES5 compatibility
- Holds multiple validation failure messages in an `errors` array
- Provides utility methods:
  - `ValidationError.single(error)` - Create error with one message
  - `ValidationError.hasError(error, substring)` - Check for specific errors
  - `isValidationError(error)` - Type guard for TypeScript
  - `validationResultToError(result)` - Convert legacy validation results

### 2. Updated ItemService (`src/services/item-service.ts`)

Changed the validation approach:
- **Before**: `validate()` returned `{ valid: boolean, errors: string[] }`
- **After**: `validate()` throws `ValidationError` if validation fails
- **Added**: `isValid()` method for boolean checks without try/catch

Benefits:
- Consistent with `ItemClient` error handling
- Clearer error flow - failures throw, success returns void
- Better composability with other error-throwing code

### 3. Updated API Route (`src/app/api/items/route.ts`)

Integrated validation into the POST endpoint:
- Calls `service.validate(data)` before saving items
- Catches `ValidationError` and returns HTTP 400 with error details
- Properly formats validation errors for API responses

### 4. Comprehensive Test Coverage

Created three new test files with 29 passing tests:

**tests/errors.test.ts** (12 tests)
- ValidationError construction and methods
- Type guards and utilities
- ES5 compatibility verification

**tests/item-service.test.ts** (11 tests)
- Validation throwing behavior
- `isValid()` helper method
- Priority calculation (existing functionality)

**tests/api-items.test.ts** (6 tests)
- API integration with validation
- Error responses for invalid data
- Success cases for valid data

## Files Changed

### Created
- `src/utils/errors.ts` - Shared error utility
- `tests/errors.test.ts` - Error utility tests
- `tests/item-service.test.ts` - ItemService tests
- `tests/api-items.test.ts` - API integration tests

### Modified
- `src/services/item-service.ts` - Changed to throw ValidationError
- `src/app/api/items/route.ts` - Added validation and error handling

## Backward Compatibility

The `ItemService` now provides both patterns:
- `validate(data)` - Throws on failure (new standard)
- `isValid(data)` - Returns boolean without throwing (convenience method)

## Testing

All tests pass:
```bash
npx jest --testPathPattern="(errors|item-service|api-items)"
# Test Suites: 3 passed
# Tests: 29 passed
```

## Next Steps

Consider applying this pattern to other services:
1. Identify other services using return-based error reporting
2. Migrate them to throw typed errors
3. Update call sites to use try/catch
4. Add comprehensive tests for each migration
