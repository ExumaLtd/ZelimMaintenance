// pages/api/mark-draft-complete.js
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { unitId, maintenanceType, engineerEmail } = req.body;

    console.log('=== MARK DRAFT COMPLETE ===');
    console.log('Mark draft complete called with:', { unitId, maintenanceType, engineerEmail });

    if (!unitId || !maintenanceType) {
      return res.status(400).json({ error: 'Missing required fields (unitId or maintenanceType)' });
    }

    // OPTIMIZED: Filter by unit_id AND maintenance_type in one query
    console.log('Finding drafts for unit + type (ignoring email)...');
    
    const records = await base('maintenance_drafts')
      .select({
        filterByFormula: `AND(
          {maintenance_type} = '${maintenanceType}', 
          NOT({completed}),
          FIND('${unitId}', ARRAYJOIN({unit_id}, ','))
        )`,
        fields: ['unit_id', 'maintenance_type', 'engineer_email', 'completed'],
        sort: [{ field: 'last_updated', direction: 'desc' }],
        maxRecords: 1, // Only need one draft to mark complete
      })
      .firstPage();

    console.log('Matching drafts found:', records.length);
    
    if (records.length > 0) {
      const draft = records[0];
      const linkedRecords = draft.get('unit_id');
      
      console.log(`✓ Found matching draft:`, {
        id: draft.id,
        unit_id: linkedRecords,
        maintenance_type: draft.get('maintenance_type'),
        engineer_email: draft.get('engineer_email')
      });
      
      console.log('✓ Marking draft as completed:', draft.id);
      
      await base('maintenance_drafts').update(draft.id, {
        completed: true,
      });
      
      console.log('✓ Draft marked as completed successfully');
      return res.status(200).json({ success: true, marked: true, draftId: draft.id });
    }

    console.log('⚠️ No matching draft found for unit:', unitId, 'type:', maintenanceType);
    return res.status(200).json({ success: true, marked: false, message: 'No draft found' });
  } catch (error) {
    console.error('❌ Mark draft complete error:', error);
    return res.status(500).json({ error: 'Failed to mark draft complete', details: error.message });
  }
}