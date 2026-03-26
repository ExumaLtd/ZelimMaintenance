import Airtable from 'airtable';
import { getSession } from '../../lib/session';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { esc, getClientIp } from '../../utils/api-utils';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 30 completions per hour per IP
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 h'),
  prefix: 'rl:draft-complete',
});

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { success } = await ratelimit.limit(ip);
  if (!success) return res.status(429).json({ error: 'Too many requests. Please try again later.' });

  try {
    // Get session to extract PIN
    const session = getSession(req);
    if (!session || !session.pin) {
      return res.status(401).json({ error: 'No valid session found' });
    }

    const accessPin = session.pin; // e.g., "SWI005" or "CREW005"

    const { unitId, maintenanceType, engineerEmail } = req.body;

    if (!unitId || !maintenanceType) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Find the draft for this unit + maintenance type + access PIN
    const matchingDrafts = await base('maintenance_drafts')
      .select({
        filterByFormula: `AND(
          {maintenance_type} = '${esc(maintenanceType)}',
          {access_pin_used} = '${esc(accessPin)}',
          NOT({completed}),
          FIND('${esc(unitId)}', ARRAYJOIN({unit_id}))
        )`,
        fields: ['unit_id', 'completed', 'access_pin_used'],
        sort: [{ field: 'last_updated', direction: 'desc' }],
        maxRecords: 1,
      })
      .firstPage();

    if (matchingDrafts.length === 0) {
      return res.status(404).json({ error: 'No draft found' });
    }

    // Mark the most recent draft as completed
    const draftToComplete = matchingDrafts[0];
    const draftId = draftToComplete.id;

    await base('maintenance_drafts').update(draftId, {
      completed: true,
    });

    return res.status(200).json({
      success: true, 
      draftId: draftId 
    });

  } catch (error) {
    console.error('❌ Mark draft complete error:', error);
    console.error('Error details:', error.message);
    return res.status(500).json({ error: 'Failed to mark draft complete' });
  }
}