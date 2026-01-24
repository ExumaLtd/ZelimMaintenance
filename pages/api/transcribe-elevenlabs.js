export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const audioBlob = req.body;
    
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: audioBlob,
    });

    if (!response.ok) {
      throw new Error('ElevenLabs API failed');
    }

    const data = await response.json();
    return res.status(200).json({ text: data.text, source: 'elevenlabs' });
    
  } catch (error) {
    console.error('ElevenLabs error:', error);
    return res.status(500).json({ error: error.message, fallback: true });
  }
}
```

### **3. Updated VoiceInput Component**
- Records audio as blob
- Tries ElevenLabs API
- On failure → uses browser API
- Shows subtle indicator of which is being used (optional)

---

## 🔑 Environment Variable Needed:

Add to your `.env.local`:
```
ELEVENLABS_API_KEY=sk_326c5b625d9d5556b697bb37449c8a5136bba8bc74f95011