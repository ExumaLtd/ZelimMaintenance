// Development-only debug logger. No-ops in production.
const DEBUG = process.env.NODE_ENV === 'development';

export const dlog = (...args: any[]) => { if (DEBUG) console.log(...args); };
