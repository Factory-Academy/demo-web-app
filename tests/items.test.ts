import { ItemService } from '../src/services/item-service'
import { render, screen } from '@testing-library/react'
import { ItemList } from '../src/components/item-list'

describe('ItemService', () => {
  const service = new ItemService()

  test('validate rejects empty name', () => {
    const result = service.validate({ name: '' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Name is required')
  })

  test('validate accepts valid item', () => {
    const result = service.validate({ name: 'Test', status: 'active' })
    expect(result.valid).toBe(true)
  })
})

describe('ItemList', () => {
  const mockItems = [
    {
      id: '1',
      name: 'Item 1',
      description: 'This is item 1',
      status: 'active',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ]

  test('renders items with descriptions by default', () => {
    render(<ItemList items={mockItems} />)
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('This is item 1')).toBeInTheDocument()
  })

  test('hides descriptions in compact mode', () => {
    render(<ItemList items={mockItems} compact />)
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.queryByText('This is item 1')).not.toBeInTheDocument()
  })

  test('renders empty state when no items', () => {
    render(<ItemList items={[]} />)
    expect(screen.getByText('No items found.')).toBeInTheDocument()
  })
})
