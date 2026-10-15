import { Item } from '@/models/item'
import {
  PriorityInput,
  PriorityLevel,
  ValidationResult,
  calculatePriorities,
  calculatePriority,
  validateItem,
} from './transform'

/**
 * Business logic for items. The data-transform details (priority scoring and
 * validation) live in `./transform`; this class is a thin, stable facade over
 * those pure functions.
 */
export class ItemService {
  calculatePriority(record: PriorityInput): PriorityLevel {
    return calculatePriority(record)
  }

  calculatePriorities(records: ReadonlyArray<PriorityInput>): PriorityLevel[] {
    return calculatePriorities(records)
  }

  validate(data: Partial<Item>): ValidationResult {
    return validateItem(data)
  }
}
