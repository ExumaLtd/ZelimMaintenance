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

    console.log('Mark draft complete called with:', { unitId, maintenanceType, engineerEmail });

    if (!unitId || !maintenanceType || !engineerEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get ALL drafts first (no filter)
    const allRecords = await base('maintenance_drafts')
      .select()
      .firstPage();

    console.log('Total records in table:', allRecords.length);

    // Log each record to see what we're working with
    allRecords.forEach(record => {
      console.log('Record:', {
        id: record.id,
        unit_id: record.fields.unit_id,
        maintenance_type: record.fields.maintenance_type,
        engineer_email: record.fields.engineer_email,
        completed: record.fields.completed
      });
    });

    // Filter in JavaScript
    const matchingDrafts = allRecords.filter(record => {
      const unitMatch = Array.isArray(record.fields.unit_id) && record.fields.unit_id.includes(unitId);
      const typeMatch = record.fields.maintenance_type === maintenanceType;
      const emailMatch = record.fields.engineer_email === engineerEmail;
      const notCompleted = !record.fields.completed;
      
      console.log(`Record ${record.id}: unit=${unitMatch}, type=${typeMatch}, email=${emailMatch}, notCompleted=${notCompleted}`);
      
      return unitMatch && typeMatch && emailMatch && notCompleted;
    });

    console.log('Matching drafts:', matchingDrafts.length);
    
    if (matchingDrafts.length > 0) {
      const draft = matchingDrafts[0];
      console.log('✓ Updating draft record:', draft.id);
      
      await base('maintenance_drafts').update(draft.id, {
        completed: true,
      });
      
      console.log('✓ Draft marked as completed');
      return res.status(200).json({ success: true, marked: true });
    }

    console.log('⚠️ No matching draft found');
    return res.status(200).json({ success: true, marked: false, message: 'No draft found' });
  } catch (error) {
    console.error('❌ Mark draft complete error:', error);
    return res.status(500).json({ error: 'Failed to mark draft complete', details: error.message });
  }
}