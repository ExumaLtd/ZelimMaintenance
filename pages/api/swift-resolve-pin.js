// pages/api/swift-resolve-pin.js

export default async function handler(req, res) {
  try {
    const pin = req.query.pin;

    if (!pin) {
      return res.status(400).json({ error: "Missing pin" });
    }

    // Build Airtable URL manually (REQUIRED for Vercel reliability)
    const url = `${process.env.AIRTABLE_API_URL}/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_SWIFT_TABLE}?filterByFormula={access_pin}='${pin}'`;

    const airtableRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      },
    });

    const data = await airtableRes.json();

    // If Airtable errors, log it clearly
    if (!airtableRes.ok) {
      console.error("Airtable error:", data);
      return res.status(500).json({ error: "Airtable request failed" });
    }

    if (!data.records || data.records.length === 0) {
      return res.status(404).json({ error: "Code not recognised" });
    }

    const record = data.records[0];
    const publicToken = record.fields.public_token;

    if (!publicToken) {
      console.error("Missing public_token in Airtable record:", record);
      return res.status(500).json({ error: "public_token missing" });
    }

    return res.status(200).json({ publicToken });

  } catch (err) {
    console.error("PIN lookup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
