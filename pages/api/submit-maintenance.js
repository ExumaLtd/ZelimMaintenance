export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const body = req.body;

    // 1. Prepare the JSON data for the long-text field in Airtable
    // This stores all your checklist answers in a single searchable field
    const checklist_json = JSON.stringify({
      maintenance_type: body.maintenance_type,
      submitted_at: new Date().toISOString(),
      answers: body.answers || [],
    });

    // 2. Construct the Airtable Payload
    // Attachment fields (photos/signature) must be an array of objects: [{ url: "..." }]
    const airtablePayload = {
      records: [
        {
          fields: {
            unit: [body.unit_record_id], // Linked Record ID to the Swift Units table
            maintenance_type: body.maintenance_type,
            checklist_template: [body.checklist_template_id], // Linked Record ID
            maintained_by: body.maintained_by,
            engineer_name: body.engineer_name,
            date_of_maintenance: body.date_of_maintenance,
            location_lat: Number(body.location_lat),
            location_lng: Number(body.location_lng),
            location_town: body.location_town,
            location_what3words: body.location_what3words,
            comments: body.comments || "",
            checklist_json: checklist_json,
            
            // MAP THE PHOTO URLS FROM UPLOADTHING
            photos: body.photoUrls 
              ? body.photoUrls.map(url => ({ url })) 
              : [],
            
            // MAP THE SIGNATURE URL FROM UPLOADTHING
            signature: body.signatureUrl 
              ? [{ url: body.signatureUrl }] 
              : [],
          },
        },
      ],
    };

    // 3. Send to Airtable
    const response = await fetch(
      `${process.env.AIRTABLE_API_URL}/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_MAINTENANCE_TABLE}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(airtablePayload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Airtable API Error Detail:", result);
      throw new Error(result.error?.message || "Failed to save to Airtable");
    }

    // Success response to frontend
    return res.status(200).json({ 
        success: true, 
        airtable_id: result.records[0].id 
    });

  } catch (err) {
    console.error("Submission Handler Error:", err);
    return res.status(500).json({ 
      success: false, 
      error: err.message || "An internal server error occurred" 
    });
  }
}