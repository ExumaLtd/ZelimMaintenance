export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false });
  }

  try {
    // With UploadThing, we receive JSON, not FormData
    const body = req.body;

    const checklist_json = JSON.stringify({
      maintenance_type: body.maintenance_type,
      submitted_at: new Date().toISOString(),
      answers: body.answers || [],
    });

    // Construct Airtable Payload
    const airtablePayload = {
      records: [
        {
          fields: {
            unit: [body.unit_record_id],
            maintenance_type: body.maintenance_type,
            checklist_template: [body.checklist_template_id],
            maintained_by: body.maintained_by,
            engineer_name: body.engineer_name,
            date_of_maintenance: body.date_of_maintenance,
            location_lat: Number(body.location_lat),
            location_lng: Number(body.location_lng),
            location_town: body.location_town,
            location_what3words: body.location_what3words,
            comments: body.comments || "",
            checklist_json: checklist_json,
            // Map the URLs from UploadThing to Airtable format
            photos: body.photoUrls ? body.photoUrls.map(url => ({ url })) : [],
            // Note: signature is handled as a photo URL if you upload it, 
            // for now we'll leave it empty or map it if you use UploadButton for it too.
          },
        },
      ],
    };

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
      console.error("Airtable error:", result);
      return res.status(500).json({ success: false, error: "Airtable save failed" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Submit error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}