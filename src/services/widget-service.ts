import { Widget, WidgetCreate } from '@/models/widget'
import { ServiceResult, success, failure } from './types'

export class WidgetService {
  validate(data: Partial<WidgetCreate>): ServiceResult<void> {
    const errors: string[] = []
    if (!data.name?.trim()) errors.push('Widget name is required')
    if (!data.itemId) errors.push('Item ID is required')
    if (data.priority !== undefined && (data.priority < 0 || data.priority > 100)) {
      errors.push('Priority must be between 0 and 100')
    }
    return errors.length === 0 ? success(undefined) : failure(errors)
  }

  create(data: WidgetCreate): ServiceResult<Widget> {
    const validation = this.validate(data)
    if (!validation.success) {
      return failure(validation.errors)
    }

    const widget: Widget = {
      id: Math.random().toString(36).substring(7),
      name: data.name,
      itemId: data.itemId,
      priority: data.priority ?? 0,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return success(widget)
  }
}
