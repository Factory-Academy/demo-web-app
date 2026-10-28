import { schemaLite, validateSchema, ValidationResult } from '@/validation/schema-lite'

const validStatuses = ['active', 'pending', 'completed'] as const
type ItemStatus = (typeof validStatuses)[number]

type ItemCreateInput = {
  name: string
  description?: string
  status?: ItemStatus
}

export function validateItemCreate(input: unknown): ValidationResult<ItemCreateInput> {
  return validateSchema<ItemCreateInput>(input, {
    name: schemaLite.string({ trim: true }),
    description: schemaLite.optionalString({ trim: true }),
    status: schemaLite.optionalEnum<ItemStatus>([...validStatuses]),
  })
}

export { validStatuses }
