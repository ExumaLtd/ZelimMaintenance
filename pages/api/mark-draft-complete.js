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

    if (!unitId || !maintenanceType || !engineerEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find and mark draft as completed
    const drafts = await base('maintenance_drafts')
      .select({
        filterByFormula: `AND({unit_id} = '${unitId}', {maintenance_type} = '${maintenanceType}', {engineer_email} = '${engineerEmail}', {completed} = 0)`,
      })
      .firstPage();

    if (drafts.length > 0) {
      await base('maintenance_drafts').update(drafts[0].id, {
        completed: true,
      });
      return res.status(200).json({ success: true, marked: true });
    }

    return res.status(200).json({ success: true, marked: false, message: 'No draft found' });
  } catch (error) {
    console.error('Mark draft complete error:', error);
    return res.status(500).json({ error: 'Failed to mark draft complete' });
  }
}