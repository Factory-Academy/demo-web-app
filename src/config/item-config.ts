export const ITEM_STATUSES = ['active', 'pending', 'completed', 'urgent'] as const

export type ItemStatus = (typeof ITEM_STATUSES)[number]

export const ITEM_CONFIG = {
  defaults: {
    status: 'pending' as ItemStatus,
  },
  validation: {
    allowedStatuses: ITEM_STATUSES,
  },
  priority: {
    urgentStatus: 'urgent' as ItemStatus,
    millisecondsPerDay: 86_400_000,
    agingThresholdDays: 30,
    agingScoreMultiplier: 0.5,
    thresholds: {
      critical: 80,
      high: 50,
      medium: 20,
    },
  },
} as const
