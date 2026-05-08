/**
 * ROO API — Cloudflare Pages Function (catch-all)
 * /api/health  → GET  → deployment health + env status
 * /api/analyze → POST → multipart audio/image → Gemini API analysis
 */
export async function onRequest({ request, env }) {
  const url = new URL(request.url);

  if (url.pathname === '/api/health' && request.method === 'GET') {
    return json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      config: {
        api_key_set: Boolean(env.GEMINI_API_KEY),
        model: env.GEMINI_MODEL_NAME || 'gemini-2.0-flash',
        runtime: 'Cloudflare Pages Function'
      }
    });
  }

  if (url.pathname === '/api/analyze' && request.method === 'POST') {
    return analyze(request, env);
  }

  return json({ error: 'Not found' }, 404);
}

/* ── Core analysis ──────────────────────────────────────────── */

async function analyze(request, env) {
  const KEY = env.GEMINI_API_KEY;
  const MODEL = env.GEMINI_MODEL_NAME || 'gemini-2.0-flash';

  if (!KEY) return json({ error: 'GEMINI_API_KEY not configured.' }, 500);

  try {
    const form = await request.formData();
    const parts = [];
    let hasAudio = false, hasImage = false;

    const a = form.get('audio');
    if (a?.size > 0) {
      const mime = a.type || 'audio/wav';
      if (!/wav|mpeg|mp3|flac|ogg|aac|m4a/i.test(mime))
        return json({ error: `Format: ${mime}. Use WAV, MP3, FLAC, or OGG.` }, 400);
      parts.push({ inlineData: { mimeType: mime, data: toB64(await a.arrayBuffer()) } });
      hasAudio = true;
    }

    const img = form.get('image');
    if (img?.size > 0) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: toB64(await img.arrayBuffer()) } });
      hasImage = true;
    }

    if (!parts.length) return json({ error: 'No input.' }, 400);

    const mode = hasAudio && hasImage ? 'both' : hasAudio ? 'audio' : 'image';

    parts.push({ text: PROMPT(mode) });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
      { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[{ parts }], generationConfig:{ temperature:0.1, maxOutputTokens:400 } }) }
    );

    if (!res.ok) {
      const e = await res.text();
      return json({ error: `Gemini ${res.status}: ${e.slice(0,200)}`, model: MODEL }, 502);
    }

    const d = await res.json();
    const raw = d?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let out;
    try {
      out = JSON.parse(raw.replace(/```(?:json)?\s*/gi,'').replace(/\s*```/gi,'').trim());
    } catch {
      out = { category:'UNKNOWN', confidence:0, severity:'LOW', reasoning:'Parse error.', parent_action:'Try again.', response_sound:'whitenoise', pre_cry:false, pre_cry_message:null };
    }

    out._meta = { mode, model: MODEL, timestamp: new Date().toISOString() };
    return json(out);

  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

/* ── Helpers ────────────────────────────────────────────────── */

function toB64(buf) {
  const bytes = new Uint8Array(buf), chunks = [];
  for (let i = 0; i < bytes.length; i += 4096)
    chunks.push(String.fromCharCode(...bytes.slice(i, i + 4096)));
  return btoa(chunks.join(''));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

function PROMPT(mode) {
  return `You are ROO, the world's best baby cry analyst.

${mode === 'both' ? 'CROSS-REFERENCE the audio AND image for highest accuracy.' : `You have ${mode} input.`}

CRY PATTERNS:
HUNGER: rhythmic "neh", builds slow, 400–600Hz, stops/resumes → feed
PAIN: sudden sharp pierce, 600–800Hz, breath pauses, urgent → soothe
TIRED: whiny nasal, irregular fade, 300–450Hz, droopy → sleep
DISCOMFORT: sustained medium, 400–500Hz, grunting → adjust
BURPING: short bursts, dropping pitch, strain sounds → burp

VISUAL CUES (if image):
Hunger: rooting reflex, hands→mouth, lip smack
Pain: scrunched face, shut eyes, red, arched
Tired: droopy lids, glassy eyes, limp, yawn
Discomfort: arched back, legs up, grimace

Think step by step. Output ONLY JSON:
{"category":"HUNGER","confidence":87,"severity":"MEDIUM","reasoning":"…","parent_action":"Feed baby now.","response_sound":"heartbeat","pre_cry":false,"pre_cry_message":null}

severity: LOW|MEDIUM|HIGH|CRITICAL
sound: heartbeat|whitenoise|lullaby|shush`;
}
