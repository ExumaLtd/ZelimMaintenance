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
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    console.log('Received audio buffer:', buffer.length, 'bytes');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: buffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      return res.status(500).json({ error: 'Transcription failed', fallback: true });
    }

    const data = await response.json();
    console.log('ElevenLabs response:', data);
    
    return res.status(200).json({ text: data.text, source: 'elevenlabs' });
    
  } catch (error) {
    console.error('ElevenLabs transcription error:', error);
    return res.status(500).json({ error: error.message, fallback: true });
  }
}