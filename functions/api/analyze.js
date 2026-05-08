/**
 * ROO API — Cloudflare Pages Function
 * Receives audio/image via multipart POST, analyzes via Gemini API.
 * Deployed automatically when functions/ directory is present in Pages project.
 */

const SYSTEM_INSTRUCTION = `You are ROO, the world's most advanced baby cry expert.
Analyze the provided audio/image with deep precision.

ACOUSTIC SIGNATURES:

HUNGER ("neh" pattern):
- Gradual soft onset, builds over time
- Rhythmic 0.5-1s intervals with brief pauses
- Pitch: 400-600 Hz, regular, medium intensity
- Stops briefly then resumes

PAIN (alarm cry):
- SUDDEN maximum intensity
- Very high pitch 600-800 Hz, piercing
- Long cry → breath-hold pause → repeat
- Urgent, no rhythm

TIRED (whiny complaint):
- Low-medium intensity, whiny nasal quality
- Fades at end, irregular rhythm
- Pitch 300-450 Hz, moaning quality

DISCOMFORT (fussy middle):
- Medium sustained intensity, continuous
- Pitch 400-500 Hz, mixed grunting
- No clear peaks or pauses

BURPING (strained effort):
- Short 2-3 second bursts with grunting
- Variable pitch that drops mid-cry

VISUAL SIGNALS (if image present):
- HUNGER: rooting reflex, hands toward mouth
- PAIN: scrunched face, tightly shut eyes, red/flushed
- TIRED: droopy eyelids, glassy eyes, limp posture
- DISCOMFORT: arched back, pulling legs, grimacing
- PRE-CRY: any of above without full crying yet

Think step by step then respond ONLY in JSON:
{
  "category": "HUNGER",
  "confidence": 89,
  "severity": "MEDIUM",
  "reasoning": "Rhythmic pattern with gradual buildup",
  "parent_action": "Feed baby now. Try breastfeeding or bottle.",
  "response_sound": "heartbeat",
  "pre_cry": false,
  "pre_cry_message": null
}

severity: LOW | MEDIUM | HIGH | CRITICAL
response_sound: heartbeat | whitenoise | lullaby | shush`;

const SUPPORTED_AUDIO = [
	'audio/wav', 'audio/x-wav', 'audio/wave',
	'audio/mpeg', 'audio/mp3',
	'audio/flac', 'audio/x-flac',
	'audio/ogg', 'audio/aac', 'audio/x-m4a'
];

function isSupported(type) {
	return SUPPORTED_AUDIO.some(t => type?.includes(t));
}

function toBase64(buf) {
	const bytes = new Uint8Array(buf);
	const chunks = [];
	for (let i = 0; i < bytes.length; i += 4096) {
		chunks.push(String.fromCharCode(...bytes.slice(i, i + 4096)));
	}
	return btoa(chunks.join(''));
}

function cleanJSON(text) {
	return text
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/\s*```\s*$/i, '')
		.trim();
}

/** @param {Request} req */
export async function onRequestPost(context) {
	const { request, env } = context;
	const API_KEY = env.GEMINI_API_KEY;
	// gemini-2.0-flash supports audio+image (gemma-4-26b-a4b-it is image-only on API)
	const MODEL = env.GEMINI_MODEL_NAME || 'gemini-2.0-flash';

	if (!API_KEY) {
		return json({ error: 'GEMINI_API_KEY not set in Cloudflare Pages environment variables.' }, 500);
	}

	try {
		const form = await request.formData();
		const parts = [];

		// Audio
		const audioFile = form.get('audio');
		if (audioFile && audioFile.size > 0) {
			const mime = audioFile.type || 'audio/wav';
			if (!isSupported(mime)) {
				return json({ error: `Unsupported audio format: ${mime}. Use WAV, MP3, FLAC, or OGG.` }, 400);
			}
			const buf = await audioFile.arrayBuffer();
			parts.push({ inlineData: { mimeType: mime, data: toBase64(buf) } });
		}

		// Image
		const imageFile = form.get('image');
		if (imageFile && imageFile.size > 0) {
			const buf = await imageFile.arrayBuffer();
			parts.push({ inlineData: { mimeType: 'image/jpeg', data: toBase64(buf) } });
		}

		if (parts.length === 0) {
			return json({ error: 'No audio or image provided.' }, 400);
		}

		// Add system instruction + prompt
		const mode = (audioFile && audioFile.size > 0) && (imageFile && imageFile.size > 0) ? 'both'
			: (audioFile && audioFile.size > 0) ? 'audio' : 'image';

		const promptText = mode === 'both'
			? `${SYSTEM_INSTRUCTION}\n\nYou have BOTH audio and image. Cross-reference them for highest accuracy.`
			: `${SYSTEM_INSTRUCTION}\n\nYou have ${mode} input only. Analyze based on available data.`;

		// Call Gemini API
		const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

		const apiRes = await fetch(apiUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [{ parts: [...parts, { text: promptText }] }],
				generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
				systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] }
			})
		});

		if (!apiRes.ok) {
			const errText = await apiRes.text();
			return json({
				error: `Gemini API ${apiRes.status}: ${errText.slice(0, 300)}`,
				model: MODEL
			}, 502);
		}

		const data = await apiRes.json();
		const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

		let result;
		try {
			result = JSON.parse(cleanJSON(raw));
		} catch {
			result = {
				category: 'UNKNOWN',
				confidence: 0,
				severity: 'LOW',
				reasoning: 'AI response could not be parsed.',
				parent_action: 'Please try again in a quieter setting.',
				response_sound: 'whitenoise',
				pre_cry: false,
				pre_cry_message: null
			};
		}

		result._meta = { mode, model: MODEL, timestamp: new Date().toISOString() };
		return json(result);

	} catch (err) {
		return json({ error: err.message }, 500);
	}
}

function json(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		}
	});
}
