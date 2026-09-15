import React from 'react'
import { render, screen } from '@testing-library/react'
import { ItemService } from '../src/services/item-service'
import { ItemList } from '../src/components/item-list'
import { IFeatureFlagProvider } from '../src/models/feature-flag'
import { Item } from '../src/models/item'

// Mock feature flag provider for testing
class MockFeatureFlagProvider implements IFeatureFlagProvider {
  private flags: Map<string, boolean> = new Map()

  setFlag(key: string, value: boolean): void {
    this.flags.set(key, value)
  }

  isEnabled(key: string): boolean {
    return this.flags.get(key) || false
  }

  isEnabledWithDefault(key: string, defaultValue: boolean): boolean {
    return this.flags.has(key) ? this.flags.get(key)! : defaultValue
  }

  getAllFlags(): Record<string, boolean> {
    return Object.fromEntries(this.flags)
  }
}

describe('ItemService', () => {
  describe('calculatePriority', () => {
    test('returns high priority for urgent items', () => {
      const service = new ItemService()
      const item = { name: 'Task', status: 'urgent' as const, createdAt: new Date() }
      const priority = service.calculatePriority(item)
      expect(['high', 'critical']).toContain(priority)
    })
  })

  describe('validate - basic validation', () => {
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

    test('validate rejects invalid status', () => {
      const result = service.validate({ name: 'Test', status: 'unknown' })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid status')
    })
  })

  describe('validate - enhanced validation feature flag', () => {
    test('applies enhanced validation when flag is enabled', () => {
      const mockFlags = new MockFeatureFlagProvider()
      mockFlags.setFlag('enhanced_validation', true)
      const service = new ItemService(mockFlags)

      const result = service.validate({ name: 'ab' })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Name must be at least 3 characters')
    })

    test('skips enhanced validation when flag is disabled', () => {
      const mockFlags = new MockFeatureFlagProvider()
      mockFlags.setFlag('enhanced_validation', false)
      const service = new ItemService(mockFlags)

      const result = service.validate({ name: 'ab', status: 'active' })
      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    test('enforces max name length when enhanced validation enabled', () => {
      const mockFlags = new MockFeatureFlagProvider()
      mockFlags.setFlag('enhanced_validation', true)
      const service = new ItemService(mockFlags)

      const longName = 'a'.repeat(101)
      const result = service.validate({ name: longName })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Name must not exceed 100 characters')
    })

    test('enforces max description length when enhanced validation enabled', () => {
      const mockFlags = new MockFeatureFlagProvider()
      mockFlags.setFlag('enhanced_validation', true)
      const service = new ItemService(mockFlags)

      const longDescription = 'a'.repeat(501)
      const result = service.validate({ name: 'Valid Name', description: longDescription })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Description must not exceed 500 characters')
    })

    test('allows valid item with enhanced validation enabled', () => {
      const mockFlags = new MockFeatureFlagProvider()
      mockFlags.setFlag('enhanced_validation', true)
      const service = new ItemService(mockFlags)

      const result = service.validate({ 
        name: 'Valid Item Name',
        description: 'A valid description',
        status: 'active'
      })
      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })
  })
})

describe('ItemList', () => {
  const item: Item = {
    id: '1',
    name: 'Test item',
    description: 'Shown in full mode',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }

  test('renders description by default', () => {
    render(React.createElement(ItemList, { items: [item] }))
    expect(screen.queryByText('Shown in full mode')).not.toBeNull()
  })

  test('hides description in compact mode', () => {
    render(React.createElement(ItemList, { items: [item], compact: true }))
    expect(screen.queryByText('Shown in full mode')).toBeNull()
  })
})
