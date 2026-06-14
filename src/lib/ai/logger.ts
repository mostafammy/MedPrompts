/**
 * Structured JSON logger for edge runtime
 */
export const logger = {
  info: (event: string, data?: Record<string, unknown>) => {
    console.info(JSON.stringify({ timestamp: new Date().toISOString(), level: 'INFO', event, ...data }));
  },
  warn: (event: string, data?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ timestamp: new Date().toISOString(), level: 'WARN', event, ...data }));
  },
  error: (event: string, data?: Record<string, unknown>) => {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'ERROR', event, ...data }));
  },
};
