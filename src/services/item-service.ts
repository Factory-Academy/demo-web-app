import { Item } from '@/models/item'

export class ItemService {
  calculatePriority(record: Item): 'critical' | 'high' | 'medium' | 'low' {
    const now = new Date(Date.now())
    const createdAt = new Date(record.createdAt)
    const nowDateUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    const createdDateUtc = Date.UTC(
      createdAt.getUTCFullYear(),
      createdAt.getUTCMonth(),
      createdAt.getUTCDate()
    )
    const ageDays = Math.max(0, Math.floor((nowDateUtc - createdDateUtc) / 86400000))
    let baseScore = 0

    if (record.status === 'urgent') baseScore += 50
    if (ageDays > 30) baseScore += ageDays * 0.5

    if (baseScore >= 80) return 'critical'
    if (baseScore >= 50) return 'high'
    if (baseScore >= 20) return 'medium'
    return 'low'
  }

  /**
   * Validates item data against required fields and business rules.
   * 
   * @param data - Partial item data to validate
   * @returns Object containing validation status and error messages
   * 
   * @example
   * ```typescript
   * const service = new ItemService();
   * 
   * // Valid item
   * const result = service.validate({ 
   *   name: 'New Task', 
   *   status: 'active' 
   * });
   * // Returns: { valid: true, errors: [] }
   * 
   * // Invalid item - missing name
   * const invalid = service.validate({ name: '' });
   * // Returns: { valid: false, errors: ['Name is required'] }
   * ```
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
