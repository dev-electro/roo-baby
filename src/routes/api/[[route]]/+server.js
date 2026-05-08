/**
 * ROO API — SvelteKit + Cloudflare Pages adapter
 * GET  /api/health → env status
 * POST /api/analyze → audio/image → Gemini analysis
 */

function getKey(platform) { return platform?.env?.GEMINI_API_KEY || ''; }
function getModel(platform) { return platform?.env?.GEMINI_MODEL_NAME || 'gemini-2.0-flash'; }

export async function GET({ platform }) {
	const KEY = getKey(platform);
	return json({ status: 'ok', timestamp: new Date().toISOString(), config: { api_key_set: !!KEY, model: getModel(platform) } });
}

export async function POST({ request, platform }) {
	const KEY = getKey(platform);
	const MODEL = getModel(platform);
	if (!KEY) return json({ error: 'GEMINI_API_KEY not set in Cloudflare Pages env vars.' }, 500);

	try {
		const form = await request.formData();
		const parts = [];
		let ha = false, hi = false;

		const a = form.get('audio');
		if (a?.size > 0) {
			const m = a.type || 'audio/wav';
			if (!/wav|mpeg|mp3|flac|ogg|aac|m4a/i.test(m)) return json({ error: `Unsupported: ${m}. Use WAV or MP3.` }, 400);
			parts.push({ inlineData: { mimeType: m, data: toB64(await a.arrayBuffer()) } }); ha = true;
		}
		const img = form.get('image');
		if (img?.size > 0) {
			parts.push({ inlineData: { mimeType: 'image/jpeg', data: toB64(await img.arrayBuffer()) } }); hi = true;
		}
		if (!parts.length) return json({ error: 'No input provided.' }, 400);

		const mode = ha && hi ? 'both' : ha ? 'audio' : 'image';
		parts.push({ text: prompt(mode) });

		const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`, {
			method: 'POST', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.1, maxOutputTokens: 400 } })
		});
		if (!res.ok) { const e = await res.text(); return json({ error: `Gemini ${res.status}: ${e.slice(0,200)}`, model: MODEL }, 502); }

		const d = await res.json();
		const raw = (d?.candidates?.[0]?.content?.parts?.[0]?.text || '').replace(/```(?:json)?\s*/gi,'').replace(/\s*```/gi,'').trim();
		let out;
		try { out = JSON.parse(raw); } catch { out = def(); }
		out._meta = { mode, model: MODEL, timestamp: new Date().toISOString() };
		return json(out);
	} catch (e) {
		return json({ error: e.message || 'Internal error' }, 500);
	}
}

function def() { return { category:'UNKNOWN',confidence:0,severity:'LOW',reasoning:'Parse error.',parent_action:'Try again.',response_sound:'whitenoise',pre_cry:false,pre_cry_message:null }; }

function toB64(buf) { const b = new Uint8Array(buf), c = []; for (let i=0;i<b.length;i+=4096)c.push(String.fromCharCode(...b.slice(i,i+4096))); return btoa(c.join('')); }

function json(data,s=200) { return new Response(JSON.stringify(data),{status:s,headers:{'Content-Type':'application/json'}}); }

function prompt(mode) { return `You are ROO, the world's best baby cry analyst.
${mode==='both'?'CROSS-REFERENCE audio AND image for highest accuracy.':'Input: '+mode+' only.'}

CRY PATTERNS:
HUNGER: rhythmic "neh", builds slow, 400-600Hz, stops/resumes → feed
PAIN: sudden sharp pierce, 600-800Hz, breath pauses, urgent → soothe
TIRED: whiny nasal, irregular fade, 300-450Hz, droopy → sleep
DISCOMFORT: sustained medium, 400-500Hz, grunting → adjust
BURPING: short bursts, dropping pitch, strain sounds → burp

VISUAL CUES (if image):
Hunger: rooting reflex, hands-to-mouth, lip smack
Pain: scrunched face, shut eyes, red, arched body
Tired: droopy lids, glassy eyes, limp, yawn
Discomfort: arched back, legs up, grimace

Think step by step. Output ONLY JSON:
{"category":"HUNGER","confidence":87,"severity":"MEDIUM","reasoning":"...","parent_action":"Feed baby now.","response_sound":"heartbeat","pre_cry":false,"pre_cry_message":null}
severity: LOW|MEDIUM|HIGH|CRITICAL  sound: heartbeat|whitenoise|lullaby|shush`; }
