export interface DataSource {
  id: string
  name: string
  description?: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface DataSourceCreate {
  name: string
  description?: string
  status?: string
}
