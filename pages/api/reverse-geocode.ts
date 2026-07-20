import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '../../lib/session';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { getClientIp } from '../../utils/api-utils';
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
          'User-Agent': 'SWIFT Maintenance App (maintenance.exuma.co.uk)',
        },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Geocoding failed' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Geocoding error:', err);
    return res.status(500).json({ error: 'Geocoding failed' });
  }
}
