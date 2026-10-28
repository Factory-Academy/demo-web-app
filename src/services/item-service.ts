import { Item } from '@/models/item'
import { Priority, calculatePriority } from '@/services/priority'
import { ValidationResult, validateItem } from '@/services/validation'
import { NormalizedItem, normalizeItem } from '@/services/item-transform'

/**
 * Business logic for the primary model. This is a thin facade: the scoring,
 * validation, and normalization rules live in focused, independently tested
 * modules (`priority`, `validation`, `item-transform`).
 */
export class ItemService {
  calculatePriority(record: Partial<Item> | null | undefined): Priority {
    return calculatePriority(record)
  }

  validate(data: Partial<Item> | null | undefined): ValidationResult {
    return validateItem(data)
  }

  /** Coerce arbitrary input into a safe, well-typed record. */
  normalize(raw: unknown): NormalizedItem {
    return normalizeItem(raw)
  }
}
