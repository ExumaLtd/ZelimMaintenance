// pages/api/swift-resolve-pin.js
// ✔ FIXED to support GET requests (your frontend uses GET)
// ✔ PIN read from req.query instead of req.body
// ✔ Compatible with new Airtable environment variables

import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

const TABLE_NAME = process.env.AIRTABLE_SWIFT_TABLE;

export default async function handler(req, res) {
  // Accept GET (frontend uses GET with ?pin=XXXX)
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { pin } = req.query;

    if (!pin) {
      return res.status(400).json({ error: "Missing pin" });
    }

    // Query AirTable for the record with matching access_pin
    const records = await base(TABLE_NAME)
      .select({
        maxRecords: 1,
        filterByFormula: `{access_pin} = "${pin}"`,
        fields: [
          "public_token",
          "company",
          "serial_number",
          "annual_form_id",
          "depth_form_id"
        ],
      })
      .firstPage();

    if (!records || records.length === 0) {
      return res.status(404).json({ error: "Code not recognised" });
    }

    const record = records[0];

    const publicToken  = record.get("public_token") || null;
    const company      = record.get("company") || null;
    const serialNumber = record.get("serial_number") || null;
    const annualFormId = record.get("annual_form_id") || null;
    const depthFormId  = record.get("depth_form_id") || null;

    if (!publicToken) {
      return res.status(500).json({
        error: "Unit is missing public_token",
      });
    }

    // Return the SWIFT unit details required for next screen
    return res.status(200).json({
      publicToken,
      company,
      serialNumber,
      annualFormId,
      depthFormId,
    });

  } catch (err) {
    console.error("Error resolving pin:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
