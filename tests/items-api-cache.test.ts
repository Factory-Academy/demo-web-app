import { GET, POST, __resetItemsForTests } from '../src/app/api/items/route'

describe('items API cache integration', () => {
  beforeEach(() => {
    __resetItemsForTests()
  })

  test('GET returns cached data and POST invalidates cache', async () => {
    const initialResponse = await GET()
    expect(await initialResponse.json()).toEqual([])

    const createRequest = new Request('http://localhost/api/items', {
      method: 'POST',
      body: JSON.stringify({ name: 'Item 1', status: 'active' }),
      headers: { 'content-type': 'application/json' },
    })

    await POST(createRequest)

    const afterCreateResponse = await GET()
    const afterCreateItems = await afterCreateResponse.json()

    expect(afterCreateItems).toHaveLength(1)
    expect(afterCreateItems[0].name).toBe('Item 1')
  })
})
