// pages/api/swift-resolve-pin.js

import Airtable from "airtable";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { getClientIp } from "../../utils/api-utils";

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
    const ip = getClientIp(req);
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

    // Run two queries in parallel — one per PIN type.
    // Whichever returns a record tells us the access type without fetching raw PIN values.
    const [engRecords, opRecords] = await Promise.all([
      base(TABLE_NAME)
        .select({
          maxRecords: 1,
          filterByFormula: `{engineer_pin} = "${pin}"`,
          fields: ["public_token"],
        })
        .firstPage(),
      base(TABLE_NAME)
        .select({
          maxRecords: 1,
          filterByFormula: `{operator_pin} = "${pin}"`,
          fields: ["public_token"],
        })
        .firstPage(),
    ]);

    // Engineer takes precedence if a unit somehow has identical PINs
    const matchedRecord = engRecords[0] || opRecords[0];
    if (!matchedRecord) {
      return res.status(404).json({ error: "Code not recognised" });
    }

    const publicToken = matchedRecord.get("public_token");
    const accessType = engRecords.length > 0 ? "maintenance" : "operator";

    return res.status(200).json({
      publicToken,
      accessType
    });

  } catch (err) {
    console.error("PIN lookup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}