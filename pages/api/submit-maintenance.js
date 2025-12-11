import formidable from "formidable";
import fs from "fs";
import path from "path";

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // Parse form-data
    const form = new formidable.IncomingForm({ multiples: true });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Extract fields
    const {
      unit_record_id,
      maintenance_type,
      maintained_by,
      engineer_name,
      date_of_maintenance,
      location_lat,
      location_lng,
      location_town,
      location_what3words,
      comments,
    } = fields;

    // Upload helper — converts file to Base64 for Airtable
    const encodeFile = (file) => {
      if (!file) return null;
      const data = fs.readFileSync(file.filepath);
      return `data:${file.mimetype};base64,${data.toString("base64")}`;
    };

    // Convert signature + photos
    const signature = encodeFile(files.signature);
    const photos = Array.isArray(files.photos)
      ? files.photos.map((f) => encodeFile(f))
      : files.photos
      ? [encodeFile(files.photos)]
      : [];

    // Build checklist answers dynamically
    const checklist = {};
    for (let i = 1; i <= 20; i++) {
      if (fields[`q${i}`]) checklist[`q${i}`] = fields[`q${i}`];
    }

    // Prepare Airtable record
    const airtableRecord = {
      fields: {
        unit: [unit_record_id],
        maintenance_type,
        maintained_by,
        engineer_name,
        date_of_maintenance,
        location_lat,
        location_lng,
        location_town,
        location_what3words,
        comments: comments || "",
        signature,
        photos,
        ...checklist,
      },
    };

    // Send to Airtable
    const response = await fetch(
      `${process.env.AIRTABLE_API_URL}/${process.env.AIRTABLE_MAINTENANCE_TABLE}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ records: [airtableRecord] }),
      }
    );

    const json = await response.json();

    if (!response.ok) {
      console.error("Airtable error:", json);
      return res.status(500).json({ success: false, error: "Airtable save failed" });
    }

    return res.status(200).json({ success: true, id: json.records[0].id });
  } catch (error) {
    console.error("Submit error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}
