// lib/session.js
import crypto from 'crypto';

function getSecret() {
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET env var is not set');
  return process.env.SESSION_SECRET;
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

/**
 * Encode and sign session data for use in a cookie.
 * Format: base64(json).hmac-sha256-hex
 */
export function encodeSession(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64');
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

function verifyAndDecode(value) {
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
export function getSession(req) {
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

/**
 * Get session from client-side (browser JavaScript)
 */
export function getClientSession() {
  if (typeof document === 'undefined') return null;

  try {
    const cookies = document.cookie;
    if (!cookies) return null;

    const cookieObj = {};
    cookies.split(';').forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      cookieObj[key] = value;
    });

    const encodedSession = cookieObj['portal_session'];
    if (!encodedSession) return null;

    // Decode session (strip signature if present)
    const dotIndex = encodedSession.lastIndexOf('.');
    const payload = dotIndex !== -1 ? encodedSession.slice(0, dotIndex) : encodedSession;
    const session = JSON.parse(atob(payload));

    if (session.expires && Date.now() > session.expires) return null;

    return session;
  } catch (error) {
    console.error('Client session parse error:', error);
    return null;
  }
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', 'portal_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly');
}
