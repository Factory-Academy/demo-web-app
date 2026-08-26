import { render, screen } from '@testing-library/react'
import { ItemList } from '../src/components/item-list'
import { Item } from '../src/models/item'

describe('ItemList', () => {
  const mockItems: Item[] = [
    {
      id: '1',
      name: 'Item One',
      description: 'This is a description',
      status: 'active',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
    },
    {
      id: '2',
      name: 'Item Two',
      status: 'inactive',
      createdAt: '2024-01-03',
      updatedAt: '2024-01-04',
    },
  ]

  test('renders empty state when no items', () => {
    render(<ItemList items={[]} />)
    expect(screen.getByText('No items found.')).toBeInTheDocument()
  })

  test('renders items with description in normal mode', () => {
    render(<ItemList items={mockItems} />)
    expect(screen.getByText('Item One')).toBeInTheDocument()
    expect(screen.getByText('This is a description')).toBeInTheDocument()
  })

  test('hides description in compact mode', () => {
    render(<ItemList items={mockItems} compact={true} />)
    expect(screen.getByText('Item One')).toBeInTheDocument()
    expect(screen.queryByText('This is a description')).not.toBeInTheDocument()
  })

  test('shows status in both modes', () => {
    const { rerender } = render(<ItemList items={mockItems} />)
    expect(screen.getByText('active')).toBeInTheDocument()

    rerender(<ItemList items={mockItems} compact={true} />)
    expect(screen.getByText('active')).toBeInTheDocument()
  })
})
