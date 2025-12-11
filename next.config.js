/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,

  // REQUIRED for formidable & custom API parsing (Next 14+ syntax)
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },

  api: {
    bodyParser: false,   // Allow multipart/form-data
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
