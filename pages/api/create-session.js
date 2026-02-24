// pages/api/create-session.js
import { serialize } from 'cookie';
import { encodeSession } from '../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { publicToken, accessType, accessPin } = req.body;

  if (!publicToken || !accessType || !accessPin) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Generate a random session ID
    const sessionId = generateSessionId();

    // Store session data in cookie (encrypted)
    const sessionData = {
      id: sessionId,
      token: publicToken,
      access: accessType,
      pin: accessPin,
      created: Date.now(),
      expires: Date.now() + (8 * 60 * 60 * 1000) // 8 hours
    };

    // Encode and sign session data
    const encodedSession = encodeSession(sessionData);

    // Set HTTP-only cookie
    const cookie = serialize('portal_session', encodedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/'
    });

    res.setHeader('Set-Cookie', cookie);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Session creation error:', err);
    return res.status(500).json({ error: 'Failed to create session' });
  }
}

function generateSessionId() {
  return crypto.randomUUID();
}