// lib/session.js

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

export function clearSession(res) {
  res.setHeader('Set-Cookie', 'portal_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly');
}