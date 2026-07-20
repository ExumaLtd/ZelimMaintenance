// pages/api/save-draft.ts
import Airtable from 'airtable';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '../../lib/session';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { esc, getClientIp } from '../../utils/api-utils';
import { requireEnv } from '../../lib/env';

const redis = new Redis({
  url: requireEnv('UPSTASH_REDIS_REST_URL'),
  token: requireEnv('UPSTASH_REDIS_REST_TOKEN'),
});

// 120 saves per hour per IP — supports frequent auto-saves
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, '1 h'),
  prefix: 'rl:draft-save',
});

const base = new Airtable({ apiKey: requireEnv('AIRTABLE_PAT') }).base(
  requireEnv('AIRTABLE_BASE_ID')
);

const PLACEHOLDER_EMAIL = 'draft@zelimmaintenance.com';

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

    const accessPin = session.pin;
    const userType = session.access === 'operator' ? 'Operator' : 'Engineer';

    const { unitId, maintenanceType, engineerEmail, draftData, recordId } = req.body;

    if (!unitId || !maintenanceType || !draftData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const emailToUse = engineerEmail || PLACEHOLDER_EMAIL;
    const isRealEmail = emailToUse !== PLACEHOLDER_EMAIL && emailToUse.includes('@');
    const draftDataString = JSON.stringify(draftData);

    // If the client already knows the record ID, skip the SELECT entirely
    if (recordId) {
      // Verify the caller owns this draft before writing to it. Without this a
      // valid session could overwrite another unit's draft by supplying its
      // record ID (IDOR).
      let existingDraft;
      try {
        existingDraft = await base('maintenance_drafts').find(recordId);
      } catch (findError) {
        return res.status(404).json({ error: 'Draft not found' });
      }
      if (existingDraft.get('access_pin_used') !== accessPin) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const updateFields: Record<string, any> = {
        draft_data: draftDataString,
        last_updated: new Date().toISOString(),
        access_pin_used: accessPin,
        user_type: userType,
        locked_by: accessPin,
      };
      if (isRealEmail) updateFields.engineer_email = emailToUse;
      const result = await base('maintenance_drafts').update(recordId, updateFields);
      return res.status(200).json({ success: true, action: 'updated', recordId: result.id });
    }

    // First save in this session — find or create the draft record
    const allUnitDrafts = await base('maintenance_drafts')
      .select({
        filterByFormula: `AND(
          {maintenance_type} = '${esc(maintenanceType)}',
          {access_pin_used} = '${esc(accessPin)}',
          NOT({completed})
        )`,
        fields: ['unit_id', 'engineer_email', 'last_updated', 'access_pin_used'],
        sort: [{ field: 'last_updated', direction: 'desc' }],
        maxRecords: 1,
      })
      .firstPage();

    if (allUnitDrafts.length > 0) {
      const draft = allUnitDrafts[0];
      const draftId = draft.id;
      const updateFields: Record<string, any> = {
        draft_data: draftDataString,
        last_updated: new Date().toISOString(),
        access_pin_used: accessPin,
        user_type: userType,
        locked_by: accessPin,
      };

      if (isRealEmail) {
        updateFields.engineer_email = emailToUse;
      }

      const result = await base('maintenance_drafts').update(draftId, updateFields);

      return res.status(200).json({
        success: true,
        action: 'updated',
        recordId: result.id
      });
    } else {
      // No existing draft — create one
      const result = await base('maintenance_drafts').create({
        unit_id: [unitId],
        maintenance_type: maintenanceType,
        engineer_email: emailToUse,
        draft_data: draftDataString,
        last_updated: new Date().toISOString(),
        completed: false,
        access_pin_used: accessPin,
        user_type: userType,
        locked_by: accessPin,
      });

      return res.status(200).json({ success: true, action: 'created', recordId: result.id });
    }
  } catch (error) {
    console.error('❌ Save draft error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: 'Failed to save draft' });
  }
}