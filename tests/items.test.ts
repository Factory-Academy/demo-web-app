import { ItemService } from '../src/services/item-service'
import { ValidationError } from '../src/lib/validation-error'

describe('ItemService', () => {
  const service = new ItemService()

  test('validate throws ValidationError for empty name', () => {
    expect(() => service.validate({ name: '' })).toThrow(ValidationError)
    expect(() => service.validate({ name: '' })).toThrow('Name is required')
  })

  test('validate does not throw for valid item', () => {
    expect(() => service.validate({ name: 'Test', status: 'active' })).not.toThrow()
  })
})
