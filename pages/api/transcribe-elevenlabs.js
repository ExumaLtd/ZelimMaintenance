import FormData from 'form-data';

export const config = {
  api: {
    bodyParser: false,
  },
};

const DEBUG = process.env.NODE_ENV === 'development';
const log = (...args) => DEBUG ? console.log(...args) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check API key
    if (!process.env.ELEVENLABS_API_KEY) {
      console.error('❌ Missing ELEVENLABS_API_KEY environment variable');
      return res.status(500).json({ 
        error: 'Server configuration error',
        fallback: true 
      });
    }

    // Read audio buffer from request
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    console.log('✅ Received audio buffer:', buffer.length, 'bytes');
    console.log('🔍 Buffer first 20 bytes:', buffer.slice(0, 20));

    if (!buffer.length) {
      return res.status(400).json({ 
        error: 'Empty audio buffer',
        fallback: true 
      });
    }

    // Get MIME type from client header
    const mimeType = req.headers['x-audio-mime'] || 'audio/webm';
    console.log('📝 Audio MIME type:', mimeType);

    // Build multipart form-data for ElevenLabs STT
    const form = new FormData();
    form.append('file', buffer, {
      filename: 'audio.webm',
      contentType: mimeType,
    });
    form.append('model_id', 'scribe_v2');

    console.log('🌐 Sending to ElevenLabs API...');

    // ✅ FIX: Import node-fetch dynamically and use it instead of native fetch
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        ...form.getHeaders(), // Includes Content-Type with boundary
      },
      body: form,
    });

    const rawText = await response.text();

    if (!response.ok) {
      console.error('❌ ElevenLabs API error:', response.status);
      console.error('❌ ElevenLabs response:', rawText);
      console.error('❌ Buffer size was:', buffer.length);
      console.error('❌ MIME type was:', mimeType);
      
      return res.status(response.status).json({
        error: 'Transcription failed',
        status: response.status,
        details: DEBUG ? rawText : undefined,
        fallback: true,
      });
    }

    // Parse JSON response
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error('❌ ElevenLabs returned non-JSON:', rawText);
      return res.status(502).json({
        error: 'Invalid response from transcription service',
        details: DEBUG ? rawText : undefined,
        fallback: true,
      });
    }

    console.log('✅ ElevenLabs response:', data);

    // Extract text from response
    const text = data.text || data.transcript || data.result || '';

    if (!text) {
      log('⚠️ Empty transcription result');
      return res.status(200).json({ 
        text: '',
        source: 'elevenlabs',
        warning: 'No speech detected'
      });
    }

    return res.status(200).json({ 
      text,
      source: 'elevenlabs'
    });

  } catch (error) {
    console.error('❌ Transcription error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: DEBUG ? error.message : undefined,
      fallback: true 
    });
  }
}