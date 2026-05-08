// functions/api/analyze.js
// Cloudflare Pages Function — receives audio/image, calls Gemini API

const PROMPT = (mode) =>
`You are ROO, the world's best baby cry analyst. ${mode==='both'?'CROSS-REFERENCE audio AND image.':'Input: '+mode+' only.'}

CRY: HUNGER=rhythmic neh, builds slow, 400-600Hz → feed. PAIN=sudden sharp, 600-800Hz, pauses → soothe. TIRED=whiny nasal, irregular fade → sleep. DISCOMFORT=sustained medium, grunting → adjust. BURPING=short bursts, dropping pitch → burp.
VISUAL: Hunger=rooting+hands. Pain=scrunched+shut+red. Tired=droopy+glassy. Discomfort=arched+legs.

Think step by step. Output ONLY JSON:
{"category":"HUNGER","confidence":87,"severity":"MEDIUM","reasoning":"…","parent_action":"Feed baby now.","response_sound":"heartbeat","pre_cry":false,"pre_cry_message":null}
severity:LOW|MEDIUM|HIGH|CRITICAL  sound:heartbeat|whitenoise|lullaby|shush`;

export async function onRequest(context) {
	const { request, env } = context;
	const KEY = env.GEMINI_API_KEY;
	const MODEL = env.GEMINI_MODEL_NAME || 'gemini-2.0-flash';

	if (!KEY) return r({ error: 'GEMINI_API_KEY not set in Pages env vars.' }, 500);
	if (request.method !== 'POST') return r({ error: 'Use POST.' }, 405);

	try {
		const form = await request.formData();
		const parts = [];
		let ha = false, hi = false;

		const a = form.get('audio');
		if (a?.size > 0) {
			if (!/wav|mpeg|mp3|flac|ogg|aac|m4a/i.test(a.type || '')) return r({ error: 'Unsupported audio. Use WAV/MP3.' }, 400);
			parts.push({ inlineData: { mimeType: a.type || 'audio/wav', data: await b64(a) } });
			ha = true;
		}
		const img = form.get('image');
		if (img?.size > 0) {
			parts.push({ inlineData: { mimeType: 'image/jpeg', data: await b64(img) } });
			hi = true;
		}

		if (!parts.length) return r({ error: 'No audio or image.' }, 400);
		parts.push({ text: PROMPT(ha && hi ? 'both' : ha ? 'audio' : 'image') });

		const res = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
			{ method: 'POST', headers: { 'Content-Type': 'application/json' },
			  body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.1, maxOutputTokens: 400 } }) }
		);
		if (!res.ok) {
			const err = await res.text();
			return r({ error: `Gemini ${res.status}: ${err.slice(0,200)}`, model: MODEL }, 502);
		}

		const d = await res.json();
		const raw = (d?.candidates?.[0]?.content?.parts?.[0]?.text || '')
			.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/gi, '').trim();

		let out;
		try { out = JSON.parse(raw); } catch { out = { category:'UNKNOWN', confidence:0, severity:'LOW', reasoning:'Parse error.', parent_action:'Try again.', response_sound:'whitenoise', pre_cry:false, pre_cry_message:null }; }
		out._meta = { model: MODEL, timestamp: new Date().toISOString(), mode: ha && hi ? 'both' : ha ? 'audio' : 'image' };
		return r(out);
	} catch (e) {
		return r({ error: e.message || 'Internal error' }, 500);
	}
}

async function b64(file) {
	const b = new Uint8Array(await file.arrayBuffer()), c = [];
	for (let i = 0; i < b.length; i += 4096) c.push(String.fromCharCode(...b.slice(i, i + 4096)));
	return btoa(c.join(''));
}

function r(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
	});
}
