export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
    answers, // Now includes images: [{ question: "q1", answer: "text", images: ["url1", "url2"] }]
    serial_number, // For cloudinary_folder
    checklist_template_id 
  } = req.body;

  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  try {
    // 1. Get Company ID
    const compRes = await fetch(`https://api.airtable.com/v0/${baseId}/maintenance_companies?filterByFormula={company_name}='${maintained_by}'`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const compData = await compRes.json();
    const companyRecordId = compData.records?.[0]?.id;

    // 2. Handle Engineer
    const engFormula = `{engineer_name}="${engineer_name}"`;
    const engRes = await fetch(`https://api.airtable.com/v0/${baseId}/engineers?filterByFormula=${encodeURIComponent(engFormula)}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const engData = await engRes.json();
    
    let engineerRecordId;
    const engineerFields = {
      "engineer_name": engineer_name, 
      "email": engineer_email,        
      "phone": engineer_phone,        
      "company": companyRecordId ? [companyRecordId] : []
    };

    if (engData.records?.length > 0) {
      engineerRecordId = engData.records[0].id;
      await fetch(`https://api.airtable.com/v0/${baseId}/engineers/${engineerRecordId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: engineerFields })
      });
    } else {
      const newEng = await fetch(`https://api.airtable.com/v0/${baseId}/engineers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: engineerFields })
      });
      const newEngData = await newEng.json();
      engineerRecordId = newEngData.id;
    }

    // Prepare the trimmed date (YYYY-MM-DD) for standard Date fields
    const trimmedDate = date_of_maintenance.split('T')[0];

    // Generate Cloudinary folder path for archival reference
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const dateStr = `${dd}-${mm}-${yyyy}`;
    const cloudinaryFolder = `zelimmaintenance/SWIFT/${maintenance_type.toLowerCase()}/${serial_number}/${dateStr}`;

    // Format answers with images into structured JSON
    const formattedAnswers = answers.reduce((acc, item) => {
      acc[item.question] = {
        text: item.answer,
        images: item.images || []
      };
      return acc;
    }, {});

    // Collect all image URLs for photos field (if you want to use it)
    const allImageUrls = answers.reduce((urls, item) => {
      if (item.images && item.images.length > 0) {
        return [...urls, ...item.images];
      }
      return urls;
    }, []);

    // 3. SUBMIT TO MAINTENANCE_LOGS (Historical Archive)
    const logRes = await fetch(`https://api.airtable.com/v0/${baseId}/maintenance_logs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          "unit_link": [unit_record_id],
          "date_of_maintenance": trimmedDate,
          "maintenance_type": maintenance_type,
          "engineer_name": engineer_name,
          "engineer_email": engineer_email,
          "location_display": location_display || "",
          "checklist_json": JSON.stringify(formattedAnswers), // Structured JSON with images
          "cloudinary_folder": cloudinaryFolder, // Archive folder path
          "photos": allImageUrls.length > 0 ? allImageUrls.map(url => ({ url })) : []
        }
      })
    });

    // 4. Submit to MAINTENANCE_CHECKS (Current Status)
    const finalTown = location_town || location_display || "";
    const checkRes = await fetch(`https://api.airtable.com/v0/${baseId}/maintenance_checks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          "unit": [unit_record_id],
          "maintained_by": companyRecordId ? [companyRecordId] : [],
          "engineer_name": [engineerRecordId],
          "date_of_maintenance": trimmedDate, 
          "maintenance_type": maintenance_type,
          "location_display": location_display || "",
          "location_town": finalTown,
          "location_country": location_country || "",
          "checklist_template": [checklist_template_id],
          "checklist_json": JSON.stringify(formattedAnswers), // Structured JSON with images
          "cloudinary_folder": cloudinaryFolder, // Archive folder path
          "photos": allImageUrls.length > 0 ? allImageUrls.map(url => ({ url })) : []
        }
      })
    });

    if (!checkRes.ok || !logRes.ok) {
      const logText = await logRes.text();
      const checkText = await checkRes.text();
      console.error("Log Error Details:", logText);
      console.error("Check Error Details:", checkText);
      throw new Error(`Airtable Sync Error`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Final Submission Failure:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}