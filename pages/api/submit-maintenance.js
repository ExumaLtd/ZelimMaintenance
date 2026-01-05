export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false });

  try {
    const body = req.body;
    const checklist_json = JSON.stringify({
      maintenance_type: body.maintenance_type,
      submitted_at: new Date().toISOString(),
      answers: body.answers || [],
    });

    const airtablePayload = {
      records: [{
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
          photos: body.photoUrls ? body.photoUrls.map(url => ({ url })) : [],
        },
      }],
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
    if (!response.ok) throw new Error(result.error?.message || "Airtable Error");

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}