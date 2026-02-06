import { getSession } from '../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Get session to extract PIN
  const session = getSession(req);
  if (!session || !session.pin) {
    return res.status(401).json({ error: 'No valid session found' });
  }

  const accessPin = session.pin; // e.g., "SWI005" or "CREW005"
  const userType = session.access === 'maintenance' ? 'Engineer' : 'Crew';

  const { 
    unit_record_id, 
    maintained_by, 
    engineer_name, 
    engineer_email,
    engineer_phone,
    date_of_maintenance, 
    maintenance_type,
    location_display,
    location_town,
    location_country,
    answers,
    maintenance_checklist,
    serial_number,
    checklist_template_id 
  } = req.body;

  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  try {
    // OPTIMIZATION 1: Run company and engineer lookups IN PARALLEL
    const [compRes, engRes] = await Promise.all([
      fetch(`https://api.airtable.com/v0/${baseId}/maintenance_companies?filterByFormula={company_name}='${maintained_by}'&maxRecords=1`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      }),
      fetch(`https://api.airtable.com/v0/${baseId}/engineers?filterByFormula=${encodeURIComponent(`{engineer_name}="${engineer_name}"`)}&maxRecords=1`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      })
    ]);

    const [compData, engData] = await Promise.all([
      compRes.json(),
      engRes.json()
    ]);

    const companyRecordId = compData.records?.[0]?.id;

    // OPTIMIZATION 2: Only create/update engineer if needed
    let engineerRecordId;
    const engineerFields = {
      "engineer_name": engineer_name, 
      "email": engineer_email,        
      "phone": engineer_phone,        
      "company": companyRecordId ? [companyRecordId] : []
    };

    if (engData.records?.length > 0) {
      engineerRecordId = engData.records[0].id;
      const existing = engData.records[0].fields;
      
      // Only update if data actually changed
      const needsUpdate = 
        existing.email !== engineer_email ||
        existing.phone !== engineer_phone ||
        JSON.stringify(existing.company || []) !== JSON.stringify(engineerFields.company);
      
      if (needsUpdate) {
        await fetch(`https://api.airtable.com/v0/${baseId}/engineers/${engineerRecordId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: engineerFields })
        });
      }
    } else {
      const newEng = await fetch(`https://api.airtable.com/v0/${baseId}/engineers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: engineerFields })
      });
      const newEngData = await newEng.json();
      engineerRecordId = newEngData.id;
    }

    // Prepare shared data
    const trimmedDate = date_of_maintenance.split('T')[0];
    
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const dateStr = `${dd}-${mm}-${yyyy}`;
    const cloudinaryFolder = `zelimmaintenance/SWIFT/${maintenance_type.toLowerCase()}/${serial_number}/${dateStr}`;

    const formattedAnswers = answers.reduce((acc, item) => {
      acc[item.question] = {
        text: item.answer,
        images: item.images || []
      };
      return acc;
    }, {});

    // OPTIMIZATION 3: Submit to BOTH tables in PARALLEL
    const logFields = {
      "unit_link": [unit_record_id],
      "date_of_maintenance": trimmedDate,
      "maintenance_type": maintenance_type,
      "engineer_name": engineer_name,
      "engineer_email": engineer_email,
      "location_display": location_display || "",
      "checklist_json": JSON.stringify(formattedAnswers),
      "cloudinary_folder": cloudinaryFolder,
      // NEW - Add PIN tracking
      "access_pin_used": accessPin,
      "user_type": userType
    };

    if (maintenance_checklist) {
      logFields["maintenance_checklist"] = maintenance_checklist;
    }

    const finalTown = location_town || location_display || "";
    const checkFields = {
      "unit": [unit_record_id],
      "maintained_by": companyRecordId ? [companyRecordId] : [],
      "engineer_name": [engineerRecordId],
      "date_of_maintenance": trimmedDate, 
      "maintenance_type": maintenance_type,
      "location_display": location_display || "",
      "location_town": finalTown,
      "location_country": location_country || "",
      "checklist_template": [checklist_template_id],
      "checklist_json": JSON.stringify(formattedAnswers),
      "cloudinary_folder": cloudinaryFolder,
      // NEW - Add PIN tracking
      "access_pin_used": accessPin,
      "user_type": userType,
      "locked_by": accessPin
    };

    if (maintenance_checklist) {
      checkFields["maintenance_checklist"] = maintenance_checklist;
    }

    // Submit to both tables simultaneously
    const [logRes, checkRes] = await Promise.all([
      fetch(`https://api.airtable.com/v0/${baseId}/maintenance_logs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: logFields })
      }),
      fetch(`https://api.airtable.com/v0/${baseId}/maintenance_checks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: checkFields })
      })
    ]);

    if (!checkRes.ok || !logRes.ok) {
      const [logText, checkText] = await Promise.all([
        logRes.text(),
        checkRes.text()
      ]);
      console.error("Log Error Details:", logText);
      console.error("Check Error Details:", checkText);
      throw new Error(`Airtable Sync Error`);
    }

    // CRITICAL: Mark the draft as completed now that submission succeeded
    console.log('✅ Submission successful, marking draft as complete...');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://maintenance.exuma.co.uk';
      const markCompleteRes = await fetch(`${baseUrl}/api/mark-draft-complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': req.headers.cookie // Pass session cookie along
        },
        body: JSON.stringify({
          unitId: unit_record_id,
          maintenanceType: maintenance_type,
          engineerEmail: engineer_email
        })
      });
      
      if (markCompleteRes.ok) {
        const result = await markCompleteRes.json();
        console.log('✅ Draft marked as completed:', result);
      } else {
        const errorText = await markCompleteRes.text();
        console.warn('⚠️ Failed to mark draft complete:', errorText);
        // Don't fail the whole request - submission already succeeded
      }
    } catch (markError) {
      console.warn('⚠️ Error marking draft complete:', markError.message);
      // Don't fail the whole request - submission already succeeded
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Final Submission Failure:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}