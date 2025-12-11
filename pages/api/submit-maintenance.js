// pages/api/submit-maintenance.js

import formidable from "formidable";
import fs from "fs";
import Airtable from "airtable";

export const config = {
  api: {
    bodyParser: false, // Required for formidable
  },
};

// Convert local uploaded file → buffer for Airtable
function fileToAirtableAttachment(file) {
  const buffer = fs.readFileSync(file.filepath);

  return {
    filename: file.originalFilename || "upload.jpg",
    contentType: file.mimetype,
    data: buffer.toString("base64"),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Parse form-data (files + fields)
  const form = formidable({ multiples: true });

  const { fields, files } = await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });

  try {
    // -----------------------------
    // 1. Pull environment variables
    // -----------------------------
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    }).base(process.env.AIRTABLE_BASE_ID);

    const TABLE_NAME = process.env.AIRTABLE_MAINTENANCE_TABLE;

    if (!TABLE_NAME) {
      throw new Error("AIRTABLE_MAINTENANCE_TABLE is missing in env");
    }

    // -----------------------------
    // 2. Prepare Airtable fields
    // -----------------------------
    const recordData = {
      unit: [fields.unit_record_id], // Linked record
      maintenance_type: fields.maintenance_type,
      maintained_by: fields.maintained_by,
      engineer_name: fields.engineer_name,
      date_of_maintenance: fields.date_of_maintenance,

      // Geo
      location_lat: fields.location_lat || "",
      location_lng: fields.location_lng || "",
      location_town: fields.location_town || "",
      location_what3words: fields.location_what3words || "",

      // Comments
      comments: fields.comments || "",

      // Checklist answers
      checklist_json: JSON.stringify({
        q1: fields.q1,
        q2: fields.q2,
        q3: fields.q3,
        q4: fields.q4,
        q5: fields.q5,
        q6: fields.q6,
        q7: fields.q7,
        q8: fields.q8,
        q9: fields.q9,
        q10: fields.q10,
        q11: fields.q11,
        q12: fields.q12,
        q13: fields.q13,
        q14: fields.q14,
        q15: fields.q15,
        q16: fields.q16,
      }),
    };

    // -----------------------------
    // 3. Handle PHOTOS upload
    // -----------------------------
    if (files.photos) {
      const photoFiles = Array.isArray(files.photos)
        ? files.photos
        : [files.photos];

      recordData.photos = photoFiles.map((file) =>
        fileToAirtableAttachment(file)
      );
    }

    // -----------------------------
    // 4. Handle SIGNATURE upload
    // -----------------------------
    if (files.signature) {
      recordData.signature = [
        fileToAirtableAttachment(files.signature),
      ];
    }

    // -----------------------------
    // 5. Create Airtable record
    // -----------------------------
    await base(TABLE_NAME).create(recordData);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Submit Maintenance API Error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
