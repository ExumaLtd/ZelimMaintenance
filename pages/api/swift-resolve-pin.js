// pages/api/swift-resolve-pin.js

import Airtable from "airtable";

// Connect to correct base
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

const TABLE_NAME = process.env.AIRTABLE_SWIFT_TABLE;

export default async function handler(req, res) {
  try {
    const pin = req.query.pin;

    if (!pin) {
      return res.status(400).json({ error: "Missing pin" });
    }

    // Lookup by correct field: access_pin
    const records = await base(TABLE_NAME)
      .select({
        maxRecords: 1,
        filterByFormula: `{access_pin} = "${pin}"`,
        fields: ["public_token"],  // ONLY field we use now
      })
      .firstPage();

    if (!records || records.length === 0) {
      return res.status(404).json({ error: "Code not recognised" });
    }

    const publicToken = records[0].get("public_token");

    return res.status(200).json({ publicToken });

  } catch (err) {
    console.error("PIN lookup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
