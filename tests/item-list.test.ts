import { ItemList } from '../src/components/item-list'
import type { Item } from '../src/models/item'

describe('ItemList', () => {
  const items: Item[] = [
    {
      id: 'item-1',
      name: 'First item',
      description: 'Details',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ]

  test('renders full list layout by default', () => {
    const element = ItemList({ items })

    expect(element.type).toBe('ul')
    expect(element.props.className).toBe('divide-y')

    const firstItem = element.props.children[0]
    expect(firstItem.props.className).toBe('py-3')
  })

  test('renders compact list layout when compact is true', () => {
    const element = ItemList({ items, compact: true })

    expect(element.type).toBe('ul')
    expect(element.props.className).toBe('')

    const firstItem = element.props.children[0]
    expect(firstItem.props.className).toBe('py-1')

    const content = firstItem.props.children
    expect(content.type).toBe('span')
    expect(content.props.className).toBe('text-sm')
    expect(content.props.children).toBe('First item')
  })
})
