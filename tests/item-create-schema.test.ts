import { validateItemCreate } from '../src/validation/item-create-schema'

describe('validateItemCreate', () => {
  test('rejects an empty name', () => {
    const result = validateItemCreate({ name: '   ' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.errors).toContain('name is required')
  })

  test('rejects an invalid status', () => {
    const result = validateItemCreate({ name: 'Task', status: 'urgent' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.errors).toContain('status must be one of: active, pending, completed')
  })

  test('accepts valid input and trims fields', () => {
    const result = validateItemCreate({
      name: '  Task  ',
      description: '  Description  ',
      status: 'active',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toEqual({
      name: 'Task',
      description: 'Description',
      status: 'active',
    })
  })
})
