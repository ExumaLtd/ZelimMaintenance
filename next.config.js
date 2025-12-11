/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,

  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
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
