export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const data = req.body;
    
    const airtableBody = {
      records: [
        {
          fields: {
            // Linked Records (must be arrays)
            unit: [data.unit_record_id], 
            maintained_by: [data.maintained_by], 
            engineer_name: [data.engineer_name], // Typecast will handle new names here
            checklist_template: [data.checklist_template_id],
            
            // Standard Fields
            date_of_maintenance: data.date_of_maintenance,
            maintenance_type: "Annual",
            photos: data.photoUrls?.map(url => ({ url })) || [],
            checklist_json: JSON.stringify(data.answers) 
          }
        }
      ],
      // THIS IS VITAL: It allows Airtable to create new records in linked tables
      typecast: true 
    };

    const airtableRes = await fetch(
      `${process.env.AIRTABLE_API_URL}/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_MAINTENANCE_TABLE}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(airtableBody),
      }
    );

    const responseData = await airtableRes.json();

    if (!airtableRes.ok) {
      console.error("Airtable Error Detail:", responseData.error);
      return res.status(airtableRes.status).json({ success: false, error: responseData.error.message });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}