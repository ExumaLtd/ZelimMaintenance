/** @type {import('next').NextConfig} */
const nextConfig = {
  api: {
    bodyParser: false, // REQUIRED for formidable to work
  },

  async redirects() {
    return [
      {
        source: '/swift',
        destination: '/',
        permanent: false,
      },
      {
        source: '/swift/',
        destination: '/',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
