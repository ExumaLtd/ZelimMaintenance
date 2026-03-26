// pages/api/swift-resolve-pin.ts

import Airtable from "airtable";
import type { NextApiRequest, NextApiResponse } from 'next';
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Rate limit by IP — 5 attempts per 5 minutes
    const ip = getClientIp(req);
    const { success, reset } = await ratelimit.limit(ip);
    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return res.status(429).json({ error: "Too many failed attempts.", retryAfter });
    }

    const pin = req.query.pin as string;

    if (!pin) {
      return res.status(400).json({ error: "Missing pin" });
    }

    // Reject anything that isn't alphanumeric or is too long (prevents formula injection)
    if (pin.length > 20 || !/^[a-zA-Z0-9]+$/.test(pin)) {
      return res.status(400).json({ error: "Invalid pin format" });
    }

    // Single OR query — find the record matching either PIN type
    const records = await base(TABLE_NAME)
      .select({
        maxRecords: 1,
        filterByFormula: `OR({engineer_pin} = "${pin}", {operator_pin} = "${pin}")`,
        fields: ["public_token", "engineer_pin"],
      })
      .firstPage();

    if (!records || records.length === 0) {
      return res.status(404).json({ error: "Code not recognised" });
    }

    const record = records[0];
    const publicToken = record.get("public_token");

    // Determine access type from whether engineer_pin was populated on this record.
    // We fetch engineer_pin only — operator_pin is never fetched, never in memory.
    const engineerPin = record.get("engineer_pin");
    const accessType = engineerPin === pin ? "maintenance" : "operator";

    return res.status(200).json({
      publicToken,
      accessType
    });

  } catch (err) {
    console.error("PIN lookup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}