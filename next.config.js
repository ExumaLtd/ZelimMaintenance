/** @type {import('next').NextConfig} */

const nextConfig = {
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

// ✔️ API config MUST be exported separately in Next.js 14+
const api = {
  api: {
    bodyParser: false,
  },
};

module.exports = { ...nextConfig, ...api };
