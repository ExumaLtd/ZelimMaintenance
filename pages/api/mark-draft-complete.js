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

    // Find the draft without the completed filter first
    const allDrafts = await base('maintenance_drafts')
      .select({
        filterByFormula: `AND({unit_id} = '${unitId}', {maintenance_type} = '${maintenanceType}', {engineer_email} = '${engineerEmail}')`,
      })
      .firstPage();

    console.log('Found drafts:', allDrafts.length);
    
    if (allDrafts.length > 0) {
      console.log('Draft record ID:', allDrafts[0].id);
      console.log('Current completed status:', allDrafts[0].fields.completed);
      
      await base('maintenance_drafts').update(allDrafts[0].id, {
        completed: true,
      });
      
      console.log('Draft marked as completed');
      return res.status(200).json({ success: true, marked: true });
    }

    console.log('No draft found to mark complete');
    return res.status(200).json({ success: true, marked: false, message: 'No draft found' });
  } catch (error) {
    console.error('Mark draft complete error:', error);
    return res.status(500).json({ error: 'Failed to mark draft complete', details: error.message });
  }
}