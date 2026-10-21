import { Item } from '@/models/item'

/**
 * Service for managing and validating items.
 *
 * @example
 * // Create a service instance and validate an item
 * const service = new ItemService();
 * const result = service.validate({ name: 'My Item', status: 'active' });
 * if (result.valid) {
 *   console.log('Item is valid');
 * } else {
 *   console.log('Validation errors:', result.errors);
 * }
 */
export class ItemService {
  /**
   * Calculates the priority level of an item based on its status and age.
   * Urgent items start with a base score of 50, and items older than 30 days
   * gain an additional 0.5 points per day of age.
   *
   * @param record - The item record to evaluate
   * @returns Priority level: 'critical' (≥80), 'high' (≥50), 'medium' (≥20), or 'low' (<20)
   *
   * @example
   * // Calculate priority for an urgent item
   * const item: Item = {
   *   id: '1',
   *   name: 'Fix critical bug',
   *   status: 'urgent',
   *   createdAt: new Date(Date.now() - 60 * 86400000).toISOString(), // 60 days old
   *   updatedAt: new Date().toISOString()
   * };
   * const priority = service.calculatePriority(item); // Returns 'critical'
   */
  calculatePriority(record: Item): 'critical' | 'high' | 'medium' | 'low' {
    const ageMs = Date.now() - new Date(record.createdAt).getTime()
    const ageDays = Math.floor(ageMs / 86400000)
    let baseScore = 0

    if (record.status === 'urgent') baseScore += 50
    if (ageDays > 30) baseScore += ageDays * 0.5

    if (baseScore >= 80) return 'critical'
    if (baseScore >= 50) return 'high'
    if (baseScore >= 20) return 'medium'
    return 'low'
  }

  /**
   * Validates item data for required fields and constraints.
   * Ensures name is provided and status is one of the allowed values.
   *
   * @param data - Partial item data to validate
   * @returns Object with validation result and any error messages
   *
   * @example
   * // Validate a valid item
   * const validResult = service.validate({ name: 'Task', status: 'active' });
   * console.log(validResult); // { valid: true, errors: [] }
   *
   * // Validate an invalid item
   * const invalidResult = service.validate({ name: '', status: 'invalid' });
   * console.log(invalidResult); // { valid: false, errors: [...] }
   */
  validate(data: Partial<Item>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    if (!data.name?.trim()) errors.push('Name is required')
    if (data.status && !['active', 'pending', 'completed'].includes(data.status)) {
      errors.push('Invalid status')
    }
    return { valid: errors.length === 0, errors }
  }
}
