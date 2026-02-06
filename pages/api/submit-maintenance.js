import { getSession } from '../../lib/session';

// Generate a human-readable record reference
// Format: RI/SWI005/A/060226/1
async function generateRecordRef(serialNumber, maintenanceType, apiKey, baseId) {
  const typeMap = {
    'Monthly': 'M',
    'Annual': 'A',
    '30-month depth': 'D',
    'Unscheduled': 'U',
    'Fault report': 'F',
    'Fault Reporting': 'F',
    'FaultReporting': 'F',
  };

  const typeCode = typeMap[maintenanceType] || 'X';
  
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const dateCode = `${dd}${mm}${yy}`;

  // Query today's existing records for this unit + type to get the daily counter
  const todayISO = now.toISOString().split('T')[0]; // 2026-02-06
  
  try {
    const formula = encodeURIComponent(
      `AND({serial_number (from unit)}='${serialNumber}', {maintenance_type}='${maintenanceType}', DATESTR({date_of_maintenance})='${todayISO}')`
    );
    
    const countRes = await fetch(
      `https://api.airtable.com/v0/${baseId}/maintenance_checks?filterByFormula=${formula}&fields%5B%5D=record_ref`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    let dailyCount = 1;
    
    if (countRes.ok) {
      const countData = await countRes.json();
      dailyCount = (countData.records?.length || 0) + 1;
    }

    return `RI/${serialNumber}/${typeCode}/${dateCode}/${dailyCount}`;
  } catch (error) {
    // Fallback if count query fails
    console.warn('Record ref count query failed, using fallback:', error.message);
    return `RI/${serialNumber}/${typeCode}/${dateCode}/1`;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Get session to extract PIN
  const session = getSession(req);
  if (!session || !session.pin) {
    return res.status(401).json({ error: 'No valid session found' });
  }

  const accessPin = session.pin;
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
    // Generate record reference
    const recordRef = await generateRecordRef(serial_number, maintenance_type, apiKey, baseId);
    console.log('📋 Generated record ref:', recordRef);

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
      "access_pin_used": accessPin,
      "user_type": userType,
      "record_ref": recordRef
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
      "access_pin_used": accessPin,
      "user_type": userType,
      "locked_by": accessPin,
      "record_ref": recordRef
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
          'Cookie': req.headers.cookie
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
      }
    } catch (markError) {
      console.warn('⚠️ Error marking draft complete:', markError.message);
    }

    return res.status(200).json({ success: true, recordRef });
  } catch (error) {
    console.error("Final Submission Failure:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}