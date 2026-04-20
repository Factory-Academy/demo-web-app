export type ServiceCadence = 'standard' | 'heavy-use' | 'light-use'

export interface Vehicle {
  id: string
  vin: string
  make: string
  model: string
  year: number
  currentMileage: number
  averageDailyMileage: number
  lastServicedAt: string
  lastServicedMileage: number
  serviceIntervalMonths: number
  serviceIntervalMiles: number
  cadence: ServiceCadence
}

export interface VehicleCreate {
  vin: string
  make: string
  model: string
  year: number
  currentMileage: number
  averageDailyMileage?: number
  lastServicedAt?: string
  lastServicedMileage?: number
  serviceIntervalMonths?: number
  serviceIntervalMiles?: number
  cadence?: ServiceCadence
}
