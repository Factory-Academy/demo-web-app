import { NextResponse } from 'next/server'

export class ValidationError extends Error {
  readonly details: string[]

  constructor(message: string, details: string[] = []) {
    super(message)
    Object.setPrototypeOf(this, ValidationError.prototype)
    this.name = 'ValidationError'
    this.details = details
  }
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details,
      },
      { status: 400 }
    )
  }

  return NextResponse.json(
    {
      error: 'Internal server error',
    },
    { status: 500 }
  )
}
