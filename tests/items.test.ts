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
      status: 'active' as const,
      description: 'Test description',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Item 2',
      status: 'pending' as const,
      description: 'Another description',
      createdAt: new Date().toISOString(),
    },
  ]

  test('renders items with descriptions by default', () => {
    render(<ItemList items={mockItems} />)
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('Another description')).toBeInTheDocument()
  })

  test('hides descriptions when compact is true', () => {
    render(<ItemList items={mockItems} compact={true} />)
    expect(screen.queryByText('Test description')).not.toBeInTheDocument()
    expect(screen.queryByText('Another description')).not.toBeInTheDocument()
  })

  test('renders empty state', () => {
    render(<ItemList items={[]} />)
    expect(screen.getByText('No items found.')).toBeInTheDocument()
  })
})
