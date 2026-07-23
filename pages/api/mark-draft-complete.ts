import Airtable from 'airtable';
import { errorMessage } from '@/utils/errors';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '../../lib/session';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { esc, getClientIp } from '../../lib/api-utils';
import { requireEnv } from '../../lib/env';

const redis = new Redis({
  url: requireEnv('UPSTASH_REDIS_REST_URL'),
  token: requireEnv('UPSTASH_REDIS_REST_TOKEN'),
});

// 30 completions per hour per IP
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 h'),
  prefix: 'rl:draft-complete',
});

const base = new Airtable({ apiKey: requireEnv('AIRTABLE_PAT') }).base(
  requireEnv('AIRTABLE_BASE_ID')
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    const { unitId, maintenanceType, engineerEmail, draftId: clientDraftId } = req.body;

    if (!unitId || !maintenanceType) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    let draftId: string;

    if (clientDraftId && typeof clientDraftId === 'string') {
      // Client already knows the draft ID. Verify the caller owns it before
      // completing it, otherwise a valid session could mark another unit's
      // draft complete by supplying its record ID (IDOR).
      let existingDraft;
      try {
        existingDraft = await base('maintenance_drafts').find(clientDraftId);
      } catch (findError) {
        return res.status(404).json({ error: 'No draft found' });
      }
      if (existingDraft.get('access_pin_used') !== accessPin) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      draftId = clientDraftId;
    } else {
      const matchingDrafts = await base('maintenance_drafts')
        .select({
          filterByFormula: `AND(
            {maintenance_type} = '${esc(maintenanceType)}',
            {access_pin_used} = '${esc(accessPin)}',
            NOT({completed})
          )`,
          fields: ['unit_id', 'completed', 'access_pin_used'],
          sort: [{ field: 'last_updated', direction: 'desc' }],
          maxRecords: 1,
        })
        .firstPage();

      if (matchingDrafts.length === 0) {
        return res.status(404).json({ error: 'No draft found' });
      }

      draftId = matchingDrafts[0].id;
    }

    await base('maintenance_drafts').update(draftId, {
      completed: true,
    });

    return res.status(200).json({
      success: true, 
      draftId: draftId 
    });

  } catch (error) {
    console.error('❌ Mark draft complete error:', error);
    console.error('Error details:', errorMessage(error));
    return res.status(500).json({ error: 'Failed to mark draft complete' });
  }
}