import { ItemService } from '../src/services/item-service'
import { render } from '@testing-library/react'
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
    { id: '1', name: 'Item One', status: 'active', description: 'First item', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    { id: '2', name: 'Item Two', status: 'pending', createdAt: '2024-01-02', updatedAt: '2024-01-02' },
  ]

  test('renders items in normal mode with status and description', () => {
    const { container } = render(<ItemList items={mockItems} />)
    expect(container.textContent).toContain('Item One')
    expect(container.textContent).toContain('active')
    expect(container.textContent).toContain('First item')
  })

  test('renders items in compact mode without status and description', () => {
    const { container } = render(<ItemList items={mockItems} compact={true} />)
    expect(container.textContent).toContain('Item One')
    expect(container.textContent).toContain('Item Two')
    expect(container.textContent).not.toContain('active')
    expect(container.textContent).not.toContain('First item')
  })

  test('shows no items message when list is empty', () => {
    const { container } = render(<ItemList items={[]} />)
    expect(container.textContent).toContain('No items found')
  })
})
