// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // CRITICAL: Skip middleware entirely for Next.js internals and static assets
  if (
    pathname.startsWith('/_next') ||           // Next.js internals
    pathname.startsWith('/api') ||             // API routes
    pathname.startsWith('/favicon') ||         // Favicons
    pathname.startsWith('/client_logos') ||    // Client logos
    pathname.startsWith('/logo') ||            // Logos
    pathname.startsWith('/downloads') ||       // Downloads
    pathname.startsWith('/images') ||          // Images
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/) // Static files
  ) {
    return NextResponse.next();
  }
  
  // Handle portal routes
  if (pathname.startsWith('/portal/swift')) {
    // Get session from cookie
    const sessionCookie = request.cookies.get('portal_session');
    
    if (!sessionCookie) {
      // No session - redirect to login
      return NextResponse.redirect(new URL('/', request.url));
    }

    try {
      // Decode session
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
      const session = JSON.parse(decoded);

      // Check expiry
      if (session.expires < Date.now()) {
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
      
      // Rewrite to the actual page with token (user doesn't see this)
      const url = request.nextUrl.clone();
      url.pathname = internalPath;
      url.searchParams.set('access', session.access);
      
      return NextResponse.rewrite(url);
      
    } catch (error) {
      console.error('Session validation error:', error);
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('portal_session');
      return response;
    }
  }
  
  // Block direct access to /swift/* URLs (force use of /portal/swift)
  if (pathname.startsWith('/swift/')) {
    // Allow if coming from internal rewrite (has our marker)
    if (request.headers.get('x-middleware-rewrite')) {
      return NextResponse.next();
    }
    
    // Otherwise redirect to login
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

// Simplified matcher - let the logic above handle exclusions
export const config = {
  matcher: [
    '/(.*)', // Match everything, we'll filter in the function
  ],
};