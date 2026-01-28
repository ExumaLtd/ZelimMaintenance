// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // CRITICAL: Skip middleware entirely for Next.js internals and static assets
  if (
    pathname.startsWith('/_next') ||           // Next.js internals
    pathname.startsWith('/api') ||             // API routes
    pathname.startsWith('/favicon') ||         // Favicons - THIS SHOULD CATCH IT
    pathname.startsWith('/client_logos') ||    // Client logos
    pathname.startsWith('/logo') ||            // Logos
    pathname.startsWith('/downloads') ||       // Downloads
    pathname.startsWith('/images') ||          // Images
    pathname.startsWith('/icons') ||           // ADD THIS - you have /icons in your structure
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/) // Static files
  ) {
    console.log(`[MIDDLEWARE] Skipping static asset: ${pathname}`);
    return NextResponse.next();
  }
  
  // ADD LOGGING to see what's NOT being caught
  console.log(`[MIDDLEWARE] Processing: ${pathname}`);
  
  // Handle portal routes
  if (pathname.startsWith('/portal/swift')) {
    // Get session from cookie
    const sessionCookie = request.cookies.get('portal_session');
    
    if (!sessionCookie) {
      console.log(`[MIDDLEWARE] No session for: ${pathname}`);
      // No session - redirect to login
      return NextResponse.redirect(new URL('/', request.url));
    }

    try {
      // Decode session
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
      const session = JSON.parse(decoded);

      // Check expiry
      if (session.expires < Date.now()) {
        console.log(`[MIDDLEWARE] Expired session for: ${pathname}`);
        // Session expired - redirect to login
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
      
      console.log(`[MIDDLEWARE] Rewriting ${pathname} → ${internalPath}`);
      
      // Rewrite to the actual page with token (user doesn't see this)
      const url = request.nextUrl.clone();
      url.pathname = internalPath;
      url.searchParams.set('access', session.access);
      
      return NextResponse.rewrite(url);
      
    } catch (error) {
      console.error('[MIDDLEWARE] Session validation error:', error);
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('portal_session');
      return response;
    }
  }
  
  // Block direct access to /swift/* URLs (force use of /portal/swift)
  if (pathname.startsWith('/swift/')) {
    console.log(`[MIDDLEWARE] Blocking direct swift access: ${pathname}`);
    // Allow if coming from internal rewrite (has our marker)
    if (request.headers.get('x-middleware-rewrite')) {
      return NextResponse.next();
    }
    
    // Otherwise redirect to login
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  console.log(`[MIDDLEWARE] Passing through: ${pathname}`);
  return NextResponse.next();
}

// IMPORTANT: Only match the routes that actually need middleware
export const config = {
  matcher: [
    '/portal/swift/:path*',  // Portal routes that need session checking
    '/swift/:path*',         // Direct swift routes that need blocking
  ],
};