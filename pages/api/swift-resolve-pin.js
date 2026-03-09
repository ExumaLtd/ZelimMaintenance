// pages/api/swift-resolve-pin.js

import Airtable from "airtable";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 5 attempts per IP per 5 minutes
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "5 m"),
  prefix: "rl:pin",
});

// Connect to correct Airtable base
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID // appOQXbopTwS0SdnL
);

const TABLE_NAME = process.env.AIRTABLE_SWIFT_TABLE; // swift_units

export default async function handler(req, res) {
  try {
    // Rate limit by IP — 5 attempts per 5 minutes
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? '127.0.0.1';
    const { success, reset } = await ratelimit.limit(ip);
    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return res.status(429).json({ error: "Too many failed attempts.", retryAfter });
    }

    const pin = req.query.pin;

    if (!pin) {
      return res.status(400).json({ error: "Missing pin" });
    }

    // Reject anything that isn't alphanumeric or is too long (prevents formula injection)
    if (pin.length > 20 || !/^[a-zA-Z0-9]+$/.test(pin)) {
      return res.status(400).json({ error: "Invalid pin format" });
    }

    // Lookup using either access_pin OR operator_pin
    const records = await base(TABLE_NAME)
      .select({
        maxRecords: 1,
        filterByFormula: `OR({access_pin} = "${pin}", {operator_pin} = "${pin}")`,
        fields: ["public_token", "access_pin", "operator_pin"],
      })
      .firstPage();

    if (!records || records.length === 0) {
      return res.status(404).json({ error: "Code not recognised" });
    }

    const record = records[0];
    const publicToken = record.get("public_token");
    const accessPin = record.get("access_pin");
    const operatorPin = record.get("operator_pin");

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