// pages/api/swift-resolve-pin.js

import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

const TABLE_NAME = process.env.AIRTABLE_SWIFT_TABLE;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: "Missing pin" });
    }

    // Find the SWIFT unit matching this PIN
    const records = await base(TABLE_NAME)
      .select({
        maxRecords: 1,
        filterByFormula: `{access_pin} = "${pin}"`,
        // --- ADD THESE FIELDS TO ENSURE THEY ARE RETURNED ---
        fields: ["public_token", "company", "serial_number", "annual_form_id", "depth_form_id"],
      })
      .firstPage();

    if (!records || records.length === 0) {
      return res.status(404).json({ error: "Code not recognised" });
    }

    const record = records[0];

    // 1. Extract all necessary fields (including new ones)
    const publicToken = record.get("public_token");
    const company = record.get("company");
    const serialNumber = record.get("serial_number");
    const annualFormId = record.get("annual_form_id");
    const depthFormId = record.get("depth_form_id");


    if (!publicToken) {
      return res.status(500).json({
        error: "Unit is missing public_token"
      });
    }

    // 2. Return ALL relevant data
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