// pages/api/save-draft.js
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { unitId, maintenanceType, engineerEmail, draftData } = req.body;

    if (!unitId || !maintenanceType || !engineerEmail || !draftData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if draft already exists
    const existingDrafts = await base('maintenance_drafts')
      .select({
        maxRecords: 1,
        filterByFormula: `AND({unit_id} = '${unitId}', {maintenance_type} = '${maintenanceType}', {engineer_email} = '${engineerEmail}', {completed} = FALSE())`,
      })
      .firstPage();

    const draftDataString = JSON.stringify(draftData);

    if (existingDrafts.length > 0) {
      // Update existing draft
      const draftId = existingDrafts[0].id;
      await base('maintenance_drafts').update(draftId, {
        draft_data: draftDataString,
        last_updated: new Date().toISOString(),
      });

      return res.status(200).json({ success: true, action: 'updated' });
    } else {
      // Create new draft
      await base('maintenance_drafts').create({
        unit_id: [unitId],
        maintenance_type: maintenanceType,
        engineer_email: engineerEmail,
        draft_data: draftDataString,
        last_updated: new Date().toISOString(),
        completed: false,
      });

      return res.status(200).json({ success: true, action: 'created' });
    }
  } catch (error) {
    console.error('Save draft error:', error);
    return res.status(500).json({ error: 'Failed to save draft' });
  }
}