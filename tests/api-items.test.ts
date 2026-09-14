/**
 * Integration tests for /api/items route with validation
 */

import { POST } from '../src/app/api/items/route'

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: ResponseInit) => ({
      json: async () => data,
      status: init?.status || 200,
    }),
  },
}))

describe('POST /api/items', () => {
  test('creates item with valid data', async () => {
    const request = {
      json: async () => ({
        name: 'Test Item',
        description: 'A test item',
        status: 'active',
      }),
    } as Request

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.name).toBe('Test Item')
    expect(data.description).toBe('A test item')
    expect(data.status).toBe('active')
    expect(data.id).toBeDefined()
    expect(data.createdAt).toBeDefined()
    expect(data.updatedAt).toBeDefined()
  })

  test('creates item with minimal valid data', async () => {
    const request = {
      json: async () => ({
        name: 'Minimal Item',
      }),
    } as Request

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.name).toBe('Minimal Item')
    expect(data.status).toBe('pending') // default status
  })

  test('rejects item with empty name', async () => {
    const request = {
      json: async () => ({
        name: '',
        status: 'active',
      }),
    } as Request

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toBeDefined()
    expect(data.details.some((e: any) => e.field === 'name')).toBe(true)
  })

  test('rejects item with missing name', async () => {
    const request = {
      json: async () => ({
        status: 'active',
      }),
    } as Request

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details.some((e: any) => e.field === 'name')).toBe(true)
  })

  test('rejects item with invalid status', async () => {
    const request = {
      json: async () => ({
        name: 'Test Item',
        status: 'invalid-status',
      }),
    } as Request

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details.some((e: any) => e.field === 'status')).toBe(true)
  })

  test('rejects item with name exceeding max length', async () => {
    const request = {
      json: async () => ({
        name: 'a'.repeat(101),
        status: 'active',
      }),
    } as Request

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toContainEqual({
      field: 'name',
      message: 'name must not exceed 100 characters',
    })
  })

  test('rejects item with description exceeding max length', async () => {
    const request = {
      json: async () => ({
        name: 'Valid name',
        description: 'a'.repeat(501),
        status: 'active',
      }),
    } as Request

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toContainEqual({
      field: 'description',
      message: 'description must not exceed 500 characters',
    })
  })

  test('returns multiple validation errors when multiple fields are invalid', async () => {
    const request = {
      json: async () => ({
        name: '',
        status: 'invalid',
        description: 'a'.repeat(501),
      }),
    } as Request

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details.length).toBeGreaterThan(1)
    expect(data.details.some((e: any) => e.field === 'name')).toBe(true)
    expect(data.details.some((e: any) => e.field === 'status')).toBe(true)
    expect(data.details.some((e: any) => e.field === 'description')).toBe(true)
  })
})
