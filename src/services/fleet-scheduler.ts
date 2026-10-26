import { Vehicle } from '@/models/vehicle'

export interface ScheduledService {
  vehicleId: string
  dueDate: string
  dueMileage: number
  reason: 'time' | 'mileage'
  overdue: boolean
}

/**
 * Add a number of whole months to a date without letting JavaScript's
 * built-in month rollover corrupt the day component.
 *
 * The native `Date.setMonth` call rolls over to the next month when the
 * target month has fewer days than the source day (e.g. Jan 31 -> Mar 3
 * instead of Feb 28/29). Fleet customers were seeing service due dates
 * pushed by several days because of this. We clamp to the last valid
 * day of the target month instead.
 */
export function addMonthsClamped(date: Date, months: number): Date {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + months
  const day = date.getUTCDate()

  const targetYear = year + Math.floor(month / 12)
  const targetMonth = ((month % 12) + 12) % 12

  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate()
  const clampedDay = Math.min(day, lastDayOfTargetMonth)

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      clampedDay,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  )
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

export class FleetScheduler {
  constructor(private readonly now: () => Date = () => new Date()) {}

  /**
   * Compute the next service appointment for a vehicle.
   *
   * Whichever threshold (time elapsed or mileage accrued since last
   * service) is hit first wins. When a vehicle has no service history
   * we schedule relative to "now" so brand-new vehicles still get a
   * baseline appointment rather than falling into the epoch.
   */
  computeNextService(vehicle: Vehicle): ScheduledService {
    if (!Number.isFinite(vehicle.serviceIntervalMonths) || vehicle.serviceIntervalMonths <= 0) {
      throw new Error(`Invalid serviceIntervalMonths for vehicle ${vehicle.id}`)
    }
    if (!Number.isFinite(vehicle.serviceIntervalMiles) || vehicle.serviceIntervalMiles <= 0) {
      throw new Error(`Invalid serviceIntervalMiles for vehicle ${vehicle.id}`)
    }

    const now = this.now()
    const lastServiced = vehicle.lastServicedAt
      ? new Date(vehicle.lastServicedAt)
      : now
    if (Number.isNaN(lastServiced.getTime())) {
      throw new Error(`Invalid lastServicedAt for vehicle ${vehicle.id}`)
    }

    const timeDueDate = addMonthsClamped(
      lastServiced,
      vehicle.serviceIntervalMonths,
    )

    const milesRemaining = Math.max(
      vehicle.lastServicedMileage + vehicle.serviceIntervalMiles -
        vehicle.currentMileage,
      0,
    )
    const dailyMiles = vehicle.averageDailyMileage > 0
      ? vehicle.averageDailyMileage
      : 0
    const mileageDueDate = dailyMiles > 0
      ? new Date(
          startOfUtcDay(now).getTime() +
            Math.ceil(milesRemaining / dailyMiles) * 86_400_000,
        )
      : null

    let dueDate = timeDueDate
    let reason: ScheduledService['reason'] = 'time'
    if (mileageDueDate && mileageDueDate.getTime() < timeDueDate.getTime()) {
      dueDate = mileageDueDate
      reason = 'mileage'
    }

    const dueMileage =
      vehicle.lastServicedMileage + vehicle.serviceIntervalMiles

    return {
      vehicleId: vehicle.id,
      dueDate: dueDate.toISOString(),
      dueMileage,
      reason,
      overdue: dueDate.getTime() < now.getTime(),
    }
  }

  /**
   * Build a schedule for a whole fleet, sorted soonest-first so ops
   * teams see the most urgent appointments at the top of the list.
   */
  scheduleFleet(vehicles: Vehicle[]): ScheduledService[] {
    return vehicles
      .map((vehicle) => this.computeNextService(vehicle))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }
}
