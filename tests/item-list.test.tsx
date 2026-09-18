import { render, screen } from '@testing-library/react'
import { ItemList } from '../src/components/item-list'
import { Item } from '../src/models/item'

describe('ItemList', () => {
  const mockItems: Item[] = [
    {
      id: '1',
      name: 'Test Item',
      description: 'Test Description',
      status: 'active',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ]

  test('renders items with description by default', () => {
    render(<ItemList items={mockItems} />)
    expect(screen.getByText('Test Item')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  test('hides description in compact mode', () => {
    render(<ItemList items={mockItems} compact={true} />)
    expect(screen.getByText('Test Item')).toBeInTheDocument()
    expect(screen.queryByText('Test Description')).not.toBeInTheDocument()
  })

  test('renders empty state when no items', () => {
    render(<ItemList items={[]} />)
    expect(screen.getByText('No items found.')).toBeInTheDocument()
  })
})
