import { POST } from '../src/app/api/items/route'

describe('POST /api/items', () => {
  test('returns 400 when status is invalid', async () => {
    const request = new Request('http://localhost/api/items', {
      method: 'POST',
      body: JSON.stringify({ name: 'Task', status: 'urgent' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.errors).toContain('status must be one of: active, pending, completed')
  })

  test('returns 400 when description is only whitespace', async () => {
    const request = new Request('http://localhost/api/items', {
      method: 'POST',
      body: JSON.stringify({ name: 'Task', description: '   ' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.errors).toContain('description cannot be empty')
  })

  test('creates an item and defaults status to pending', async () => {
    const request = new Request('http://localhost/api/items', {
      method: 'POST',
      body: JSON.stringify({ name: 'Task name' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload.name).toBe('Task name')
    expect(payload.status).toBe('pending')
    expect(payload.id).toBeDefined()
  })
})
