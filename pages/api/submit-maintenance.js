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
    answers, 
    photoUrls, 
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

    // 2. Handle Engineer (Anchor: Name)
    // We search by name. If found, we update email/phone with latest submission.
    const engFormula = `{engineer_name}='${engineer_name}'`;
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
      // UPDATE existing engineer with newest contact info
      await fetch(`https://api.airtable.com/v0/${baseId}/engineers/${engineerRecordId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: engineerFields })
      });
    } else {
      // CREATE new engineer
      const newEng = await fetch(`https://api.airtable.com/v0/${baseId}/engineers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: engineerFields })
      });
      const newEngData = await newEng.json();
      engineerRecordId = newEngData.id;
    }

    // 3. Submit Check
    const finalTown = location_town || location_display || "";

    const checkRes = await fetch(`https://api.airtable.com/v0/${baseId}/maintenance_checks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          "unit": [unit_record_id],
          "maintained_by": companyRecordId ? [companyRecordId] : [],
          "engineer_name": [engineerRecordId],
          "date_of_maintenance": date_of_maintenance,
          "maintenance_type": maintenance_type,
          "location_display": location_display || "",
          "location_town": finalTown,
          "location_country": location_country || "",
          "checklist_template": [checklist_template_id],
          "checklist_json": JSON.stringify(answers),
          "photos": photoUrls ? photoUrls.map(url => ({ url })) : []
        }
      })
    });

    if (!checkRes.ok) {
      const error = await checkRes.json();
      throw new Error(`Airtable Error: ${error.error.message}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Submission Failure:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}