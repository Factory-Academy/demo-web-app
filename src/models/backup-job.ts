export interface BackupJob {
  id: string
  name: string
  dataSourceId: string
  priority: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface BackupJobCreate {
  name: string
  dataSourceId: string
  priority?: number
  notes?: string
}
