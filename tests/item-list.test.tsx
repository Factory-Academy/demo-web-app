import { render, screen } from '@testing-library/react'
import { ItemList } from '../src/components/item-list'
import { Item } from '../src/models/item'

describe('ItemList', () => {
  const mockItems: Item[] = [
    {
      id: '1',
      name: 'First Item',
      description: 'First description',
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Second Item',
      description: 'Second description',
      status: 'pending',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
  ]

  test('renders items in default mode', () => {
    const { container } = render(<ItemList items={mockItems} />)
    
    expect(screen.getByText('First Item')).toBeTruthy()
    expect(screen.getByText('Second Item')).toBeTruthy()
    expect(screen.getByText('First description')).toBeTruthy()
    expect(screen.getByText('Second description')).toBeTruthy()
    expect(screen.getByText('active')).toBeTruthy()
    expect(screen.getByText('pending')).toBeTruthy()
    
    const list = container.querySelector('ul')
    expect(list?.className).toContain('divide-y')
    
    const listItems = container.querySelectorAll('li')
    expect(listItems[0]?.className).toContain('py-3')
  })

  test('renders items in compact mode', () => {
    const { container } = render(<ItemList items={mockItems} compact={true} />)
    
    expect(screen.getByText('First Item')).toBeTruthy()
    expect(screen.getByText('Second Item')).toBeTruthy()
    
    // In compact mode, descriptions and status should not be rendered
    expect(screen.queryByText('First description')).toBeFalsy()
    expect(screen.queryByText('Second description')).toBeFalsy()
    expect(screen.queryByText('active')).toBeFalsy()
    expect(screen.queryByText('pending')).toBeFalsy()
    
    const list = container.querySelector('ul')
    expect(list?.className).not.toContain('divide-y')
    
    const listItems = container.querySelectorAll('li')
    expect(listItems[0]?.className).toContain('py-1')
  })

  test('renders empty state when no items', () => {
    render(<ItemList items={[]} />)
    expect(screen.getByText('No items found.')).toBeTruthy()
  })

  test('renders item without description in default mode', () => {
    const itemsWithoutDescription: Item[] = [
      {
        id: '1',
        name: 'Item',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]
    
    render(<ItemList items={itemsWithoutDescription} />)
    expect(screen.getByText('Item')).toBeTruthy()
    expect(screen.getByText('active')).toBeTruthy()
  })
})
