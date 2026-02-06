// pages/api/save-draft.js
import Airtable from 'airtable';
import { getSession } from '../../lib/session';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

const PLACEHOLDER_EMAIL = 'draft@zelimmaintenance.com';

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
    const userType = session.access === 'maintenance' ? 'Engineer' : 'Crew';

    const { unitId, maintenanceType, engineerEmail, draftData } = req.body;

    console.log('=== SAVE DRAFT DEBUG ===');
    console.log('unitId:', unitId);
    console.log('maintenanceType:', maintenanceType);
    console.log('engineerEmail:', engineerEmail);
    console.log('accessPin:', accessPin);
    console.log('userType:', userType);

    if (!unitId || !maintenanceType || !draftData) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const emailToUse = engineerEmail || PLACEHOLDER_EMAIL;
    const isRealEmail = emailToUse !== PLACEHOLDER_EMAIL && emailToUse.includes('@');

    // Get all active drafts for this maintenance type AND access pin
    console.log('Checking for existing drafts...');
    const allDrafts = await base('maintenance_drafts')
      .select({
        filterByFormula: `AND(
          {maintenance_type} = '${maintenanceType}', 
          {access_pin_used} = '${accessPin}',
          NOT({completed})
        )`,
        fields: ['unit_id', 'engineer_email', 'last_updated', 'access_pin_used'],
        sort: [{ field: 'last_updated', direction: 'desc' }],
      })
      .all();

    // Filter in JavaScript to match unit_id (Link field returns array)
    const existingDrafts = allDrafts.filter(d => {
      const linkedRecords = d.get('unit_id');
      return linkedRecords && linkedRecords.includes(unitId);
    });

    console.log('Existing drafts for this unit + PIN:', existingDrafts.length);

    const draftDataString = JSON.stringify(draftData);

    if (existingDrafts.length > 0) {
      // Update the most recent draft for this unit + PIN
      const draft = existingDrafts[0];
      const draftId = draft.id;
      const currentEmail = draft.get('engineer_email');
      console.log('Updating existing draft:', draftId);
      console.log('Current email:', currentEmail);
      
      const updateFields = {
        draft_data: draftDataString,
        last_updated: new Date().toISOString(),
        // Ensure PIN fields are always set
        access_pin_used: accessPin,
        user_type: userType,
        locked_by: accessPin,
      };

      if (isRealEmail) {
        updateFields.engineer_email = emailToUse;
        console.log('🔄 Updating draft with real email:', emailToUse);
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
        engineer_email: emailToUse,
        draft_data: draftDataString,
        last_updated: new Date().toISOString(),
        completed: false,
        // Add PIN tracking
        access_pin_used: accessPin,
        user_type: userType,
        locked_by: accessPin,
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