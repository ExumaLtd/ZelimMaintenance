// lib/session.js
//
// Session cookie format: base64(JSON payload).hmac-sha256-hex(payload)
//
// The payload is base64-encoded and HMAC-signed, it is NOT encrypted. The
// signature prevents tampering: a client cannot change the token, access type,
// PIN or expiry without invalidating it. But anyone who can read the raw cookie
// value can base64-decode the JSON, which includes the access PIN. So
// confidentiality relies on the cookie being httpOnly and Secure and sent only
// over TLS, not on the payload being secret. The PIN is embedded deliberately so
// the server can scope drafts and submissions to the access code without an
// extra Airtable lookup on every request.
import crypto from 'crypto';
import { requireEnv } from './env';

// Asserted at module load so a missing secret fails on deploy rather than on a
// technician's first login attempt.
const SESSION_SECRET = requireEnv('SESSION_SECRET');

function sign(payload: string) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
}

/**
 * Encode and sign session data for use in a cookie.
 * Format: base64(json).hmac-sha256-hex
 */
export function encodeSession(data: Record<string, any>) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64');
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

function verifyAndDecode(value: string) {
  const dotIndex = value.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const payload = value.slice(0, dotIndex);
  const sig = value.slice(dotIndex + 1);

  const expected = sign(payload);
  const expectedBuf = Buffer.from(expected, 'hex');
  const sigBuf = Buffer.from(sig, 'hex');

  // Constant-time comparison to prevent timing attacks
  if (expectedBuf.length !== sigBuf.length) return null;
  if (!crypto.timingSafeEqual(expectedBuf, sigBuf)) return null;

  return JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
}

/**
 * Get session from server-side (API routes, getServerSideProps)
 */
export function getSession(req: { cookies?: Partial<Record<string, string>> }) {
  const cookie = req.cookies?.portal_session;
  if (!cookie) return null;

  try {
    const session = verifyAndDecode(cookie);
    if (!session) return null;
    if (session.expires < Date.now()) return null;
    return session;
  } catch (error) {
    console.error('Session decode error:', error);
    return null;
  }
}
