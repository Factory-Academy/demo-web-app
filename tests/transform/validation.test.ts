import {
  validateDescription,
  validateItem,
  validateName,
  validateStatus,
} from '@/services/transform/validation'
import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH } from '@/services/transform/constants'

describe('validateName', () => {
  test('accepts a normal name', () => {
    expect(validateName('Widget A')).toEqual([])
  })

  test.each([[''], ['   '], [undefined], [null]])('requires a name for %p', (value) => {
    expect(validateName(value as unknown)).toContain('Name is required')
  })

  test.each([[42], [{}], [[]], [true]])('rejects non-string name %p without throwing', (value) => {
    expect(() => validateName(value as unknown)).not.toThrow()
    expect(validateName(value as unknown)).toEqual(['Name must be a string'])
  })

  test('rejects an over-long name', () => {
    const longName = 'x'.repeat(MAX_NAME_LENGTH + 1)
    expect(validateName(longName)).toEqual([`Name must be ${MAX_NAME_LENGTH} characters or fewer`])
  })

  test('accepts a name exactly at the limit', () => {
    expect(validateName('x'.repeat(MAX_NAME_LENGTH))).toEqual([])
  })
})

describe('validateStatus', () => {
  test.each([['active'], ['pending'], ['completed']])('accepts valid status %s', (status) => {
    expect(validateStatus(status)).toEqual([])
  })

  test('treats an absent status as valid', () => {
    expect(validateStatus(undefined)).toEqual([])
    expect(validateStatus(null)).toEqual([])
  })

  test.each([['urgent'], ['archived'], [99], [{}]])('rejects invalid status %p', (status) => {
    expect(validateStatus(status as unknown)).toEqual(['Invalid status'])
  })
})

describe('validateDescription', () => {
  test('accepts an absent or normal description', () => {
    expect(validateDescription(undefined)).toEqual([])
    expect(validateDescription('A short description')).toEqual([])
  })

  test('rejects a non-string description', () => {
    expect(validateDescription(123 as unknown)).toEqual(['Description must be a string'])
  })

  test('rejects an over-long description', () => {
    const long = 'x'.repeat(MAX_DESCRIPTION_LENGTH + 1)
    expect(validateDescription(long)).toEqual([
      `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`,
    ])
  })
})

describe('validateItem', () => {
  test('accepts a valid item', () => {
    expect(validateItem({ name: 'Test', status: 'active' })).toEqual({ valid: true, errors: [] })
  })

  test('collects multiple errors at once', () => {
    const result = validateItem({ name: '', status: 'bogus' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Name is required')
    expect(result.errors).toContain('Invalid status')
  })

  test.each([[null], [undefined], ['string'], [42]])(
    'rejects malformed payload %p without throwing',
    (payload) => {
      expect(() => validateItem(payload as unknown as never)).not.toThrow()
      expect(validateItem(payload as unknown as never)).toEqual({
        valid: false,
        errors: ['Item data is required'],
      })
    },
  )

  test('does not throw on a numeric name (regression)', () => {
    expect(() => validateItem({ name: 42 as unknown as string })).not.toThrow()
    expect(validateItem({ name: 42 as unknown as string }).valid).toBe(false)
  })
})
