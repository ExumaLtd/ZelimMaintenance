export default async function handler(req, res) {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Missing lat/lon' });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&accept-language=en-GB`,
      {
        headers: {
          'User-Agent': 'SWIFT Maintenance App (maintenance.exuma.co.uk)',
        },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Geocoding failed' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
