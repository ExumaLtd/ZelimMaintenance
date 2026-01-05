import formidable from "formidable";

// Disable Next body parser
export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false });
  }

  try {
    const form = new formidable.IncomingForm({ multiples: true });

    const { fields } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields });
      });
    });

    // -----------------------------
    // REQUIRED CORE FIELDS
    // -----------------------------
    const {
      unit_record_id,
      maintenance_type,
      checklist_template_id,
      maintained_by,
      engineer_name,
      date_of_maintenance,
      location_lat,
      location_lng,
      location_town,
      location_what3words,
    } = fields;

    // -----------------------------
    // BUILD CHECKLIST ANSWERS
    // -----------------------------
    const answers = [];

    Object.keys(fields)
      .filter((key) => /^q\d+$/.test(key)) // q1, q2, q3
      .sort((a, b) => {
        const na = Number(a.replace("q", ""));
        const nb = Number(b.replace("q", ""));
        return na - nb;
      })
      .forEach((key) => {
        answers.push({
          question: key,
          answer: fields[key],
        });
      });

    const checklist_json = {
      maintenance_type,
      submitted_at: new Date().toISOString(),
      answers,
    };

    // -----------------------------
    // AIRTABLE PAYLOAD
    // -----------------------------
    const airtablePayload = {
      records: [
        {
          fields: {
            unit: [unit_record_id], // linked record MUST be array
            maintenance_type,
            checklist_template: [checklist_template_id],
            maintained_by,
            engineer_name,
            date_of_maintenance,
            location_lat: Number(location_lat),
            location_lng: Number(location_lng),
            location_town,
            location_what3words,
            checklist_json, // send as object
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
      return res.status(500).json({ success: false, error: result });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Submit error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
