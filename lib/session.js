// lib/session.js

/**
 * Get session from server-side (API routes, getServerSideProps)
 */
export function getSession(req) {
  const cookie = req.cookies?.portal_session;
  
  if (!cookie) {
    return null;
  }

  try {
    const decoded = Buffer.from(cookie, 'base64').toString('utf-8');
    const session = JSON.parse(decoded);

    // Check if session is expired
    if (session.expires < Date.now()) {
      return null;
    }

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

    // Parse cookies
    const cookieObj = {};
    cookies.split(';').forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      cookieObj[key] = value;
    });

    const encodedSession = cookieObj['portal_session'];
    if (!encodedSession) return null;

    // Decode session
    const sessionJson = atob(encodedSession);
    const session = JSON.parse(sessionJson);

    // Check if expired
    if (session.expires && Date.now() > session.expires) {
      return null;
    }

    return session;
  } catch (error) {
    console.error('Client session parse error:', error);
    return null;
  }
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', 'portal_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly');
}