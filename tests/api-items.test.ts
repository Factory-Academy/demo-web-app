import { GET, POST } from '../src/app/api/items/route'
import { NextResponse } from 'next/server'

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data: unknown, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status ?? 200,
      ok: (init?.status ?? 200) >= 200 && (init?.status ?? 200) < 300,
    })),
  },
}))

describe('Items API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/items', () => {
    test('returns empty array initially', async () => {
      const response = await GET()
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe('POST /api/items', () => {
    test('creates item with valid data', async () => {
      const requestData = { name: 'Test Item', status: 'active' }
      const request = {
        json: async () => requestData,
      } as Request

      const response = await POST(request)
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Item',
          status: 'active',
          id: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
        { status: 201 },
      )
    })

    test('rejects item with empty name', async () => {
      const requestData = { name: '', status: 'active' }
      const request = {
        json: async () => requestData,
      } as Request

      const response = await POST(request)
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: 'Validation failed',
          details: expect.arrayContaining(['Name is required']),
        },
        { status: 400 },
      )
    })

    test('rejects item with invalid status', async () => {
      const requestData = { name: 'Test', status: 'invalid' }
      const request = {
        json: async () => requestData,
      } as Request

      const response = await POST(request)
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: 'Validation failed',
          details: expect.arrayContaining(['Invalid status']),
        },
        { status: 400 },
      )
    })

    test('returns all validation errors when multiple rules fail', async () => {
      const requestData = { name: '', status: 'invalid' }
      const request = {
        json: async () => requestData,
      } as Request

      const response = await POST(request)
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: 'Validation failed',
          details: expect.arrayContaining(['Name is required', 'Invalid status']),
        },
        { status: 400 },
      )
    })

    test('accepts item without optional status', async () => {
      const requestData = { name: 'Test Item' }
      const request = {
        json: async () => requestData,
      } as Request

      const response = await POST(request)
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Item',
          id: expect.any(String),
        }),
        { status: 201 },
      )
    })
  })
})
