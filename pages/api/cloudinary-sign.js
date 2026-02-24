// pages/api/cloudinary-sign.js
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { folder } = req.body;
  if (!folder) {
    return res.status(400).json({ error: 'Missing folder' });
  }

  try {
    const timestamp = Math.round(Date.now() / 1000);

    // Parameters must be sorted alphabetically before signing
    const signature = crypto
      .createHash('sha1')
      .update(`folder=${folder}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`)
      .digest('hex');

    return res.status(200).json({
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
    });
  } catch (err) {
    console.error('Cloudinary signing error:', err);
    return res.status(500).json({ error: 'Failed to generate upload signature' });
  }
}
