/**
 * API route handler tests for /api/items
 * Tests validation integration in the POST handler
 */

import { POST, GET } from '../src/app/api/items/route'

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, options?: { status?: number }) => ({
      data,
      status: options?.status || 200,
      toJSON: () => ({ data, status: options?.status || 200 }),
    }),
  },
}))

describe('POST /api/items', () => {
  test('creates item with valid data', async () => {
    const request = new Request('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Item',
        description: 'A test item',
        status: 'active',
      }),
    })

    const response = await POST(request) as any
    expect(response.status).toBe(201)
    expect(response.data).toHaveProperty('id')
    expect(response.data.name).toBe('Test Item')
    expect(response.data).toHaveProperty('createdAt')
    expect(response.data).toHaveProperty('updatedAt')
  })

  test('creates item with required fields only', async () => {
    const request = new Request('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Simple Item',
      }),
    })

    const response = await POST(request) as any
    expect(response.status).toBe(201)
    expect(response.data.name).toBe('Simple Item')
  })

  test('rejects item with missing name', async () => {
    const request = new Request('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        description: 'No name provided',
        status: 'active',
      }),
    })

    const response = await POST(request) as any
    expect(response.status).toBe(400)
    expect(response.data.error).toBe('Validation failed')
    expect(response.data.details).toContainEqual(
      expect.objectContaining({
        field: 'name',
      }),
    )
  })

  test('rejects item with empty name', async () => {
    const request = new Request('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: '   ',
        status: 'active',
      }),
    })

    const response = await POST(request) as any
    expect(response.status).toBe(400)
    expect(response.data.error).toBe('Validation failed')
  })

  test('rejects item with invalid status', async () => {
    const request = new Request('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Item',
        status: 'invalid-status',
      }),
    })

    const response = await POST(request) as any
    expect(response.status).toBe(400)
    expect(response.data.details).toContainEqual(
      expect.objectContaining({
        field: 'status',
      }),
    )
  })

  test('includes multiple validation errors in response', async () => {
    const request = new Request('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: '',
        status: 'bad-status',
      }),
    })

    const response = await POST(request) as any
    expect(response.status).toBe(400)
    expect(response.data.details.length).toBeGreaterThanOrEqual(1)
  })

  test('GET returns items array', async () => {
    const response = await GET() as any
    expect(response.status).toBe(200)
    expect(Array.isArray(response.data)).toBe(true)
  })
})
