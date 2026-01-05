import formidable from "formidable";
import fs from "fs";

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

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

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
      comments,
    } = fields;

    // -----------------------------
    // Build checklist JSON
    // -----------------------------
    const answers = [];

    Object.keys(fields)
      .filter((key) => key.startsWith("q_"))
      .sort()
      .forEach((key) => {
        answers.push({
          question: fields[`${key}_label`],
          answer: fields[key],
        });
      });

    const checklist_json = {
      maintenance_type,
      submitted_at: new Date().toISOString(),
      answers,
    };

    // -----------------------------
    // File encoding helper
    // -----------------------------
    const encodeFile = (file) => {
      if (!file) return null;
      const buffer = fs.readFileSync(file.filepath);
      return {
        filename: file.originalFilename,
        contentType: file.mimetype,
        data: buffer.toString("base64"),
      };
    };

    // Signature
    const signature =
      files.signature && encodeFile(files.signature)
        ? [{ ...encodeFile(files.signature) }]
        : [];

    // Photos
    const photos = Array.isArray(files.photos)
      ? files.photos.map((f) => encodeFile(f))
      : files.photos
      ? [encodeFile(files.photos)]
      : [];

    // -----------------------------
    // Airtable payload
    // -----------------------------
    const airtablePayload = {
      records: [
        {
          fields: {
            unit: [unit_record_id],
            maintenance_type,
            checklist_template: [checklist_template_id],
            maintained_by,
            engineer_name,
            date_of_maintenance,
            location_lat: Number(location_lat),
            location_lng: Number(location_lng),
            location_town,
            location_what3words,
            checklist_json: JSON.stringify(checklist_json),
            photos,
            signature,
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
      return res.status(500).json({ success: false });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Submit error:", err);
    return res.status(500).json({ success: false });
  }
}
