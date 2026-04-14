export interface Widget {
  id: string
  name: string
  itemId: string
  priority: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface WidgetCreate {
  name: string
  itemId: string
  priority?: number
  notes?: string
}
