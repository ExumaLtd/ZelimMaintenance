// pages/api/save-draft.js
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

const PLACEHOLDER_EMAIL = 'draft_in_progress@placeholder.local';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { unitId, maintenanceType, engineerEmail, draftData } = req.body;

    console.log('=== SAVE DRAFT DEBUG ===');
    console.log('unitId:', unitId);
    console.log('maintenanceType:', maintenanceType);
    console.log('engineerEmail:', engineerEmail);

    if (!unitId || !maintenanceType || !engineerEmail || !draftData) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const isRealEmail = engineerEmail !== PLACEHOLDER_EMAIL && engineerEmail.includes('@');

    // Find ANY active draft for this unit + maintenance type (regardless of email)
    console.log('Checking for existing drafts for this unit...');
    const allDrafts = await base('maintenance_drafts')
      .select({
        filterByFormula: `AND({maintenance_type} = '${maintenanceType}', NOT({completed}))`,
        fields: ['unit_id', 'engineer_email'],
        sort: [{ field: 'last_updated', direction: 'desc' }],
      })
      .all();

    console.log(`Total active drafts for ${maintenanceType}: ${allDrafts.length}`);

    // Filter in JavaScript to match unit_id (Link field returns array)
    const existingDrafts = allDrafts.filter(d => {
      const linkedRecords = d.get('unit_id');
      return linkedRecords && linkedRecords.includes(unitId);
    });

    console.log('Existing drafts for this unit:', existingDrafts.length);

    const draftDataString = JSON.stringify(draftData);

    if (existingDrafts.length > 0) {
      // Update the most recent draft for this unit
      const draftId = existingDrafts[0].id;
      const currentEmail = existingDrafts[0].get('engineer_email');
      console.log('Updating existing draft:', draftId);
      console.log('Current email:', currentEmail);
      
      // Update the email if we now have a real one
      const updateFields = {
        draft_data: draftDataString,
        last_updated: new Date().toISOString(),
      };

      if (isRealEmail) {
        updateFields.engineer_email = engineerEmail;
        console.log('🔄 Updating draft with real email:', engineerEmail);
      }

      const result = await base('maintenance_drafts').update(draftId, updateFields);

      console.log('✅ Draft updated successfully');
      return res.status(200).json({ 
        success: true, 
        action: 'updated', 
        recordId: result.id 
      });
    } else {
      // Create new draft
      console.log('Creating new draft...');
      console.log('unit_id value:', [unitId]);
      
      const result = await base('maintenance_drafts').create({
        unit_id: [unitId],
        maintenance_type: maintenanceType,
        engineer_email: engineerEmail,
        draft_data: draftDataString,
        last_updated: new Date().toISOString(),
        completed: false,
      });

      console.log('✅ Draft created successfully:', result.id);
      return res.status(200).json({ success: true, action: 'created', recordId: result.id });
    }
  } catch (error) {
    console.error('❌ Save draft error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Failed to save draft',
      details: error.message 
    });
  }
}