// pages/api/swift-resolve-pin.js

import Airtable from "airtable";

// Connect to correct Airtable base
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID // appOQXbopTwS0SdnL
);

const TABLE_NAME = process.env.AIRTABLE_SWIFT_TABLE; // swift_units

export default async function handler(req, res) {
  try {
    const pin = req.query.pin;

    if (!pin) {
      return res.status(400).json({ error: "Missing pin" });
    }

    // Lookup using either access_pin OR crew_pin
    const records = await base(TABLE_NAME)
      .select({
        maxRecords: 1,
        filterByFormula: `OR({access_pin} = "${pin}", {crew_pin} = "${pin}")`,
        fields: ["public_token", "access_pin", "crew_pin"],
      })
      .firstPage();

    if (!records || records.length === 0) {
      return res.status(404).json({ error: "Code not recognised" });
    }

    const record = records[0];
    const publicToken = record.get("public_token");
    const accessPin = record.get("access_pin");
    const crewPin = record.get("crew_pin");

    // Determine access type based on which PIN was entered
    const accessType = pin === accessPin ? "maintenance" : "crew";

    return res.status(200).json({ 
      publicToken,
      accessType 
    });

  } catch (err) {
    console.error("PIN lookup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}