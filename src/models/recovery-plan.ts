export interface RecoveryPlan {
  id: string
  name: string
  dataSourceIds: string[]
  rpoMinutes: number
  rtoMinutes: number
  lastTestedAt?: string
  status: 'active' | 'draft' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface RecoveryPlanCreate {
  name: string
  dataSourceIds: string[]
  rpoMinutes: number
  rtoMinutes: number
}
