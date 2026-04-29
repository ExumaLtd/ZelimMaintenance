// pages/api/cloudinary-sign.ts
import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '../../lib/session';

// Only allow uploads into the zelimmaintenance/SWIFT/ folder tree
const ALLOWED_FOLDER_PREFIX = 'zelimmaintenance/SWIFT/';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSession(req);
  if (!session?.pin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { folder } = req.body;
  if (!folder) {
    return res.status(400).json({ error: 'Missing folder' });
  }

  if (!folder.startsWith(ALLOWED_FOLDER_PREFIX) || !/^[a-zA-Z0-9/_-]+$/.test(folder)) {
    return res.status(400).json({ error: 'Invalid folder' });
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
