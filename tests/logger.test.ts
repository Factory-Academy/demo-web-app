import { createLogger, LogLevel } from '../src/lib/logger'

describe('StructuredLogger', () => {
  const now = () => new Date('2024-03-01T12:00:00.000Z')

  test('writes JSON with bindings, context, and reserved fields', () => {
    const output: Array<{ line: string; level: LogLevel }> = []
    const logger = createLogger(
      { service: 'demo-web-app' },
      {
        now,
        write: (line, level) => output.push({ line, level }),
      },
    )

    logger.info('Item listed', {
      event: 'item.listed',
      itemId: 'item-1',
      level: 'error',
    })

    expect(output).toHaveLength(1)
    expect(output[0].level).toBe('info')
    expect(JSON.parse(output[0].line)).toEqual({
      service: 'demo-web-app',
      event: 'item.listed',
      itemId: 'item-1',
      timestamp: '2024-03-01T12:00:00.000Z',
      level: 'info',
      message: 'Item listed',
    })
  })

  test('child loggers merge persistent bindings', () => {
    const lines: string[] = []
    const logger = createLogger(
      { service: 'demo-web-app', environment: 'test' },
      { now, write: (line) => lines.push(line) },
    ).child({ component: 'items-api', environment: 'local' })

    logger.warn('Slow request', { durationMs: 250 })

    expect(JSON.parse(lines[0])).toMatchObject({
      service: 'demo-web-app',
      environment: 'local',
      component: 'items-api',
      durationMs: 250,
      level: 'warn',
    })
  })

  test('serializes Error details', () => {
    const lines: string[] = []
    const logger = createLogger({}, { now, write: (line) => lines.push(line) })

    logger.error('Request failed', new TypeError('Invalid payload'), {
      event: 'request.failed',
    })

    expect(JSON.parse(lines[0])).toMatchObject({
      event: 'request.failed',
      level: 'error',
      error: {
        name: 'TypeError',
        message: 'Invalid payload',
      },
    })
  })

  test('preserves non-Error failure values', () => {
    const lines: string[] = []
    const logger = createLogger({}, { now, write: (line) => lines.push(line) })

    logger.error('Request failed', 'connection closed')

    expect(JSON.parse(lines[0]).error).toBe('connection closed')
  })

  test.each(['info', 'warn', 'error'] as const)(
    'uses console.%s by default',
    (level) => {
      const consoleMethod = jest
        .spyOn(console, level)
        .mockImplementation(() => undefined)
      const logger = createLogger()

      if (level === 'error') {
        logger.error('Default output', new Error('failure'))
      } else {
        logger[level]('Default output')
      }

      expect(consoleMethod).toHaveBeenCalledWith(
        expect.stringContaining(`"level":"${level}"`),
      )
    },
  )
})
