// pages/api/save-draft.js
import Airtable from 'airtable';
import { getSession } from '../../lib/session';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { esc } from '../../utils/api-utils';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 120 saves per hour per IP — supports frequent auto-saves
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, '1 h'),
  prefix: 'rl:draft-save',
});

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

const PLACEHOLDER_EMAIL = 'draft@zelimmaintenance.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? '127.0.0.1';
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

    const { unitId, maintenanceType, engineerEmail, draftData } = req.body;

    if (!unitId || !maintenanceType || !draftData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const emailToUse = engineerEmail || PLACEHOLDER_EMAIL;
    const isRealEmail = emailToUse !== PLACEHOLDER_EMAIL && emailToUse.includes('@');

    // Get all active drafts for this unit + maintenance type (any PIN)
    const allDrafts = await base('maintenance_drafts')
      .select({
        filterByFormula: `AND(
          {maintenance_type} = '${esc(maintenanceType)}',
          NOT({completed})
        )`,
        fields: ['unit_id', 'engineer_email', 'last_updated', 'access_pin_used'],
        sort: [{ field: 'last_updated', direction: 'desc' }],
      })
      .all();

    // Filter in JavaScript to match unit_id (Link field returns array)
    const allUnitDrafts = allDrafts.filter(d => {
      const linkedRecords = d.get('unit_id');
      return linkedRecords && linkedRecords.includes(unitId);
    });

    const draftDataString = JSON.stringify(draftData);

    if (allUnitDrafts.length > 0) {
      // Update the most recent draft regardless of which PIN created it,
      // and stamp it with the current PIN. This prevents duplicate records
      // accumulating across sessions.
      const draft = allUnitDrafts[0];
      const draftId = draft.id;
      const updateFields = {
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
    return res.status(500).json({ 
      error: 'Failed to save draft',
      details: error.message 
    });
  }
}