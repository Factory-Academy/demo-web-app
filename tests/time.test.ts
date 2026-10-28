import {
  MAX_TIMESTAMP_MS,
  MS_PER_DAY,
  isValidInstant,
  parseInstant,
  toIsoString,
} from '../src/services/time'

describe('isValidInstant', () => {
  test('accepts finite, in-range numbers', () => {
    expect(isValidInstant(0)).toBe(true)
    expect(isValidInstant(1_700_000_000_000)).toBe(true)
    expect(isValidInstant(-MAX_TIMESTAMP_MS)).toBe(true)
    expect(isValidInstant(MAX_TIMESTAMP_MS)).toBe(true)
  })

  test('rejects numbers beyond the representable Date range', () => {
    expect(isValidInstant(MAX_TIMESTAMP_MS + 1)).toBe(false)
    expect(isValidInstant(-(MAX_TIMESTAMP_MS + 1))).toBe(false)
    expect(isValidInstant(1e300)).toBe(false)
  })

  test('rejects non-finite and non-number input', () => {
    expect(isValidInstant(NaN)).toBe(false)
    expect(isValidInstant(Infinity)).toBe(false)
    expect(isValidInstant('123')).toBe(false)
    expect(isValidInstant(null)).toBe(false)
  })
})

describe('parseInstant', () => {
  test('parses ISO strings', () => {
    expect(parseInstant('2026-01-01T00:00:00.000Z')).toBe(
      Date.parse('2026-01-01T00:00:00.000Z'),
    )
  })

  test('passes finite in-range epoch-millis numbers through', () => {
    expect(parseInstant(1_700_000_000_000)).toBe(1_700_000_000_000)
  })

  test('returns null for malformed strings', () => {
    expect(parseInstant('not-a-date')).toBeNull()
  })

  test('returns null for NaN, Infinity, and out-of-range numbers', () => {
    expect(parseInstant(NaN)).toBeNull()
    expect(parseInstant(Infinity)).toBeNull()
    expect(parseInstant(1e300)).toBeNull()
    expect(parseInstant(MAX_TIMESTAMP_MS + 1)).toBeNull()
  })

  test('returns null for non-string, non-number input', () => {
    expect(parseInstant(null)).toBeNull()
    expect(parseInstant(undefined)).toBeNull()
    expect(parseInstant({})).toBeNull()
    expect(parseInstant([])).toBeNull()
  })
})

describe('toIsoString', () => {
  test('formats a representable instant', () => {
    const ms = Date.parse('2026-05-01T00:00:00.000Z')
    expect(toIsoString(ms)).toBe('2026-05-01T00:00:00.000Z')
  })

  test('returns null instead of throwing for unrepresentable values', () => {
    // new Date(1e300).toISOString() would throw a RangeError.
    expect(() => toIsoString(1e300)).not.toThrow()
    expect(toIsoString(1e300)).toBeNull()
    expect(toIsoString(MAX_TIMESTAMP_MS + 1)).toBeNull()
    expect(toIsoString(NaN)).toBeNull()
  })
})

describe('MS_PER_DAY', () => {
  test('is a single shared constant', () => {
    expect(MS_PER_DAY).toBe(86_400_000)
  })
})
