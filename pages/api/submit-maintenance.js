// pages/api/submit-maintenance.js

import formidable from "formidable";
import fs from "fs";
import fetch from "node-fetch";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Upload file buffer to Airtable's attachment API
async function uploadToAirtableAttachment(buffer, filename) {
  const uploadReq = await fetch("https://api.airtable.com/v0/attachments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file: buffer.toString("base64"),
      filename,
    }),
  });

  const json = await uploadReq.json();
  if (!json?.id) throw new Error("Attachment upload failed");

  return {
    url: json.url,
    filename,
  };
}

// Parse multipart form (photos, signature, fields)
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: true, keepExtensions: true });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { fields, files } = await parseForm(req);

    const {
      maintained_by,
      engineer_name,
      date_of_maintenance,
      unit_record_id,
      maintenance_type,
      location_lat,
      location_lng,
      location_town,
      location_what3words,
    } = fields;

    // Build checklist JSON
    const checklist_json = JSON.stringify({
      q1: fields.q1 || "",
      q2: fields.q2 || "",
      q3: fields.q3 || "",
      q4: fields.q4 || "",
      q5: fields.q5 || "",
      q6: fields.q6 || "",
      q7: fields.q7 || "",
      q8: fields.q8 || "",
      q9: fields.q9 || "",
      q10: fields.q10 || "",
      q11: fields.q11 || "",
      q12: fields.q12 || "",
      q13: fields.q13 || "",
      q14: fields.q14 || "",
      q15: fields.q15 || "",
      q16: fields.q16 || "",
      comments: fields.comments || "",
    });

    // Upload signature
    let signatureAttachment = [];
    if (files.signature) {
      const buffer = fs.readFileSync(files.signature.filepath);
      signatureAttachment.push(
        await uploadToAirtableAttachment(buffer, "signature.png")
      );
    }

    // Upload photos
    let photoAttachments = [];
    if (files.photos) {
      const photos = Array.isArray(files.photos) ? files.photos : [files.photos];

      for (let file of photos) {
        const buffer = fs.readFileSync(file.filepath);
        photoAttachments.push(
          await uploadToAirtableAttachment(
            buffer,
            file.originalFilename || "photo.jpg"
          )
        );
      }
    }

    // CREATE RECORD IN maintenance_checks
    const createReq = await fetch(
      `${process.env.AIRTABLE_API_URL}/${process.env.AIRTABLE_MAINTENANCE_TABLE}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: [
            {
              fields: {
                unit: [unit_record_id],
                maintenance_type,
                date_of_maintenance,
                maintained_by,
                engineer_name,
                location_lat,
                location_lng,
                location_town,
                location_what3words,
                checklist_json,
                photos: photoAttachments,
                signature: signatureAttachment,
              },
            },
          ],
        }),
      }
    );

    const json = await createReq.json();

    if (!json?.records) {
      return res.status(500).json({
        success: false,
        error: "Airtable failed to create record",
        airtable: json,
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Submit error:", err);
    return res.status(500).json({
      success: false,
      error: "Server error submitting maintenance",
    });
  }
}
