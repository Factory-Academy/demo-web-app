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
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Second Item',
      description: 'Second description',
      status: 'pending',
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    },
  ]

  test('renders empty state when no items provided', () => {
    render(<ItemList items={[]} />)
    expect(screen.getByText('No items found.')).toBeInTheDocument()
  })

  test('renders items in default mode with descriptions', () => {
    render(<ItemList items={mockItems} />)
    expect(screen.getByText('First Item')).toBeInTheDocument()
    expect(screen.getByText('First description')).toBeInTheDocument()
    expect(screen.getByText('Second Item')).toBeInTheDocument()
    expect(screen.getByText('Second description')).toBeInTheDocument()
  })

  test('renders items in compact mode without descriptions', () => {
    render(<ItemList items={mockItems} compact={true} />)
    expect(screen.getByText('First Item')).toBeInTheDocument()
    expect(screen.queryByText('First description')).not.toBeInTheDocument()
    expect(screen.getByText('Second Item')).toBeInTheDocument()
    expect(screen.queryByText('Second description')).not.toBeInTheDocument()
  })

  test('renders items in compact mode when compact prop is explicitly false', () => {
    render(<ItemList items={mockItems} compact={false} />)
    expect(screen.getByText('First description')).toBeInTheDocument()
    expect(screen.getByText('Second description')).toBeInTheDocument()
  })

  test('displays status for each item in both modes', () => {
    const { rerender } = render(<ItemList items={mockItems} />)
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()

    rerender(<ItemList items={mockItems} compact={true} />)
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
  })
})
