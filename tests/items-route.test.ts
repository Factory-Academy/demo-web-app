/**
 * Tests for items API route with schema validation
 */

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: any) => ({
      data,
      status: init?.status || 200,
    }),
  },
}))

// Reset module cache before importing route handlers
beforeEach(() => {
  jest.resetModules()
})

describe('Items API Route', () => {
  test('POST validates required name field', async () => {
    const { POST } = await import('../src/app/api/items/route')

    const request = {
      json: async () => ({}),
    } as Request

    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(response.data.error).toBe('Validation failed')
    expect(response.data.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'name',
          message: 'name is required',
        }),
      ])
    )
  })

  test('POST validates name is a string', async () => {
    const { POST } = await import('../src/app/api/items/route')

    const request = {
      json: async () => ({ name: 123 }),
    } as Request

    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(response.data.error).toBe('Validation failed')
  })

  test('POST validates status enum values', async () => {
    const { POST } = await import('../src/app/api/items/route')

    const request = {
      json: async () => ({ name: 'Test Item', status: 'invalid_status' }),
    } as Request

    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(response.data.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'status',
          message: expect.stringContaining('must be one of'),
        }),
      ])
    )
  })

  test('POST validates description max length', async () => {
    const { POST } = await import('../src/app/api/items/route')

    const longDescription = 'x'.repeat(501)
    const request = {
      json: async () => ({ name: 'Test', description: longDescription }),
    } as Request

    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(response.data.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'description',
          message: 'description must be at most 500 characters',
        }),
      ])
    )
  })

  test('POST creates item with valid data and defaults status', async () => {
    const { POST } = await import('../src/app/api/items/route')

    const request = {
      json: async () => ({ name: 'Valid Item' }),
    } as Request

    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(response.data.name).toBe('Valid Item')
    expect(response.data.status).toBe('pending')
    expect(response.data.id).toBeDefined()
    expect(response.data.createdAt).toBeDefined()
  })

  test('POST creates item with all valid fields', async () => {
    const { POST } = await import('../src/app/api/items/route')

    const request = {
      json: async () => ({
        name: 'Complete Item',
        description: 'Test description',
        status: 'active',
      }),
    } as Request

    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(response.data.name).toBe('Complete Item')
    expect(response.data.description).toBe('Test description')
    expect(response.data.status).toBe('active')
  })

  test('POST accepts valid status values', async () => {
    const { POST } = await import('../src/app/api/items/route')

    const validStatuses = ['active', 'pending', 'completed']

    for (const status of validStatuses) {
      const request = {
        json: async () => ({ name: 'Test', status }),
      } as Request

      const response = await POST(request)
      expect(response.status).toBe(201)
      expect(response.data.status).toBe(status)
    }
  })

  test('GET returns list of items', async () => {
    const { GET } = await import('../src/app/api/items/route')

    const response = await GET()
    expect(response.status).toBe(200)
    expect(Array.isArray(response.data)).toBe(true)
  })

  describe('PATCH lifecycle transitions', () => {
    async function createItem(POST: (request: Request) => Promise<any>) {
      const request = { json: async () => ({ name: 'Lifecycle Item' }) } as Request
      const response = await POST(request)
      return response.data.id as string
    }

    test('advances an item through a valid transition', async () => {
      const route = await import('../src/app/api/items/route')
      const id = await createItem(route.POST)

      const request = { json: async () => ({ id, event: 'activate' }) } as Request
      const response = await route.PATCH(request)

      expect(response.status).toBe(200)
      expect(response.data.status).toBe('active')
    })

    test('rejects a disallowed transition with 409', async () => {
      const route = await import('../src/app/api/items/route')
      const id = await createItem(route.POST)

      // completing a pending item is not allowed
      const request = { json: async () => ({ id, event: 'complete' }) } as Request
      const response = await route.PATCH(request)

      expect(response.status).toBe(409)
      expect(response.data.error).toContain('not allowed')
    })

    test('returns 404 for an unknown item', async () => {
      const { PATCH } = await import('../src/app/api/items/route')

      const request = { json: async () => ({ id: '999', event: 'activate' }) } as Request
      const response = await PATCH(request)

      expect(response.status).toBe(404)
      expect(response.data.error).toContain('not found')
    })

    test('validates the event against the allowed set', async () => {
      const { PATCH } = await import('../src/app/api/items/route')

      const request = { json: async () => ({ id: '1', event: 'explode' }) } as Request
      const response = await PATCH(request)

      expect(response.status).toBe(400)
      expect(response.data.error).toBe('Validation failed')
      expect(response.data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'event' }),
        ])
      )
    })

    test('requires an item id', async () => {
      const { PATCH } = await import('../src/app/api/items/route')

      const request = { json: async () => ({ event: 'activate' }) } as Request
      const response = await PATCH(request)

      expect(response.status).toBe(400)
      expect(response.data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'id' }),
        ])
      )
    })
  })
})
