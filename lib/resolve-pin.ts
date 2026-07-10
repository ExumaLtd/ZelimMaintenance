// lib/resolve-pin.ts
// Server-side resolution of an access PIN to its unit token and access type.
// Airtable is the single source of truth: callers must never trust a publicToken
// or accessType supplied by the client, they must derive both from here.
import Airtable from 'airtable';

export type AccessType = 'maintenance' | 'operator';

export interface ResolvedPin {
  publicToken: string;
  accessType: AccessType;
}

// Airtable-shaped base function. Kept minimal so a fake can be injected in tests.
export type AirtableBase = (tableName: string) => {
  select: (opts: any) => { firstPage: () => Promise<any[]> };
};

const PIN_PATTERN = /^[a-zA-Z0-9]+$/;

// Reject anything that is not short and alphanumeric. This also prevents
// formula injection, since the value is interpolated into filterByFormula.
export function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === 'string' && pin.length > 0 && pin.length <= 20 && PIN_PATTERN.test(pin);
}

let defaultBase: AirtableBase | null = null;
function getDefaultBase(): AirtableBase {
  if (!defaultBase) {
    defaultBase = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      process.env.AIRTABLE_BASE_ID
    ) as unknown as AirtableBase;
  }
  return defaultBase;
}

// Look up the PIN and derive the unit token and access type from the matched
// record. Returns null when the PIN matches no record. `base` is injectable so
// tests can exercise this without touching Airtable; production callers omit it.
// The caller must have already validated `accessPin` with isValidPinFormat.
export async function resolvePin(
  accessPin: string,
  base: AirtableBase = getDefaultBase()
): Promise<ResolvedPin | null> {
  const tableName = process.env.AIRTABLE_SWIFT_TABLE as string;

  const records = await base(tableName)
    .select({
      maxRecords: 1,
      filterByFormula: `OR({engineer_pin} = "${accessPin}", {operator_pin} = "${accessPin}")`,
      // Fetch engineer_pin only. operator_pin is never read into memory, so the
      // access type is inferred from whether engineer_pin matches this PIN.
      fields: ['public_token', 'engineer_pin'],
    })
    .firstPage();

  if (!records || records.length === 0) {
    return null;
  }

  const record = records[0];
  const publicToken = record.get('public_token') as string;
  const engineerPin = record.get('engineer_pin');
  const accessType: AccessType = engineerPin === accessPin ? 'maintenance' : 'operator';

  return { publicToken, accessType };
}
