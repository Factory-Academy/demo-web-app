import {
  VALID_STATUSES,
  ValidationMessages,
  isValidStatus,
  validateItem,
} from '@/services/item/validation'

describe('isValidStatus', () => {
  test('accepts every known status', () => {
    for (const status of VALID_STATUSES) {
      expect(isValidStatus(status)).toBe(true)
    }
  })

  test('rejects unknown statuses, including urgent', () => {
    expect(isValidStatus('urgent')).toBe(false)
    expect(isValidStatus('archived')).toBe(false)
    expect(isValidStatus('')).toBe(false)
  })

  test('exposes the accepted statuses', () => {
    expect([...VALID_STATUSES]).toEqual(['active', 'pending', 'completed'])
  })
})

describe('validateItem', () => {
  test('rejects a missing name', () => {
    const result = validateItem({})
    expect(result.valid).toBe(false)
    expect(result.errors).toContain(ValidationMessages.nameRequired)
  })

  test('rejects an empty name', () => {
    const result = validateItem({ name: '' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain(ValidationMessages.nameRequired)
  })

  test('rejects a whitespace-only name', () => {
    const result = validateItem({ name: '   ' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain(ValidationMessages.nameRequired)
  })

  test('accepts a valid name with no status', () => {
    const result = validateItem({ name: 'Widget A' })
    expect(result).toEqual({ valid: true, errors: [] })
  })

  test.each([...VALID_STATUSES])('accepts valid status %s', (status: string) => {
    const result = validateItem({ name: 'Widget A', status })
    expect(result.valid).toBe(true)
  })

  test('treats an empty-string status as "no status"', () => {
    const result = validateItem({ name: 'Widget A', status: '' })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  test('rejects an unknown status', () => {
    const result = validateItem({ name: 'Widget A', status: 'archived' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain(ValidationMessages.invalidStatus)
  })

  test('rejects "urgent" as an input status even though it affects priority', () => {
    const result = validateItem({ name: 'Widget A', status: 'urgent' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain(ValidationMessages.invalidStatus)
  })

  test('reports every problem at once', () => {
    const result = validateItem({ name: '  ', status: 'archived' })
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual([
      ValidationMessages.nameRequired,
      ValidationMessages.invalidStatus,
    ])
  })

  test('does not mutate its input', () => {
    const input = { name: 'Widget A', status: 'active' }
    const snapshot = { ...input }
    validateItem(input)
    expect(input).toEqual(snapshot)
  })
})
