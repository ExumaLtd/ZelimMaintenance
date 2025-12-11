import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false, // ❗ Required for file uploads
  },
};

// Helper: Convert file to base64 buffer for Airtable attachments
async function fileToAirtableAttachment(file) {
  const data = await fs.promises.readFile(file.filepath);
  const base64 = data.toString("base64");

  return {
    url: `data:${file.mimetype};base64,${base64}`,
    filename: file.originalFilename || "upload",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    // 1. Parse multipart form (text fields + signature + photos)
    const form = formidable({ multiples: true });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, flds, fls) => {
        if (err) reject(err);
        resolve({ fields: flds, files: fls });
      });
    });

    const {
      unit_record_id,
      maintenance_type,
      maintained_by,
      engineer_name,
      date_of_maintenance,
      comments,
      location_lat,
      location_lng,
      location_town,
      location_what3words,
      ...checklist
    } = fields;

    // 2. Prepare attachments
    let signatureAttachment = null;
    let photoAttachments = [];

    if (files.signature) {
      signatureAttachment = await fileToAirtableAttachment(files.signature);
    }

    if (files.photos) {
      const array = Array.isArray(files.photos)
        ? files.photos
        : [files.photos];

      for (const photo of array) {
        const att = await fileToAirtableAttachment(photo);
        photoAttachments.push(att);
      }
    }

    // 3. Create Airtable submission record
    const payload = {
      fields: {
        unit_record_id,
        maintenance_type,
        maintained_by,
        engineer_name,
        date_of_maintenance,
        comments,
        location_lat,
        location_lng,
        location_town,
        location_what3words,

        // Geo debug helper
        location_combined: `Lat: ${location_lat}, Lng: ${location_lng}, Town: ${location_town}, W3W: ${location_what3words}`,

        // Checklist questions
        ...Object.fromEntries(
          Object.entries(checklist).map(([key, val]) => [
            key,
            Array.isArray(val) ? val[0] : val,
          ])
        ),

        // Attachments
        signature: signatureAttachment ? [signatureAttachment] : undefined,
        photos: photoAttachments.length ? photoAttachments : undefined,
      },
    };

    const AIRTABLE_URL = `${process.env.AIRTABLE_API_URL}/swift_maintenance_logs`;

    const airtableRes = await fetch(AIRTABLE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const airtableJson = await airtableRes.json();

    if (!airtableRes.ok) {
      console.error("Airtable error:", airtableJson);
      return res.status(400).json({
        success: false,
        error: airtableJson.error?.message || "Airtable submission failed",
      });
    }

    // 4. Success 🎉
    return res.status(200).json({
      success: true,
      id: airtableJson.id,
    });
  } catch (err) {
    console.error("Submit error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}
