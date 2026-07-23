import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '../../lib/session';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { getClientIp } from '../../lib/api-utils';
import { requireEnv } from '../../lib/env';

const redis = new Redis({
  url: requireEnv('UPSTASH_REDIS_REST_URL'),
  token: requireEnv('UPSTASH_REDIS_REST_TOKEN'),
});

// 60 geocode requests per hour per IP
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 h'),
  prefix: 'rl:geocode',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSession(req);
  if (!session?.pin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const ip = getClientIp(req);
  const { success } = await ratelimit.limit(ip);
  if (!success) return res.status(429).json({ error: 'Too many requests. Please try again later.' });

  const { lat, lon } = req.query as Record<string, string>;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Missing lat/lon' });
  }

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latNum}&lon=${lonNum}&zoom=14&accept-language=en-GB`,
      {
        headers: {
          'User-Agent': 'Swift Maintenance App (maintenance.exuma.co.uk)',
        },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Geocoding failed' });
    }

    const data = await response.json();

    // Optional what3words lookup, ideal at sea where street addresses fail.
    // Guarded in-handler like ELEVENLABS_API_KEY so the portal degrades
    // gracefully when the key is not configured.
    if (process.env.W3W_API_KEY) {
      try {
        const w3wRes = await fetch(
          `https://api.what3words.com/v3/convert-to-3wa?coordinates=${latNum}%2C${lonNum}&key=${process.env.W3W_API_KEY}`
        );
        if (w3wRes.ok) {
          const w3w = await w3wRes.json();
          if (w3w?.words) data.what3words = w3w.words;
        }
      } catch {
        // Lookup failed; the address response is still useful on its own.
      }
    }

    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Geocoding error:', err);
    return res.status(500).json({ error: 'Geocoding failed' });
  }
}
