// pages/api/save-draft.js
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

const PLACEHOLDER_EMAIL = 'draft@zelimmaintenance.com';

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

    // OPTIMIZED: Filter by unit_id AND maintenance_type in one query
    console.log('Checking for existing drafts for this unit...');
    const existingDrafts = await base('maintenance_drafts')
      .select({
        filterByFormula: `AND(
          {maintenance_type} = '${maintenanceType}', 
          NOT({completed}),
          FIND('${unitId}', ARRAYJOIN({unit_id}, ','))
        )`,
        fields: ['unit_id', 'engineer_email', 'last_updated'],
        sort: [{ field: 'last_updated', direction: 'desc' }],
        maxRecords: 1, // Only need the most recent draft
      })
      .firstPage();

    console.log('Existing drafts for this unit:', existingDrafts.length);

    const draftDataString = JSON.stringify(draftData);

    if (existingDrafts.length > 0) {
      // Update the most recent draft for this unit
      const draft = existingDrafts[0];
      const draftId = draft.id;
      const currentEmail = draft.get('engineer_email');
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