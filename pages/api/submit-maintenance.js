import formidable from "formidable";
import fs from "fs";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false });
  }

  try {
    const form = new formidable.IncomingForm({
      multiples: true,
      allowEmptyFiles: true,
      minFileSize: 0,
    });

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

    // ------------------------------------
    // Build checklist JSON from q1, q2, ...
    // ------------------------------------
    const answers = Object.keys(fields)
      .filter((k) => k.startsWith("q"))
      .sort()
      .map((key) => ({
        question: key,
        answer: fields[key],
      }));

    const checklist_json = JSON.stringify({
      maintenance_type,
      submitted_at: new Date().toISOString(),
      answers,
    });

    // ------------------------------------
    // SAFE file encoder (CRITICAL FIX)
    // ------------------------------------
    const encodeFile = (file) => {
      if (!file || !file.filepath || file.size === 0) return null;

      const buffer = fs.readFileSync(file.filepath);
      return {
        filename: file.originalFilename,
        type: file.mimetype,
        data: buffer.toString("base64"),
      };
    };

    // Signature (required on frontend, but still guard)
    const signatureFile = encodeFile(files.signature);
    const signature = signatureFile ? [signatureFile] : [];

    // Photos (optional)
    const photos = [];
    if (Array.isArray(files.photos)) {
      files.photos.forEach((f) => {
        const encoded = encodeFile(f);
        if (encoded) photos.push(encoded);
      });
    } else if (files.photos) {
      const encoded = encodeFile(files.photos);
      if (encoded) photos.push(encoded);
    }

    // ------------------------------------
    // Airtable payload
    // ------------------------------------
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
            comments: comments || "",
            checklist_json,
            signature,
            photos,
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
