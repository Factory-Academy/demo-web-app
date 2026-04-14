export interface Item {
  id: string
  name: string
  description?: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface ItemCreate {
  name: string
  description?: string
  status?: string
}
