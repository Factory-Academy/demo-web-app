import {
  FleetScheduler,
  addMonthsClamped,
} from '../src/services/fleet-scheduler'
import { Vehicle } from '../src/models/vehicle'

function vehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'veh-1',
    vin: '1HGCM82633A004352',
    make: 'Ford',
    model: 'Transit',
    year: 2022,
    currentMileage: 40_000,
    averageDailyMileage: 50,
    lastServicedAt: '2026-01-31T00:00:00.000Z',
    lastServicedMileage: 35_000,
    serviceIntervalMonths: 6,
    serviceIntervalMiles: 7_500,
    cadence: 'standard',
    ...overrides,
  }
}

describe('addMonthsClamped', () => {
  test('handles month-end without rolling into the next month', () => {
    const result = addMonthsClamped(new Date('2026-01-31T00:00:00.000Z'), 1)
    expect(result.toISOString()).toBe('2026-02-28T00:00:00.000Z')
  })

  test('clamps to Feb 29 in a leap year', () => {
    const result = addMonthsClamped(new Date('2024-01-31T00:00:00.000Z'), 1)
    expect(result.toISOString()).toBe('2024-02-29T00:00:00.000Z')
  })

  test('rolls year correctly when month overflows December', () => {
    const result = addMonthsClamped(new Date('2026-11-15T00:00:00.000Z'), 3)
    expect(result.toISOString()).toBe('2027-02-15T00:00:00.000Z')
  })
})

describe('FleetScheduler.computeNextService', () => {
  test('schedules time-based service six months after last service, clamped to month end', () => {
    const scheduler = new FleetScheduler(
      () => new Date('2026-04-20T00:00:00.000Z'),
    )
    const result = scheduler.computeNextService(
      vehicle({ currentMileage: 36_000, averageDailyMileage: 20 }),
    )
    expect(result.reason).toBe('time')
    expect(result.dueDate).toBe('2026-07-31T00:00:00.000Z')
    expect(result.dueMileage).toBe(42_500)
    expect(result.overdue).toBe(false)
  })

  test('mileage interval wins when the vehicle is high-use', () => {
    const scheduler = new FleetScheduler(
      () => new Date('2026-04-20T00:00:00.000Z'),
    )
    const result = scheduler.computeNextService(
      vehicle({ currentMileage: 41_500, averageDailyMileage: 200 }),
    )
    expect(result.reason).toBe('mileage')
    expect(result.overdue).toBe(false)
    const expectedDays = Math.ceil((42_500 - 41_500) / 200)
    const expectedMs =
      Date.UTC(2026, 3, 20) + expectedDays * 86_400_000
    expect(new Date(result.dueDate).getTime()).toBe(expectedMs)
  })

  test('flags overdue vehicles', () => {
    const scheduler = new FleetScheduler(
      () => new Date('2027-01-15T00:00:00.000Z'),
    )
    const result = scheduler.computeNextService(vehicle())
    expect(result.overdue).toBe(true)
  })

  test('rejects invalid intervals', () => {
    const scheduler = new FleetScheduler()
    expect(() =>
      scheduler.computeNextService(vehicle({ serviceIntervalMonths: 0 })),
    ).toThrow(/serviceIntervalMonths/)
    expect(() =>
      scheduler.computeNextService(vehicle({ serviceIntervalMiles: -1 })),
    ).toThrow(/serviceIntervalMiles/)
  })
})

describe('FleetScheduler.scheduleFleet', () => {
  test('returns soonest due dates first', () => {
    const scheduler = new FleetScheduler(
      () => new Date('2026-04-20T00:00:00.000Z'),
    )
    const schedule = scheduler.scheduleFleet([
      vehicle({
        id: 'a',
        lastServicedAt: '2026-03-01T00:00:00.000Z',
        averageDailyMileage: 0,
      }),
      vehicle({
        id: 'b',
        lastServicedAt: '2025-11-01T00:00:00.000Z',
        averageDailyMileage: 0,
      }),
      vehicle({
        id: 'c',
        lastServicedAt: '2026-01-15T00:00:00.000Z',
        averageDailyMileage: 0,
      }),
    ])
    expect(schedule.map((s) => s.vehicleId)).toEqual(['b', 'c', 'a'])
  })
})
