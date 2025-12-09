// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add the redirects configuration here
  async redirects() {
    return [
      {
        // 1. Redirect /swift to the root login page (/)
        source: '/swift',
        destination: '/',
        permanent: false, // Use 302 (temporary) redirect
      },
      {
        // 2. Also handle the /swift/ (with trailing slash) case
        source: '/swift/',
        destination: '/',
        permanent: false,
      },
    ];
  },

  // Leave other options empty for now, or add existing ones if you had them
};

module.exports = nextConfig;