// ==========================================================================
// /lib/logger.ts
// Production-safe logger. Replaces raw console.log throughout the app.
// Only logs in development. Silent in production.
// ==========================================================================

const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args)
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args)
  },
  error: (...args: any[]) => {
    // Errors ALWAYS log (you want to know about prod errors)
    // But strip sensitive data
    console.error(...args)
  },
  info: (...args: any[]) => {
    if (isDev) console.info(...args)
  },
  debug: (...args: any[]) => {
    if (isDev) console.debug(...args)
  },
}

export default logger
