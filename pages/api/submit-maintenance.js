export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { 
    unit_record_id, 
    maintained_by, 
    engineer_name, 
    date_of_maintenance, 
    answers, 
    photoUrls, 
    checklist_template_id 
  } = req.body;

  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  try {
    // 1. Get the Company Record ID (e.g., Zelim)
    const compRes = await fetch(`https://api.airtable.com/v0/${baseId}/maintenance_companies?filterByFormula={company_name}='${maintained_by}'`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const compData = await compRes.json();
    const companyRecordId = compData.records?.[0]?.id;

    // 2. Find or Create the Engineer and link them to the Company
    const engRes = await fetch(`https://api.airtable.com/v0/${baseId}/engineers?filterByFormula={engineer_name}='${engineer_name}'`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const engData = await engRes.json();
    
    let engineerRecordId;

    if (engData.records?.length > 0) {
      engineerRecordId = engData.records[0].id;
      // Link engineer to company if not already linked
      if (companyRecordId) {
        await fetch(`https://api.airtable.com/v0/${baseId}/engineers/${engineerRecordId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { "company": [companyRecordId] } })
        });
      }
    } else {
      // Create new engineer record and link to company
      const newEng = await fetch(`https://api.airtable.com/v0/${baseId}/engineers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fields: { 
            "engineer_name": engineer_name, 
            "company": companyRecordId ? [companyRecordId] : [] 
          } 
        })
      });
      const newEngData = await newEng.json();
      engineerRecordId = newEngData.id;
    }

    // 3. Final Submission using your EXACT column names
    const checkRes = await fetch(`https://api.airtable.com/v0/${baseId}/maintenance_checks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          "unit": [unit_record_id],
          "maintained_by": companyRecordId ? [companyRecordId] : [],
          "engineer_name": [engineerRecordId],
          "date_of_maintenance": date_of_maintenance,
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