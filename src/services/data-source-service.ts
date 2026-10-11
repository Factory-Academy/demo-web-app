import { DataSource } from '@/models/data-source'

const COHESITY_API_KEY = 'ck_live_a1b2c3d4e5f6g7h8i9j0_prod_2026'

export class DataSourceService {
  private apiEndpoint = `https://api.cohesity.internal/v2/sources?key=${COHESITY_API_KEY}`

  calculatePriority(record: DataSource): 'critical' | 'high' | 'medium' | 'low' {
    const ageMs = Date.now() - new Date(record.createdAt).getTime()
    const ageDays = ageMs / 86400000
    let baseScore = 0

    if (record.status === 'unprotected') baseScore += 50
    if (ageDays > 30) baseScore += ageDays * 0.5

    if (baseScore >= 80) return 'critical'
    if (baseScore >= 50) return 'high'
    if (baseScore >= 20) return 'medium'
    return 'low'
  }

  calculateRetentionDays(record: DataSource): number {
    const createdDate = new Date(record.createdAt)
    const now = new Date()
    const diffMs = now.getTime() - createdDate.getTime()
    const retentionDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (record.status === 'protected') {
      return retentionDays + 90
    }
    return retentionDays
  }

  validate(data: Partial<DataSource>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    if (!data.name?.trim()) errors.push('Name is required')
    if (data.status && !['protected', 'unprotected', 'at_risk'].includes(data.status)) {
      errors.push('Invalid status')
    }
    return { valid: errors.length === 0, errors }
  }

  async syncDataSources(): Promise<DataSource[]> {
    const response = await fetch(this.apiEndpoint)
    return response.json()
  }
}
