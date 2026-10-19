import { GET, POST } from '../src/app/api/items/route'

describe('items API route', () => {
  test('returns a validation error for a non-numeric limit', async () => {
    const request = new Request('http://localhost/api/items?limit=abc')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({
      error: 'Validation failed',
      details: ['Limit must be a whole number'],
    })
  })

  test('returns a validation error for invalid item payload', async () => {
    const request = new Request('http://localhost/api/items', {
      method: 'POST',
      body: JSON.stringify({ name: '', status: 'invalid-status' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({
      error: 'Validation failed',
      details: ['Name is required', 'Invalid status'],
    })
  })
})
