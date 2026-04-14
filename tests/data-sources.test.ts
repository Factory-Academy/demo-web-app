import { DataSourceService } from '../src/services/data-source-service'

describe('DataSourceService', () => {
  const service = new DataSourceService()

  test('validate rejects empty name', () => {
    const result = service.validate({ name: '' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Name is required')
  })

  test('validate accepts valid data source', () => {
    const result = service.validate({ name: 'Production DB', status: 'protected' })
    expect(result.valid).toBe(true)
  })
})
