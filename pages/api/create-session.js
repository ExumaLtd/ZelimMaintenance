// pages/api/create-session.js
import { serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { publicToken, accessType, accessPin } = req.body;

  if (!publicToken || !accessType || !accessPin) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Generate a random session ID
  const sessionId = generateSessionId();

  // Store session data in cookie (encrypted)
  const sessionData = {
    id: sessionId,
    token: publicToken,
    access: accessType,
    pin: accessPin, // NEW - stores the actual PIN used (e.g., "SWI005" or "CREW005")
    created: Date.now(),
    expires: Date.now() + (8 * 60 * 60 * 1000) // 8 hours
  };

  // Encode session data
  const encodedSession = Buffer.from(JSON.stringify(sessionData)).toString('base64');

  // Set HTTP-only cookie
  const cookie = serialize('portal_session', encodedSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/'
  });

  res.setHeader('Set-Cookie', cookie);
  
  return res.status(200).json({ 
    success: true,
    sessionId 
  });
}

function generateSessionId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}