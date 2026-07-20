import { NextResponse } from 'next/server';

/**
 * Verify the HMAC signature and decode the session cookie.
 * Uses Web Crypto API (available in Edge Runtime and Node.js 18+).
 */
async function verifySession(value) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  const dotIndex = value.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const payload = value.slice(0, dotIndex);
  const sig = value.slice(dotIndex + 1);

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Convert hex signature to bytes
    const sigBytes = new Uint8Array(sig.match(/.{2}/g).map(h => parseInt(h, 16)));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payload));
    if (!valid) return null;

    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Handle portal routes
  if (pathname.startsWith('/portal/swift')) {
    const sessionCookie = request.cookies.get('portal_session');

    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const session = await verifySession(sessionCookie.value);

    if (!session) {
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('portal_session');
      return response;
    }

    if (session.expires < Date.now()) {
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('portal_session');
      return response;
    }

    // Extract page from portal URL
    // /portal/swift → dashboard
    // /portal/swift/monthly → monthly form
    const pagePath = pathname.replace('/portal/swift', '') || '';

    // Build the actual internal path with token
    const internalPath = `/swift/${session.token}${pagePath}`;

    // Rewrite to the actual page with token (user doesn't see this)
    const url = request.nextUrl.clone();
    url.pathname = internalPath;
    url.searchParams.set('access', session.access);

    return NextResponse.rewrite(url);
  }

  // Direct /swift/* access is no longer policed here. Each swift page verifies
  // the session and that the URL token matches the session in getServerSideProps,
  // so it redirects unauthenticated or cross-unit requests on its own. The
  // previous edge block trusted an x-middleware-rewrite request header to let the
  // internal rewrite through, and that header is client-settable, so relying on
  // it for access control was unsafe. It has been removed.
  return NextResponse.next();
}

// CRITICAL: Only match the routes that actually need middleware
// This prevents middleware from running on static assets, API routes, and other paths
// Dramatically improves performance by reducing middleware invocations from 100% to ~5% of requests
export const config = {
  matcher: [
    '/portal/swift/:path*',  // Portal routes that need session checking
  ],
};
