import type { NextApiRequest, NextApiResponse } from 'next';
import { errorMessage } from '@/utils/errors';
import { getSession } from '../../lib/session';

export const config = {
  api: {
    bodyParser: false,
  },
};

const DEBUG = process.env.NODE_ENV === 'development';
const log = (...args: any[]) => DEBUG ? console.log(...args) : null;
const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10MB

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSession(req);
  if (!session?.pin) {
    return res.status(401).json({ error: 'Unauthorized' });
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

    // Read audio buffer from request (hard cap at 10MB)
    const chunks = [];
    let totalBytes = 0;
    for await (const chunk of req) {
      totalBytes += chunk.length;
      if (totalBytes > MAX_AUDIO_BYTES) {
        return res.status(413).json({ error: 'Audio file too large', fallback: true });
      }
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    log('✅ Received audio buffer:', buffer.length, 'bytes');

    if (!buffer.length) {
      return res.status(400).json({ 
        error: 'Empty audio buffer',
        fallback: true 
      });
    }

    // Get MIME type from client header
    const mimeType = (req.headers['x-audio-mime'] as string) || 'audio/webm';
    log('📝 Audio MIME type:', mimeType);

    // Build multipart form-data for ElevenLabs STT
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimeType }), 'audio.webm');
    form.append('model_id', 'scribe_v2');

    log('🌐 Sending to ElevenLabs API...');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        // Content-Type with boundary is set automatically by native fetch
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

    log('✅ ElevenLabs response:', data);

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
      details: DEBUG ? errorMessage(error) : undefined,
      fallback: true 
    });
  }
}