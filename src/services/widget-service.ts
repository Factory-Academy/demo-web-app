import { Widget } from '@/models/widget'
import { validateRequiredField, collectValidationErrors } from '@/utils/validation'

export class WidgetService {
  validate(data: Partial<Widget>): { valid: boolean; errors: string[] } {
    const validationResults = [
      validateRequiredField(data.name, 'Name'),
      validateRequiredField(data.itemId, 'Item ID'),
    ]
    const errors = collectValidationErrors(validationResults)
    return { valid: errors.length === 0, errors }
  }
}
