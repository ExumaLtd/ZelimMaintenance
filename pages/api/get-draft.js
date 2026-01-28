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

    if (!unitId || !maintenanceType) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log('=== GET DRAFT DEBUG ===');
    console.log('unitId:', unitId);
    console.log('maintenanceType:', maintenanceType);
    console.log('engineerEmail (provided):', engineerEmail);

    // OPTIMIZED: Filter by unit_id AND maintenance_type in one query
    const records = await base('maintenance_drafts')
      .select({
        filterByFormula: `AND(
          {maintenance_type} = '${maintenanceType}', 
          NOT({completed}),
          FIND('${unitId}', ARRAYJOIN({unit_id}, ','))
        )`,
        fields: ['unit_id', 'draft_data', 'last_updated', 'engineer_email'],
        sort: [{ field: 'last_updated', direction: 'desc' }],
        maxRecords: 1, // CRITICAL: Only fetch the one we need!
      })
      .firstPage(); // Use firstPage() instead of all()

    console.log('Matching drafts found:', records.length);

    if (records.length === 0) {
      console.log('No draft found');
      return res.status(200).json({ draft: null });
    }

    const draft = records[0];
    const draftDataString = draft.get('draft_data');
    const lastUpdated = draft.get('last_updated');
    const draftEmail = draft.get('engineer_email');

    console.log('Draft email:', draftEmail);

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