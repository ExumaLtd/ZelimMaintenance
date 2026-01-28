// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
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

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next (Next.js internals)
     * 2. /api (API routes)
     * 3. /_static (inside /public)
     * 4. /_vercel (Vercel internals)
     * 5. Static files (e.g. /favicon.ico, /sitemap.xml, /robots.txt, etc.)
     */
    '/((?!_next/static|_next/image|_next/data|api|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
    '/portal/swift/:path*',
    '/swift/:path*'
  ],
};