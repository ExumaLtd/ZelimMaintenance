// pages/api/swift-resolve-pin.js
import Airtable from "airtable";

export default async function handler(req, res) {
  try {
    const pin = req.query.pin?.trim();

    if (!pin) {
      return res.status(400).json({ error: "Missing pin" });
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);

    const table = process.env.AIRTABLE_SWIFT_TABLE; // MUST be "swift_units"

    const records = await base(table)
      .select({
        maxRecords: 1,
        filterByFormula: `{access_pin} = "${pin}"`,
        fields: ["public_token"]
      })
      .firstPage();

    if (!records || records.length === 0) {
      return res.status(404).json({ error: "Code not recognised" });
    }

    const token = records[0].get("public_token");

    if (!token) {
      return res.status(500).json({ error: "Missing public token" });
    }

    return res.status(200).json({ publicToken: token });

  } catch (err) {
    console.error("PIN lookup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
