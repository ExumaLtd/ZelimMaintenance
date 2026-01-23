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

    console.log('=== GET DRAFT DEBUG ===');
    console.log('unitId:', unitId);
    console.log('maintenanceType:', maintenanceType);
    console.log('engineerEmail:', engineerEmail);

    // Find active draft - fetch and filter in JavaScript for Link field reliability
    const allDrafts = await base('maintenance_drafts')
      .select({
        filterByFormula: `AND({maintenance_type} = '${maintenanceType}', {engineer_email} = '${engineerEmail}', NOT({completed}))`,
        fields: ['unit_id', 'draft_data', 'last_updated'],
        sort: [{ field: 'last_updated', direction: 'desc' }],
      })
      .all();

    console.log(`Total drafts for ${maintenanceType} / ${engineerEmail}: ${allDrafts.length}`);

    // Filter in JavaScript to match unit_id (Link field returns array)
    const matchingDrafts = allDrafts.filter(d => {
      const linkedRecords = d.get('unit_id');
      return linkedRecords && linkedRecords.includes(unitId);
    });

    console.log('Matching drafts found:', matchingDrafts.length);

    if (matchingDrafts.length === 0) {
      console.log('No draft found');
      return res.status(200).json({ draft: null });
    }

    const draft = matchingDrafts[0]; // Most recent due to sort
    const draftDataString = draft.get('draft_data');
    const lastUpdated = draft.get('last_updated');

    if (!draftDataString) {
      console.log('Draft has no data');
      return res.status(200).json({ draft: null });
    }

    try {
      const draftData = JSON.parse(draftDataString);
      console.log('✅ Draft retrieved successfully');
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