// pages/api/get-draft.js
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { unitId, maintenanceType, engineerEmail } = req.query;

    if (!unitId || !maintenanceType || !engineerEmail) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Find active draft using SEARCH on linked field
    const drafts = await base('maintenance_drafts')
      .select({
        maxRecords: 1,
        filterByFormula: `AND(
          SEARCH("${unitId}", ARRAYJOIN({unit_id})),
          {maintenance_type} = '${maintenanceType}',
          {engineer_email} = '${engineerEmail}',
          {completed} = FALSE()
        )`,
        sort: [{ field: 'last_updated', direction: 'desc' }],
      })
      .firstPage();

    if (drafts.length === 0) {
      return res.status(200).json({ draft: null });
    }

    const draft = drafts[0];
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
    console.error('Get draft error:', error);
    return res.status(500).json({ error: 'Failed to retrieve draft' });
  }
}