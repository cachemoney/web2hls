import { LogLevel, Logger } from '../types';

/**
 * Default logger implementation that wraps console.
 */
class DefaultLogger implements Logger {
  private level: LogLevel = LogLevel.INFO;
  private prefix = '[web2hls]';

  /**
   * Sets the current log level.
   */
  setLevel(level: LogLevel) {
    this.level = level;
  }

  /**
   * Gets the current log level.
   */
  getLevel(): LogLevel {
    return this.level;
  }

  debug(message: string, ...args: any[]) {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`${this.prefix} DEBUG: ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.level <= LogLevel.INFO) {
      console.info(`${this.prefix} INFO: ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.level <= LogLevel.WARN) {
      console.warn(`${this.prefix} WARN: ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]) {
    if (this.level <= LogLevel.ERROR) {
      console.error(`${this.prefix} ERROR: ${message}`, ...args);
    }
  }
}

/**
 * Singleton logger instance.
 */
export const logger = new DefaultLogger();
