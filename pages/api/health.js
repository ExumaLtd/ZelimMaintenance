// pages/api/health.js
// Lightweight health check endpoint - keeps serverless functions warm
// Does NOT make any database calls

export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Function is warm'
  });
}