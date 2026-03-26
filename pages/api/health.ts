// pages/api/health.ts
// Lightweight health check endpoint - keeps serverless functions warm
// Does NOT make any database calls
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Function is warm'
  });
}