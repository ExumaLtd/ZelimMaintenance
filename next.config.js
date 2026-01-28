/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,

  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },

  // Add images configuration for external domains
  images: {
    domains: [
      'res.cloudinary.com', // For Cloudinary images
      'api.airtable.com',   // If you're loading images from Airtable
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
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