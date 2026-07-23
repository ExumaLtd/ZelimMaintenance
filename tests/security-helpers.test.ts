import { describe, it, expect } from 'vitest';
import { esc, getClientIp } from '@/lib/api-utils';
import { encodeSession, getSession } from '@/lib/session';

describe('esc', () => {
  it('doubles single quotes so values cannot break out of filterByFormula', () => {
    expect(esc("O'Brien")).toBe("O''Brien");
    expect(esc("'} , TRUE(), {x} = '")).toBe("''} , TRUE(), {x} = ''");
  });

  it('stringifies null and undefined to empty strings', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });
});

describe('getClientIp', () => {
  it('takes the first hop of x-forwarded-for', () => {
    expect(getClientIp({ headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' } })).toBe('203.0.113.5');
  });

  it('falls back to localhost without the header', () => {
    expect(getClientIp({ headers: {} })).toBe('127.0.0.1');
  });
});

describe('session cookies', () => {
  const data = { token: 'tok123', access: 'maintenance', pin: 'SWI005', expires: Date.now() + 60_000 };

  it('round-trips a signed session', () => {
    const cookie = encodeSession(data);
    const session = getSession({ cookies: { portal_session: cookie } });
    expect(session).toEqual(data);
  });

  it('rejects a tampered payload', () => {
    const cookie = encodeSession(data);
    const [payload, sig] = [cookie.slice(0, cookie.lastIndexOf('.')), cookie.slice(cookie.lastIndexOf('.') + 1)];
    const forged = Buffer.from(JSON.stringify({ ...data, access: 'operator' })).toString('base64');
    expect(getSession({ cookies: { portal_session: `${forged}.${sig}` } })).toBeNull();
    expect(getSession({ cookies: { portal_session: `${payload}.${'0'.repeat(sig.length)}` } })).toBeNull();
  });

  it('rejects an expired session', () => {
    const cookie = encodeSession({ ...data, expires: Date.now() - 1000 });
    expect(getSession({ cookies: { portal_session: cookie } })).toBeNull();
  });

  it('returns null when the cookie is missing or malformed', () => {
    expect(getSession({ cookies: {} })).toBeNull();
    expect(getSession({ cookies: { portal_session: 'garbage' } })).toBeNull();
  });
});
