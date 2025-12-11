// pages/api/swift-resolve-pin.js

import Airtable from "airtable";

// Connect to Airtable base using environment variables
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

    console.log("Resolving pin:", pin);

    // ✅ IMPORTANT: DO NOT LIMIT FIELDS (lookup fields won't return otherwise)
    const records = await base(TABLE_NAME)
      .select({
        maxRecords: 1,
        filterByFormula: `{access_pin} = "${pin}"`, // Must match Airtable exactly
      })
      .firstPage();

    console.log("Airtable result:", records.length);

    if (!records || records.length === 0) {
      return res.status(404).json({ error: "Code not recognised" });
    }

    // Extract public_token (lookup field allowed now)
    const publicToken = records[0].get("public_token");

    if (!publicToken) {
      console.error("public_token missing on record:", records[0].fields);
      return res
        .status(500)
        .json({ error: "public_token not found for this unit" });
    }

    return res.status(200).json({ publicToken });
  } catch (err) {
    console.error("PIN lookup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
