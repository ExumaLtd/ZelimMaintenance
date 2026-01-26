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

    // Find ANY active draft for this unit + maintenance type (ignore email - Option B)
    console.log('Finding drafts for unit + type (ignoring email)...');
    
    const allDrafts = await base('maintenance_drafts')
      .select({
        filterByFormula: `AND({maintenance_type} = '${maintenanceType}', NOT({completed}))`,
        fields: ['unit_id', 'maintenance_type', 'engineer_email', 'completed'],
      })
      .all();

    console.log(`Total active drafts for ${maintenanceType}:`, allDrafts.length);

    // Filter in JavaScript to match unit_id (Link field returns array)
    const matchingDrafts = allDrafts.filter(record => {
      const linkedRecords = record.get('unit_id');
      const unitMatch = linkedRecords && linkedRecords.includes(unitId);
      
      if (unitMatch) {
        console.log(`✓ Found matching draft:`, {
          id: record.id,
          unit_id: linkedRecords,
          maintenance_type: record.get('maintenance_type'),
          engineer_email: record.get('engineer_email')
        });
      }
      
      return unitMatch;
    });

    console.log('Matching drafts found:', matchingDrafts.length);
    
    if (matchingDrafts.length > 0) {
      const draft = matchingDrafts[0];
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