export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      console.error('❌ Missing ELEVENLABS_API_KEY environment variable');
      return res.status(500).json({ error: 'Missing ELEVENLABS_API_KEY', fallback: true });
    }

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    console.log('✅ Received audio buffer:', buffer.length, 'bytes');

    if (!buffer.length) {
      return res.status(400).json({ error: 'Empty audio buffer', fallback: true });
    }

    // Build multipart form-data for ElevenLabs STT
    // model_id is REQUIRED (your 422 proved it)
    const form = new FormData();

    // If you later want to pass actual mime type from client, we can add a header and read it here.
    const mimeType = 'audio/webm';

    form.append('file', new Blob([buffer], { type: mimeType }), 'audio.webm');
    form.append('model_id', 'scribe_v2');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        // DO NOT set Content-Type manually when using FormData
      },
      body: form,
    });

    const rawText = await response.text();

    if (!response.ok) {
      console.error('❌ ElevenLabs API error:', response.status, rawText);
      // Forward upstream status (422/401/etc) instead of always 500
      return res.status(response.status).json({
        error: 'Transcription failed',
        status: response.status,
        details: rawText,
        fallback: true,
      });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error('❌ ElevenLabs returned non-JSON:', rawText);
      return res.status(502).json({
        error: 'Invalid JSON from ElevenLabs',
        details: rawText,
        fallback: true,
      });
    }

    console.log('✅ ElevenLabs response:', data);

    const text = data.text || data.transcript || data.result || '';

    return res.status(200).json({ text, source: 'elevenlabs' });
  } catch (error) {
    console.error('❌ ElevenLabs transcription error:', error);
    return res.status(500).json({ error: error.message, fallback: true });
  }
}
