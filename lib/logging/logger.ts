/**
 * QAYANI Structured Logging System
 * Centralized logging with context and levels
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  duration?: number;
  [key: string]: any;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: any;
}

class Logger {
  private context: LogContext = {};

  /**
   * Set persistent context for all log messages
   */
  setContext(context: LogContext) {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear all context
   */
  clearContext() {
    this.context = {};
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, data?: any, error?: any) {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.context, ...data },
      ...(error && { error: this.serializeError(error) }),
    };

    // Console output (formatted for development, JSON for production)
    if (process.env.NODE_ENV === 'development') {
      this.consoleLog(logEntry);
    } else {
      console.log(JSON.stringify(logEntry));
    }

    // TODO: Send to external logging service
    // Options: Logtail, Axiom, CloudWatch, Datadog
    this.sendToExternalLogger(logEntry);
  }

  /**
   * Format console output for development
   */
  private consoleLog(entry: LogEntry) {
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m', // Green
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';
    const color = colors[entry.level];

    console.log(
      `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} ${entry.message}`,
      entry.context && Object.keys(entry.context).length > 0 ? entry.context : '',
      entry.error || ''
    );
  }

  /**
   * Serialize error for logging
   */
  private serializeError(error: any) {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...(error as any),
      };
    }
    return error;
  }

  /**
   * Send logs to external service
   */
  private sendToExternalLogger(entry: LogEntry) {
    // TODO: Implement external logging
    // Example with Logtail:
    // if (process.env.LOGTAIL_TOKEN) {
    //   fetch('https://in.logtail.com', {
    //     method: 'POST',
    //     headers: {
    //       'Authorization': `Bearer ${process.env.LOGTAIL_TOKEN}`,
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify(entry),
    //   }).catch(console.error);
    // }
  }

  /**
   * Debug level logging (only in development)
   */
  debug(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      this.log(LogLevel.DEBUG, message, data);
    }
  }

  /**
   * Info level logging
   */
  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Warning level logging
   */
  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: any, data?: any) {
    this.log(LogLevel.ERROR, message, data, error);
  }

  /**
   * Log API request
   */
  request(method: string, path: string, data?: any) {
    this.info(`API Request: ${method} ${path}`, data);
  }

  /**
   * Log API response
   */
  response(method: string, path: string, status: number, duration: number) {
    this.info(`API Response: ${method} ${path} ${status}`, { duration });
  }

  /**
   * Log database query
   */
  query(operation: string, table: string, duration?: number) {
    this.debug(`Database Query: ${operation} on ${table}`, { duration });
  }

  /**
   * Log external API call
   */
  externalAPI(service: string, operation: string, success: boolean, duration?: number) {
    this.info(`External API: ${service} ${operation}`, {
      success,
      duration,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

/**
 * Create logger with specific context
 */
export function createLogger(context: LogContext): Logger {
  const contextLogger = new Logger();
  contextLogger.setContext(context);
  return contextLogger;
}

/**
 * Middleware-style logger for API routes
 */
export function withLogging(
  handler: Function,
  context?: LogContext
): Function {
  return async (...args: any[]) => {
    const startTime = Date.now();
    const requestLogger = createLogger(context || {});

    try {
      const result = await handler(...args);
      const duration = Date.now() - startTime;

      requestLogger.response(
        context?.endpoint || 'unknown',
        context?.endpoint || '',
        200,
        duration
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      requestLogger.error('Request failed', error, { duration });
      throw error;
    }
  };
}
