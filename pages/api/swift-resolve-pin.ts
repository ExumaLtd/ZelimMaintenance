// pages/api/swift-resolve-pin.ts

import Airtable from "airtable";
import { errorMessage } from '@/utils/errors';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { getClientIp } from "../../lib/api-utils";
import { requireEnv } from "../../lib/env";

const redis = new Redis({
  url: requireEnv('UPSTASH_REDIS_REST_URL'),
  token: requireEnv('UPSTASH_REDIS_REST_TOKEN'),
});

// 5 attempts per IP per 5 minutes
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "5 m"),
  prefix: "rl:pin",
});

// Per-PIN lockout: lock a specific access code after this many failed attempts,
// independent of source IP, so an attacker cannot brute force one code by
// rotating IPs. See the fail-open note in the handler.
const MAX_PIN_FAILURES = 5;
const PIN_LOCK_SECONDS = 15 * 60; // 15 minutes

// Connect to correct Airtable base
const base = new Airtable({ apiKey: requireEnv('AIRTABLE_PAT') }).base(
  requireEnv('AIRTABLE_BASE_ID') // appOQXbopTwS0SdnL
);

const TABLE_NAME = requireEnv('AIRTABLE_SWIFT_TABLE'); // swift_units

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Rate limit by IP, 5 attempts per 5 minutes (fail-open if Redis is unavailable)
    const ip = getClientIp(req);
    try {
      const { success, reset } = await ratelimit.limit(ip);
      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        return res.status(429).json({ error: "Too many failed attempts.", retryAfter });
      }
    } catch (redisErr) {
      console.warn("Rate limiter unavailable, allowing request:", errorMessage(redisErr));
    }

    const pin = req.query.pin as string;

    if (!pin) {
      return res.status(400).json({ error: "Missing pin" });
    }

    // Reject anything that isn't alphanumeric or is too long (prevents formula injection)
    if (pin.length > 20 || !/^[a-zA-Z0-9]+$/.test(pin)) {
      return res.status(400).json({ error: "Invalid pin format" });
    }

    // Per-PIN lockout check. Runs alongside the per-IP limit above and locks a
    // specific code after MAX_PIN_FAILURES failed attempts.
    //
    // Fail-open: if Redis is unavailable we log and allow the attempt rather than
    // lock a technician out of a safety-critical maintenance tool. This is a
    // deliberate availability decision; the per-IP limit remains as a backstop.
    const pinLockKey = `lock:pin:${pin}`;
    try {
      const failures = Number(await redis.get(pinLockKey)) || 0;
      if (failures >= MAX_PIN_FAILURES) {
        const ttl = await redis.ttl(pinLockKey);
        const retryAfter = ttl > 0 ? ttl : PIN_LOCK_SECONDS;
        return res.status(429).json({ error: "Too many failed attempts.", retryAfter });
      }
    } catch (redisErr) {
      console.warn("PIN lockout check unavailable, allowing request:", errorMessage(redisErr));
    }

    // Single OR query to find the record matching either PIN type
    const records = await base(TABLE_NAME)
      .select({
        maxRecords: 1,
        filterByFormula: `OR({engineer_pin} = "${pin}", {operator_pin} = "${pin}")`,
        fields: ["public_token", "engineer_pin"],
      })
      .firstPage();

    if (!records || records.length === 0) {
      // Count this failed attempt toward the per-PIN lockout (fail-open).
      try {
        const count = await redis.incr(pinLockKey);
        if (count === 1) await redis.expire(pinLockKey, PIN_LOCK_SECONDS);
      } catch (redisErr) {
        console.warn("PIN failure counter unavailable:", errorMessage(redisErr));
      }
      return res.status(404).json({ error: "Code not recognised" });
    }

    // Successful lookup, so clear any accumulated failures for this PIN (fail-open).
    try {
      await redis.del(pinLockKey);
    } catch (redisErr) {
      console.warn("PIN counter reset unavailable:", errorMessage(redisErr));
    }

    const record = records[0];
    const publicToken = record.get("public_token");

    // Determine access type from whether engineer_pin was populated on this record.
    // We fetch engineer_pin only. operator_pin is never fetched, never in memory.
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