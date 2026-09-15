export type LogLevel = 'info' | 'warn' | 'error'

export type LogContext = Record<string, unknown>

export interface LogRecord extends LogContext {
  timestamp: string
  level: LogLevel
  message: string
}

type LogWriter = (line: string, level: LogLevel) => void

interface LoggerOptions {
  now?: () => Date
  write?: LogWriter
}

const defaultWriter: LogWriter = (line, level) => {
  console[level](line)
}

function serializeError(error: unknown): unknown {
  if (!(error instanceof Error)) return error

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  }
}

export class StructuredLogger {
  constructor(
    private readonly bindings: LogContext = {},
    private readonly options: LoggerOptions = {},
  ) {}

  child(bindings: LogContext): StructuredLogger {
    return new StructuredLogger(
      { ...this.bindings, ...bindings },
      this.options,
    )
  }

  info(message: string, context: LogContext = {}): void {
    this.emit('info', message, context)
  }

  warn(message: string, context: LogContext = {}): void {
    this.emit('warn', message, context)
  }

  error(
    message: string,
    error: unknown,
    context: LogContext = {},
  ): void {
    this.emit('error', message, {
      ...context,
      error: serializeError(error),
    })
  }

  private emit(
    level: LogLevel,
    message: string,
    context: LogContext,
  ): void {
    const record: LogRecord = {
      ...this.bindings,
      ...context,
      timestamp: (this.options.now ?? (() => new Date()))().toISOString(),
      level,
      message,
    }

    const write = this.options.write ?? defaultWriter
    write(JSON.stringify(record), level)
  }
}

export function createLogger(
  bindings: LogContext = {},
  options: LoggerOptions = {},
): StructuredLogger {
  return new StructuredLogger(bindings, options)
}
