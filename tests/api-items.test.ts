import { POST } from '../src/app/api/items/route'
import { NextRequest } from 'next/server'

describe('POST /api/items', () => {
  test('creates item with valid data', async () => {
    const request = new NextRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Item',
        description: 'Test description',
        status: 'active',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toMatchObject({
      name: 'Test Item',
      description: 'Test description',
      status: 'active',
    })
    expect(data.id).toBeDefined()
    expect(data.createdAt).toBeDefined()
    expect(data.updatedAt).toBeDefined()
  })

  test('uses pending as default status', async () => {
    const request = new NextRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Item',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.status).toBe('pending')
  })

  test('rejects request with missing name', async () => {
    const request = new NextRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        description: 'No name provided',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toHaveLength(1)
    expect(data.details[0]).toMatchObject({
      field: 'name',
      code: 'MISSING_NAME',
    })
  })

  test('rejects request with empty name', async () => {
    const request = new NextRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: '   ',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  test('rejects request with invalid status', async () => {
    const request = new NextRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Item',
        status: 'invalid-status',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toHaveLength(1)
    expect(data.details[0]).toMatchObject({
      field: 'status',
      code: 'INVALID_STATUS',
    })
  })

  test('handles invalid JSON gracefully', async () => {
    const request = new NextRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: 'invalid json',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request')
    expect(data.details[0].code).toBe('INVALID_JSON')
  })

  test('accumulates multiple validation errors', async () => {
    const request = new NextRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: '',
        status: 'invalid-status',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.details).toHaveLength(2)
    expect(data.details.map((e: any) => e.code)).toContain('MISSING_NAME')
    expect(data.details.map((e: any) => e.code)).toContain('INVALID_STATUS')
  })
})
