import formidable from "formidable";
import fs from "fs";
import fetch from "node-fetch";

export const config = {
  api: {
    bodyParser: false, // Required so formidable can handle multipart
  },
};

// -------------------------------------------------------------
// Helper: Upload a file buffer to Airtable as an attachment
// -------------------------------------------------------------
async function uploadToAirtableAttachment(buffer, filename) {
  const uploadReq = await fetch("https://api.airtable.com/v0/attachments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // Upload as base64 (Airtable’s new attachment API format)
      file: buffer.toString("base64"),
      filename: filename,
    }),
  });

  const uploadJson = await uploadReq.json();
  if (!uploadJson?.id) {
    throw new Error("Attachment upload failed");
  }

  return {
    url: uploadJson.url,
    filename: filename,
  };
}

// -------------------------------------------------------------
// Parse multipart/form-data
// -------------------------------------------------------------
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: true,
      keepExtensions: true,
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

// -------------------------------------------------------------
// MAIN HANDLER
// -------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { fields, files } = await parseForm(req);

    // ---------------------------------------------------------
    // Extract fields
    // ---------------------------------------------------------
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

    // Build Q1–Q16 JSON
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

    // ---------------------------------------------------------
    // Upload signature
    // ---------------------------------------------------------
    let signatureAttachment = [];
    if (files.signature) {
      const sigBuffer = fs.readFileSync(files.signature.filepath);
      const uploaded = await uploadToAirtableAttachment(sigBuffer, "signature.png");
      signatureAttachment.push(uploaded);
    }

    // ---------------------------------------------------------
    // Upload photos (0-many)
    // ---------------------------------------------------------
    let photoAttachments = [];
    if (files.photos) {
      const photoArray = Array.isArray(files.photos)
        ? files.photos
        : [files.photos];

      for (let file of photoArray) {
        const buffer = fs.readFileSync(file.filepath);
        const uploaded = await uploadToAirtableAttachment(
          buffer,
          file.originalFilename
        );
        photoAttachments.push(uploaded);
      }
    }

    // ---------------------------------------------------------
    // CREATE maintenance_checks RECORD IN AIRTABLE
    // ---------------------------------------------------------
    const createReq = await fetch(
      `${process.env.AIRTABLE_API_URL}/maintenance_checks`,
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
                maintenance_type: maintenance_type,
                date_of_maintenance: date_of_maintenance,
                maintained_by: maintained_by,
                engineer_name: engineer_name,
                location_town: location_town || "",
                location_what3words: location_what3words || "",
                location_lat: location_lat || "",
                location_lng: location_lng || "",
                checklist_json: checklist_json,
                photos: photoAttachments,
                signature: signatureAttachment,
              },
            },
          ],
        }),
      }
    );

    const createJson = await createReq.json();

    if (!createJson?.records) {
      return res.status(500).json({
        success: false,
        error: "Airtable record creation failed",
        airtable: createJson,
      });
    }

    // ---------------------------------------------------------
    // SUCCESS
    // ---------------------------------------------------------
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Submit error:", err);
    return res.status(500).json({
      success: false,
      error: "Server error submitting maintenance",
    });
  }
}
