// pages/api/get-draft.js
import Airtable from 'airtable';
import { getSession } from '../../lib/session';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get session to extract PIN
    const session = getSession(req);
    if (!session || !session.pin) {
      return res.status(401).json({ error: 'No valid session found' });
    }

    const accessPin = session.pin; // e.g., "SWI005" or "CREW005"

    const { unitId, maintenanceType } = req.query;

    if (!unitId || !maintenanceType) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Find active drafts for this unit + maintenance type + access PIN
    const allDrafts = await base('maintenance_drafts')
      .select({
        filterByFormula: `AND(
          {maintenance_type} = '${maintenanceType}',
          {access_pin_used} = '${accessPin}',
          NOT({completed})
        )`,
        fields: ['unit_id', 'draft_data', 'last_updated', 'engineer_email', 'access_pin_used', 'user_type'],
        sort: [{ field: 'last_updated', direction: 'desc' }],
      })
      .all();

    // Filter in JavaScript to match unit_id (Link field returns array)
    const matchingDrafts = allDrafts.filter(d => {
      const linkedRecords = d.get('unit_id');
      return linkedRecords && linkedRecords.includes(unitId);
    });

    if (matchingDrafts.length === 0) {
      return res.status(200).json({ draft: null });
    }

    const draft = matchingDrafts[0]; // Most recent due to sort
    const draftDataString = draft.get('draft_data');
    const lastUpdated = draft.get('last_updated');

    if (!draftDataString) {
      return res.status(200).json({ draft: null });
    }

    try {
      const draftData = JSON.parse(draftDataString);
      return res.status(200).json({
        draft: draftData,
        lastUpdated: lastUpdated,
        draftId: draft.id,
      });
    } catch (parseError) {
      console.error('Failed to parse draft data:', parseError);
      return res.status(200).json({ draft: null });
    }
  } catch (error) {
    console.error('❌ Get draft error:', error);
    return res.status(500).json({ error: 'Failed to retrieve draft' });
  }
}