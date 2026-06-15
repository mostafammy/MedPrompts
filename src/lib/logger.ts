export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: unknown, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

export const ConsoleLogger: Logger = {
  info: (msg, ctx) => {
    // eslint-disable-next-line no-restricted-syntax
    console.log(JSON.stringify({ level: 'info', message: msg, ...ctx }));
  },
  error: (msg, err, ctx) => {
    // eslint-disable-next-line no-restricted-syntax
    console.error(JSON.stringify({ level: 'error', message: msg, error: err instanceof Error ? err.message : err, ...ctx }));
  },
  warn: (msg, ctx) => {
    // eslint-disable-next-line no-restricted-syntax
    console.warn(JSON.stringify({ level: 'warn', message: msg, ...ctx }));
  },
  debug: (msg, ctx) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-restricted-syntax
      console.debug(JSON.stringify({ level: 'debug', message: msg, ...ctx }));
    }
  }
};
