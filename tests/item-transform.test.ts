import {
  DEFAULT_STATUS,
  normalizeItem,
  normalizeStatus,
  normalizeTimestamp,
  toSafeString,
} from '../src/services/item-transform'
import { MAX_NAME_LENGTH } from '../src/services/validation'

const NOW = Date.parse('2026-10-28T00:00:00.000Z')

describe('toSafeString', () => {
  test('returns an empty string for non-string input', () => {
    expect(toSafeString(null, 10)).toBe('')
    expect(toSafeString(42, 10)).toBe('')
    expect(toSafeString(undefined, 10)).toBe('')
  })

  test('trims surrounding whitespace', () => {
    expect(toSafeString('  hi  ', 10)).toBe('hi')
  })

  test('truncates to the maximum length', () => {
    expect(toSafeString('abcdef', 3)).toBe('abc')
  })

  test('does not split a surrogate pair at the cut point', () => {
    // '😀' is two UTF-16 code units; a naive slice(0, 3) would leave a lone
    // high surrogate. The whole codepoint is dropped instead.
    const result = toSafeString('ab😀cd', 3)
    expect(result).toBe('ab')
    expect(result).not.toMatch(/[\uD800-\uDBFF]/)
  })

  test('keeps a surrogate pair that fits exactly within the limit', () => {
    expect(toSafeString('a😀', 3)).toBe('a😀')
  })

  test('trims whitespace exposed by truncation', () => {
    expect(toSafeString('ab   cd', 4)).toBe('ab')
  })
})

describe('normalizeStatus', () => {
  test('keeps valid statuses', () => {
    expect(normalizeStatus('urgent')).toBe('urgent')
  })

  test('falls back to the default for unknown or malformed statuses', () => {
    expect(normalizeStatus('archived')).toBe(DEFAULT_STATUS)
    expect(normalizeStatus(99)).toBe(DEFAULT_STATUS)
    expect(normalizeStatus(undefined)).toBe(DEFAULT_STATUS)
  })
})

describe('normalizeTimestamp', () => {
  test('preserves a valid timestamp instant', () => {
    const iso = '2026-01-15T12:00:00.000Z'
    expect(Date.parse(normalizeTimestamp(iso, NOW))).toBe(Date.parse(iso))
  })

  test('falls back to the provided instant for malformed input', () => {
    expect(normalizeTimestamp('garbage', NOW)).toBe(new Date(NOW).toISOString())
    expect(normalizeTimestamp(undefined, NOW)).toBe(new Date(NOW).toISOString())
  })

  test('falls back instead of throwing on an out-of-range numeric instant', () => {
    // new Date(1e300).toISOString() throws a RangeError; normalization must
    // degrade to the fallback rather than crash the request.
    expect(() => normalizeTimestamp(1e300, NOW)).not.toThrow()
    expect(normalizeTimestamp(1e300, NOW)).toBe(new Date(NOW).toISOString())
  })
})

describe('normalizeItem', () => {
  test('produces safe defaults for empty input', () => {
    const nowIso = new Date(NOW).toISOString()
    expect(normalizeItem(null, NOW)).toEqual({
      name: '',
      status: DEFAULT_STATUS,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    expect(normalizeItem(undefined, NOW)).toEqual(normalizeItem({}, NOW))
  })

  test('coerces malformed fields into a well-typed record', () => {
    const result = normalizeItem(
      { name: 123, status: 'archived', createdAt: 'nope', description: 456 },
      NOW,
    )
    expect(result.name).toBe('')
    expect(result.status).toBe(DEFAULT_STATUS)
    expect(result.createdAt).toBe(new Date(NOW).toISOString())
    expect(result).not.toHaveProperty('description')
  })

  test('truncates oversized strings rather than dropping the record', () => {
    const result = normalizeItem({ name: 'x'.repeat(MAX_NAME_LENGTH + 50) }, NOW)
    expect(result.name).toHaveLength(MAX_NAME_LENGTH)
  })

  test('truncates an oversized name without orphaning a surrogate', () => {
    const name = 'x'.repeat(MAX_NAME_LENGTH - 1) + '😀😀'
    const result = normalizeItem({ name }, NOW)
    expect(result.name).toHaveLength(MAX_NAME_LENGTH - 1)
    expect(result.name).not.toMatch(/[\uD800-\uDBFF]/)
  })

  test('does not throw on an out-of-range numeric timestamp', () => {
    const nowIso = new Date(NOW).toISOString()
    expect(() => normalizeItem({ name: 'ok', createdAt: 1e300 }, NOW)).not.toThrow()
    expect(normalizeItem({ name: 'ok', createdAt: 1e300 }, NOW).createdAt).toBe(nowIso)
  })

  test('preserves a well-formed record', () => {
    const result = normalizeItem(
      {
        name: '  Patient Intake  ',
        description: 'Notes',
        status: 'urgent',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-02T00:00:00.000Z',
      },
      NOW,
    )
    expect(result).toEqual({
      name: 'Patient Intake',
      description: 'Notes',
      status: 'urgent',
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-02T00:00:00.000Z',
    })
  })
})
