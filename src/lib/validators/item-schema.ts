import { Schema, validators } from './schema'
import { ItemCreate } from '@/models/item'

/**
 * Validation schema for ItemCreate requests
 */
export const itemCreateSchema: Schema<ItemCreate> = {
  name: validators.string,
  description: validators.stringOptional,
  status: validators.enumOptional(['active', 'pending', 'completed']),
}
