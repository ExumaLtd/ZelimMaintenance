import Airtable from 'airtable';
import { getSession } from '../../lib/session';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get session to extract PIN
    const session = getSession(req);
    if (!session || !session.pin) {
      return res.status(401).json({ error: 'No valid session found' });
    }

    const accessPin = session.pin; // e.g., "SWI005" or "CREW005"

    const { unitId, maintenanceType, engineerEmail } = req.body;

    console.log('=== MARK DRAFT COMPLETE DEBUG ===');
    console.log('unitId:', unitId);
    console.log('maintenanceType:', maintenanceType);
    console.log('engineerEmail:', engineerEmail);
    console.log('accessPin:', accessPin);

    if (!unitId || !maintenanceType) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Find the draft for this unit + maintenance type + access PIN
    console.log('Searching for draft to mark complete...');
    const allDrafts = await base('maintenance_drafts')
      .select({
        filterByFormula: `AND(
          {maintenance_type} = '${maintenanceType}',
          {access_pin_used} = '${accessPin}',
          NOT({completed})
        )`,
        fields: ['unit_id', 'engineer_email', 'completed', 'access_pin_used'],
        sort: [{ field: 'last_updated', direction: 'desc' }],
      })
      .all();

    console.log(`Found ${allDrafts.length} active drafts for ${maintenanceType} + PIN ${accessPin}`);

    // Filter in JavaScript to match unit_id (Link field returns array)
    const matchingDrafts = allDrafts.filter(d => {
      const linkedRecords = d.get('unit_id');
      return linkedRecords && linkedRecords.includes(unitId);
    });

    console.log(`Matching drafts for unit ${unitId} + PIN ${accessPin}: ${matchingDrafts.length}`);

    if (matchingDrafts.length === 0) {
      console.log('No draft found to mark complete for this access PIN');
      return res.status(404).json({ error: 'No draft found' });
    }

    // Mark the most recent draft as completed
    const draftToComplete = matchingDrafts[0];
    const draftId = draftToComplete.id;
    
    console.log(`Marking draft ${draftId} as complete...`);
    
    await base('maintenance_drafts').update(draftId, {
      completed: true,
    });

    console.log('✅ Draft marked as complete');
    return res.status(200).json({ 
      success: true, 
      draftId: draftId 
    });

  } catch (error) {
    console.error('❌ Mark draft complete error:', error);
    console.error('Error details:', error.message);
    return res.status(500).json({ 
      error: 'Failed to mark draft complete',
      details: error.message 
    });
  }
}