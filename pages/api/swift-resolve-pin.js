// pages/api/swift-resolve-pin.js

import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

const TABLE_NAME = process.env.AIRTABLE_SWIFT_TABLE;

export default async function handler(req, res) {
  // MUST accept GET because frontend sends GET
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { pin } = req.query;

    if (!pin) {
      return res.status(400).json({ error: "Missing pin" });
    }

    console.log("🔎 Resolving PIN:", pin);

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

    console.log("📄 Airtable returned:", records?.length);

    if (!records || records.length === 0) {
      return res.status(404).json({ error: "Code not recognised" });
    }

    const record = records[0];

    return res.status(200).json({
      publicToken: record.get("public_token"),
      company: record.get("company"),
      serialNumber: record.get("serial_number"),
      annualFormId: record.get("annual_form_id"),
      depthFormId: record.get("depth_form_id"),
    });

  } catch (err) {
    console.error("💥 API ERROR:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
