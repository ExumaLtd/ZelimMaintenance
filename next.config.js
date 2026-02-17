/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,

  turbopack: {
    root: __dirname,
  },

  // Add images configuration for external domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'api.airtable.com',
      },
    ],
  },

  // Add custom headers for caching control
  async headers() {
    return [
      // ========================================
      // PREVENT caching of HTML pages and API routes
      // ========================================
      {
        source: '/:path((?!_next/static|favicon|client_logos|logo|images).*)*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      // ========================================
      // ALLOW caching of static assets
      // ========================================
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/favicon/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/client_logos/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/logo/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/swift",
        destination: "/",
        permanent: false,
      },
      {
        source: "/swift/",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;