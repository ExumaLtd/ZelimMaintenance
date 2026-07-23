// pages/api/create-session.ts
import { randomUUID } from 'crypto';
import { stringifySetCookie } from 'cookie';
import type { NextApiRequest, NextApiResponse } from 'next';
import { encodeSession } from '../../lib/session';
import { resolvePin, isValidPinFormat } from '../../lib/resolve-pin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { accessPin } = req.body;

  if (!accessPin) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!isValidPinFormat(accessPin)) {
    return res.status(400).json({ error: 'Invalid pin format' });
  }

  try {
    // Resolve the PIN against Airtable and derive the unit token and access type
    // from the matched record. Any publicToken or accessType in the request body
    // is deliberately ignored, so a caller cannot forge a session for an arbitrary
    // unit or elevate an operator PIN to maintenance access.
    const resolved = await resolvePin(accessPin);
    if (!resolved) {
      return res.status(401).json({ error: 'Code not recognised' });
    }

    const sessionData = {
      id: randomUUID(),
      token: resolved.publicToken,
      access: resolved.accessType,
      pin: accessPin,
      created: Date.now(),
      expires: Date.now() + (8 * 60 * 60 * 1000) // 8 hours
    };

    // Encode and sign session data
    const encodedSession = encodeSession(sessionData);

    // Set HTTP-only cookie
    const cookie = stringifySetCookie({
      name: 'portal_session',
      value: encodedSession,
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
