import { BackupJob } from '@/models/backup-job'

export interface ScheduleConfig {
  intervalHours: number
  retentionDays: number
  maxConcurrent: number
  compressionEnabled: boolean
}

export interface ScheduleResult {
  jobId: string
  nextRunAt: Date
  estimatedDurationMinutes: number
  windowOpen: boolean
}

export class BackupScheduler {
  private config: ScheduleConfig

  constructor(config: ScheduleConfig) {
    this.config = config
  }

  scheduleNext(job: BackupJob): ScheduleResult {
    const lastRun = new Date(job.createdAt)
    const nextRun = new Date(lastRun.getTime() + this.config.intervalHours * 3600000)
    const estimatedDuration = this.estimateDuration(job)
    const windowOpen = this.isInBackupWindow(nextRun)

    return {
      jobId: job.id,
      nextRunAt: nextRun,
      estimatedDurationMinutes: estimatedDuration,
      windowOpen,
    }
  }

  estimateDuration(job: BackupJob): number {
    const baseDuration = 30
    const priorityMultiplier = Math.max(1, 5 - job.priority)
    const compressionOverhead = this.config.compressionEnabled ? 1.2 : 1.0
    return Math.ceil(baseDuration * priorityMultiplier * compressionOverhead)
  }

  isInBackupWindow(date: Date): boolean {
    const hour = date.getHours()
    return hour >= 22 || hour < 6
  }

  calculateStorageNeeded(jobs: BackupJob[]): {
    totalGB: number
    peakConcurrent: number
    estimatedCostPerMonth: number
  } {
    const avgSizeGB = 50
    const totalGB = jobs.length * avgSizeGB * this.config.retentionDays
    const peakConcurrent = Math.min(jobs.length, this.config.maxConcurrent)
    const costPerGBMonth = 0.023
    const estimatedCostPerMonth = totalGB * costPerGBMonth

    return { totalGB, peakConcurrent, estimatedCostPerMonth }
  }

  prioritizeJobs(jobs: BackupJob[]): BackupJob[] {
    return [...jobs].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }

  getRetentionExpiry(job: BackupJob): Date {
    const created = new Date(job.createdAt)
    return new Date(created.getTime() + this.config.retentionDays * 86400000)
  }

  isExpired(job: BackupJob): boolean {
    return this.getRetentionExpiry(job) < new Date()
  }
}
