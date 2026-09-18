import { ItemService } from '../src/services/item-service'
import { safeReduce } from '../src/utils/reduce'

describe('ItemService', () => {
  const service = new ItemService()

  test('validate rejects empty name', () => {
    const result = service.validate({ name: '' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Name is required')
  })

  test('validate accepts valid item', () => {
    const result = service.validate({ name: 'Test', status: 'active' })
    expect(result.valid).toBe(true)
  })
})

describe('safeReduce', () => {
  test('handles empty array with initial value', () => {
    const result = safeReduce<number, number>([], (acc, val) => acc + val, 0)
    expect(result).toBe(0)
  })

  test('handles null array', () => {
    const result = safeReduce<number, number>(null, (acc, val) => acc + val, 42)
    expect(result).toBe(42)
  })

  test('handles undefined array', () => {
    const result = safeReduce<number, number>(undefined, (acc, val) => acc + val, 100)
    expect(result).toBe(100)
  })

  test('reduces non-empty array correctly', () => {
    const result = safeReduce<number, number>([1, 2, 3], (acc, val) => acc + val, 0)
    expect(result).toBe(6)
  })

  test('accumulates objects correctly', () => {
    const items = [{ value: 10 }, { value: 20 }]
    const result = safeReduce<{ value: number }, number>(
      items,
      (acc, item) => acc + item.value,
      0
    )
    expect(result).toBe(30)
  })
})
