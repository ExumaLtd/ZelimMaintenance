// pages/api/swift-resolve-pin.js

import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

const TABLE_NAME = process.env.AIRTABLE_SWIFT_TABLE;

export default async function handler(req, res) {
  try {
    const pin = req.query.pin;

    if (!pin) {
      return res.status(400).json({ error: "Missing access code." });
    }

    console.log("🔍 Looking up PIN:", pin);
    console.log("🔍 Table name:", TABLE_NAME);

    const records = await base(TABLE_NAME)
      .select({
        maxRecords: 1,
        filterByFormula: `{access_pin} = "${pin}"`,
        fields: ["public_token"]
      })
      .firstPage();

    if (!records || records.length === 0) {
      console.log("❌ No matching PIN");
      return res.status(404).json({ error: "Code not recognised" });
    }

    const publicToken = records[0].get("public_token");

    console.log("✅ Token found:", publicToken);

    return res.status(200).json({ publicToken });

  } catch (err) {
    console.error("🔥 Airtable PIN lookup error:", err);
    return res.status(500).json({ error: "Airtable request failed" });
  }
}
