jest.mock('../src/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
  })),
}))

import { GET, POST } from '../src/app/api/items/route'
import { createLogger } from '../src/lib/logger'

const mockLogger = jest.mocked(createLogger).mock.results[0].value as unknown as {
  info: jest.Mock
  error: jest.Mock
}

describe('items API logging', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('logs item creation without including the request body', async () => {
    const request = new Request('http://localhost/api/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Logged item',
        description: 'Do not include this in logs',
        status: 'active',
      }),
    })

    const response = await POST(request)
    const item = await response.json()

    expect(response.status).toBe(201)
    expect(mockLogger.info).toHaveBeenCalledWith('Item created', {
      event: 'item.created',
      itemId: item.id,
      status: 'active',
    })
    expect(JSON.stringify(mockLogger.info.mock.calls)).not.toContain(
      'Do not include this in logs',
    )
  })

  test('logs the item count when listing items', async () => {
    const response = await GET()
    const items = await response.json()

    expect(mockLogger.info).toHaveBeenCalledWith('Items listed', {
      event: 'items.listed',
      itemCount: items.length,
    })
  })

  test('logs malformed JSON failures and preserves the rejection', async () => {
    const request = new Request('http://localhost/api/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{invalid',
    })

    await expect(POST(request)).rejects.toMatchObject({
      name: 'SyntaxError',
    })
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Item creation failed',
      expect.objectContaining({ name: 'SyntaxError' }),
      { event: 'item.create_failed' },
    )
  })
})
