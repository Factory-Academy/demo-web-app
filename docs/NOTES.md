# Technical Notes

## ItemService Data Flow

The `ItemService` module processes item records through validation and priority calculation pipelines.

### Data Flow Overview

```
Item (model) → ItemService → ValidationResult | PriorityLevel
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
   validate()            calculatePriority()
        ↓                       ↓
   validation-utils        date-utils
                           priority-utils
```

### Validation Pipeline

1. **Input**: Partial `Item` data
2. **Processing**: 
   - Checks required `name` field is present and non-empty
   - Validates `status` against allowed values: `active`, `pending`, `completed`
3. **Output**: `ValidationResult` with `valid` boolean and `errors` array

### Priority Calculation Pipeline

1. **Input**: Complete `Item` record
2. **Processing**:
   - Calculates age in days from `createdAt` timestamp
   - Adds 50 points if status is `urgent`
   - Adds 0.5 points per day if age exceeds 30 days
3. **Scoring**: Converts numeric score to priority level
   - `≥80`: critical
   - `≥50`: high
   - `≥20`: medium
   - `<20`: low
4. **Output**: `PriorityLevel` enum value

### Dependencies

- `@/models/item`: Data structure definitions
- `@/utils/date-utils`: Age calculation
- `@/utils/priority-utils`: Score-to-level conversion
- `@/utils/validation-utils`: Result formatting
