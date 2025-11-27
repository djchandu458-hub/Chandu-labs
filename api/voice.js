// api/voice.js
//
// Vercel serverless function.
// - Accepts POST requests with either JSON { text, language, mode } OR
//   multipart/form-data containing a recorded audio file + language + mode.
// - If mode === 'cloned' and RVC_SERVER_URL is set, proxy to your RVC/GPU server.
// - Otherwise, call Gemini TTS (GEMINI_API_KEY must be set).
//
// Environment variables (in Vercel Dashboard):
// - GEMINI_API_KEY  (string)  -- your Gemini/Generative AI API key (if using Gemini)
// - RVC_SERVER_URL  (string)  -- https://your-gpu-server.example.com  (if using cloned voice)
// - GEMINI_TTS_URL  (optional) -- override Gemini TTS url if needed

const RVC_SERVER_URL = process.env.RVC_SERVER_URL || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_TTS_URL = process.env.GEMINI_TTS_URL || 'https://api.generativeai.googleapis.com/v1beta2/speech:generate';

async function readRawRequest(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Only POST allowed' });
    return;
  }

  try {
    const contentType = (req.headers['content-type'] || '').toLowerCase();

    // Read raw body so we can forward multipart or JSON unchanged
    const rawBuffer = await readRawRequest(req);

    // If JSON: parse it
    if (contentType.includes('application/json')) {
      const bodyText = rawBuffer.toString('utf8') || '{}';
      const body = JSON.parse(bodyText);
      const { text, language = 'en', mode = 'cloned' } = body;

      if (!text) {
        res.status(400).json({ error: 'Missing text field in JSON body' });
        return;
      }

      // Priority: cloned voice on your RVC server
      if (mode === 'cloned' && RVC_SERVER_URL) {
        // Forward JSON to RVC server's /synthesize endpoint.
        // Expectation: RVC server returns audio/wav bytes.
        const r = await fetch(`${RVC_SERVER_URL.replace(/\/$/,'')}/synthesize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language })
        });

        if (!r.ok) {
          const errText = await r.text();
          console.error('RVC synth error:', r.status, errText);
          res.status(502).json({ error: 'RVC synth failed', details: errText.substring(0,200) });
          return;
        }

        const ab = await r.arrayBuffer();
        res.setHeader('Content-Type', 'audio/wav');
        res.status(200).send(Buffer.from(ab));
        return;
      }

      // Fallback: Gemini TTS
      if (!GEMINI_API_KEY) {
        res.status(500).json({ error: 'No RVC_SERVER_URL or GEMINI_API_KEY configured' });
        return;
      }

      // NOTE: The exact Gemini TTS request body can change with API versions.
      // This is a minimal example that may need adjustment. Check Gemini docs.
      const gRes = await fetch(GEMINI_TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GEMINI_API_KEY}`
        },
        body: JSON.stringify({
          input: { text },
          audio: { encoding: 'LINEAR16', sampleRateHertz: 24000 },
          // optionally pass language or voice settings here, if supported:
          // voice: { languageCode: language }
        })
      });

      if (!gRes.ok) {
        const txt = await gRes.text();
        console.error('Gemini TTS error:', gRes.status, txt);
        res.status(502).json({ error: 'Gemini TTS failed', details: txt.substring(0,300) });
        return;
      }

      const gab = await gRes.arrayBuffer();
      res.setHeader('Content-Type', 'audio/wav');
      res.status(200).send(Buffer.from(gab));
      return;
    }

    // If we get here, it's likely multipart/form-data or binary audio (from mic upload)
    // We will forward the raw body to the RVC server if available.
    if (!RVC_SERVER_URL) {
      res.status(400).json({ error: 'This endpoint received audio, but RVC_SERVER_URL is not set. Set RVC_SERVER_URL to forward audio.' });
      return;
    }

    // Forward raw multipart/binary to RVC server and preserve content-type header.
    const forwardUrl = `${RVC_SERVER_URL.replace(/\/$/,'')}/synthesize`;
    const r = await fetch(forwardUrl, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/octet-stream'
      },
      body: rawBuffer
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error('RVC (audio) error:', r.status, txt);
      res.status(502).json({ error: 'RVC audio processing failed', details: txt.substring(0,200) });
      return;
    }

    const rab = await r.arrayBuffer();
    res.setHeader('Content-Type', 'audio/wav');
    res.status(200).send(Buffer.from(rab));
    return;
  } catch (err) {
    console.error('voice.js error', err);
    res.status(500).json({ error: 'Internal server error', details: String(err).substring(0,300) });
  }
};
