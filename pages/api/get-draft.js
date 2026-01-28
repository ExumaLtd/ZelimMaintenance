// pages/api/get-draft.js (DEBUG VERSION)
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

    console.log('=== GET DRAFT DEBUG ===');
    console.log('Query params:', { unitId, maintenanceType, engineerEmail });

    if (!unitId || !maintenanceType) {
      console.log('❌ Missing required parameters');
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Build the filter formula
    const formula = `AND(
      {maintenance_type} = '${maintenanceType}', 
      NOT({completed}),
      FIND('${unitId}', ARRAYJOIN({unit_id}, ','))
    )`;
    
    console.log('🔍 Filter formula:', formula);

    const records = await base('maintenance_drafts')
      .select({
        filterByFormula: formula,
        fields: ['unit_id', 'draft_data', 'last_updated', 'engineer_email', 'completed'],
        sort: [{ field: 'last_updated', direction: 'desc' }],
        maxRecords: 1,
      })
      .firstPage();

    console.log('📊 Total drafts found:', records.length);

    if (records.length === 0) {
      console.log('ℹ️ No draft found - user should see "Start Maintenance"');
      return res.status(200).json({ draft: null });
    }

    const draft = records[0];
    console.log('✅ Found draft:', {
      id: draft.id,
      unit_id: draft.get('unit_id'),
      maintenance_type: draft.get('maintenance_type'),
      engineer_email: draft.get('engineer_email'),
      completed: draft.get('completed'),
      last_updated: draft.get('last_updated'),
      has_draft_data: !!draft.get('draft_data')
    });

    const draftDataString = draft.get('draft_data');

    if (!draftDataString) {
      console.log('⚠️ Draft exists but has no data');
      return res.status(200).json({ draft: null });
    }

    try {
      const draftData = JSON.parse(draftDataString);
      console.log('✅ Draft data parsed successfully');
      console.log('📝 Draft contains:', {
        answersCount: draftData.answers?.length || 0,
        hasLocation: !!draftData.locationDisplay,
        keys: Object.keys(draftData)
      });
      
      return res.status(200).json({
        draft: draftData,
        lastUpdated: draft.get('last_updated'),
        draftId: draft.id,
      });
    } catch (parseError) {
      console.error('❌ Failed to parse draft data:', parseError);
      return res.status(200).json({ draft: null });
    }
  } catch (error) {
    console.error('❌ Get draft error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: 'Failed to retrieve draft' });
  }
}