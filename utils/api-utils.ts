// Escape single quotes in strings used inside Airtable filterByFormula expressions.
// Prevents formula injection: a value like "O'Brien" becomes "O''Brien" which is valid Airtable syntax.
export const esc = (str) => String(str ?? '').replace(/'/g, "''");

// Extract client IP for rate limiting.
// Relies on Vercel setting x-forwarded-for at the edge — clients cannot spoof this header
// in a Vercel deployment. If you ever move off Vercel, replace with a trusted-proxy solution.
export const getClientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? '127.0.0.1';
