import { NextResponse } from 'next/server'
import { DataSource } from '@/models/data-source'

const dataSources: DataSource[] = []
let nextId = 1

export async function GET() {
  return NextResponse.json(dataSources)
}

export async function POST(request: Request) {
  const data = await request.json()
  const dataSource: DataSource = {
    ...data,
    id: String(nextId++),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  dataSources.push(dataSource)
  return NextResponse.json(dataSource, { status: 201 })
}
