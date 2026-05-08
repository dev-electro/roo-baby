// Cloudflare Pages Function — proxies to OpenRouter API
// Sends spectrogram images + face photos + reference atlas to Gemma 4 models
// Uses 26B A4B for single-modality, 31B for cross-modal (both) mode
// All model IDs configurable via env vars

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

const PROMPTS = {
	audio: `You are ROO, the world's best baby cry analyst. Analyze this spectrogram of a baby's cry.

AUDIO MEASUREMENTS (from signal processing):
{{AUDIO_FEATURES}}

SPECTROGRAM READING GUIDE:
- X-axis: time (seconds, labeled), Y-axis: frequency (Hz, labeled on left)
- Color brightness = intensity (dark=silent, bright=loud)
- HUNGER: rhythmic vertical bands at 400-600Hz, gradual intensity buildup
- PAIN: sudden bright spikes at 600-800Hz with dark silence gaps between cries
- TIRED: dim low-frequency smears at 300-450Hz, fading in and out
- DISCOMFORT: steady mid-frequency glow at 400-500Hz, sustained
- BURPING: short isolated bursts, pitch descending with each burst

The first image is a REFERENCE ATLAS showing labeled example spectrograms for each cry category. The second image is the USER'S spectrogram to analyze.

STEP 1: Read the audio measurements above. Note the dominant frequency, peak frequencies, and rhythm pattern.
STEP 2: Compare the user's spectrogram pattern against the reference atlas.
STEP 3: Match the dominant frequency and rhythm to the most likely category.

Respond with ONLY valid JSON:
{"category":"HUNGER","confidence":85,"severity":"MEDIUM","reasoning":"Dominant frequency 450Hz with rhythmic onset pattern (75% in first half), consistent with hunger","parent_action":"Feed the baby now","response_sound":"heartbeat","pre_cry":false,"pre_cry_message":null}
severity: LOW|MEDIUM|HIGH|CRITICAL  sound: heartbeat|whitenoise|lullaby|shush`,

	image: `You are ROO, the world's best baby cry analyst. Analyze this baby's face and body language.

VISUAL CUES:
- HUNGER: rooting reflex, hands moving to mouth, lip smacking → feed
- PAIN: scrunched face, eyes shut tight, redness → soothe immediately
- TIRED: droopy eyes, glassy stare, eye rubbing → help sleep
- DISCOMFORT: arched back, legs drawn up, fidgeting → adjust position
- BURPING: squirming, brief back arching → burp

Respond with ONLY valid JSON:
{"category":"HUNGER","confidence":78,"severity":"MEDIUM","reasoning":"Rooting reflex visible with hands moving toward mouth area","parent_action":"Feed soon","response_sound":"heartbeat","pre_cry":true,"pre_cry_message":"Baby may be getting hungry soon"}
severity: LOW|MEDIUM|HIGH|CRITICAL  sound: heartbeat|whitenoise|lullaby|shush`,

	both: `You are ROO, the world's best baby cry analyst. CROSS-REFERENCE both the spectrogram AND the baby's face for the highest accuracy diagnosis.

AUDIO MEASUREMENTS (from signal processing):
{{AUDIO_FEATURES}}

The first image is a REFERENCE ATLAS showing labeled example spectrograms for each cry category. The second image is the USER'S spectrogram. The third image is the baby's face.

SPECTROGRAM READING GUIDE:
- X-axis: time (labeled), Y-axis: frequency in Hz (labeled)
- Color brightness = intensity
- HUNGER: rhythmic bands 400-600Hz, gradual buildup
- PAIN: bright spikes 600-800Hz, silence gaps
- TIRED: dim smears 300-450Hz, fading
- DISCOMFORT: steady glow 400-500Hz, sustained
- BURPING: short bursts, descending pitch

FACIAL CUES:
- HUNGER: rooting, hands to mouth, lip smacking
- PAIN: scrunched face, shut eyes, redness
- TIRED: droopy eyes, glassy stare, rubbing
- DISCOMFORT: arched back, legs up, fidgeting
- BURPING: squirming, brief arching

STEP 1: Read the audio measurements — note dominant frequency, peak frequencies, rhythm.
STEP 2: Compare spectrogram against reference atlas patterns.
STEP 3: Analyze facial expression and body language.
STEP 4: Do audio measurements + spectrogram + face ALL AGREE? Higher confidence when all signals converge.

Respond with ONLY valid JSON:
{"category":"HUNGER","confidence":91,"severity":"HIGH","reasoning":"Dominant 450Hz + rhythmic onset 75% + rooting reflex — all three signals converge on hunger","parent_action":"Feed immediately","response_sound":"heartbeat","pre_cry":false,"pre_cry_message":null}
severity: LOW|MEDIUM|HIGH|CRITICAL  sound: heartbeat|whitenoise|lullaby|shush`
};

function jsonRes(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
	});
}

export async function onRequestOptions() {
	return new Response(null, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Access-Control-Max-Age': '86400'
		}
	});
}

async function blobToBase64(blob) {
	const buf = new Uint8Array(await blob.arrayBuffer());
	let binary = '';
	for (let i = 0; i < buf.length; i += 4096) {
		binary += String.fromCharCode(...buf.slice(i, i + 4096));
	}
	return btoa(binary);
}

let atlasBase64Cache = null;

async function getAtlasBase64(env) {
	if (atlasBase64Cache) return atlasBase64Cache;
	const siteUrl = env.SITE_URL || 'https://roo-baby.pages.dev';
	try {
		const res = await fetch(`${siteUrl}/atlas/atlas_master.webp`, { signal: AbortSignal.timeout(5000) });
		if (res.ok) {
			const buf = await res.arrayBuffer();
			const bytes = new Uint8Array(buf);
			let binary = '';
			for (let i = 0; i < bytes.length; i += 4096) {
				binary += String.fromCharCode(...bytes.slice(i, i + 4096));
			}
			atlasBase64Cache = btoa(binary);
			return atlasBase64Cache;
		}
	} catch {}
	return null;
}

async function callOpenRouter(apiKey, model, messages, retries = 1) {
	for (let attempt = 0; attempt <= retries; attempt++) {
		const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
				'HTTP-Referer': env.SITE_URL || 'https://roo-baby.pages.dev',
				'X-Title': 'ROO Baby Cry Analyzer'
			},
			body: JSON.stringify({
				model,
				messages,
				max_tokens: 400,
				temperature: 0.1,
				response_format: { type: 'json_object' }
			})
		});

		if (res.status === 429 && attempt < retries) {
			await new Promise(r => setTimeout(r, 2000));
			continue;
		}

		if (!res.ok) {
			const err = await res.text();
			throw new Error(`OpenRouter ${res.status}: ${err.slice(0, 300)}`);
		}

		return res.json();
	}
}

function parseJSON(text) {
	if (!text) return null;
	const raw = text.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/gi, '').trim();
	try { return JSON.parse(raw); } catch {}
	const s = raw.indexOf('{');
	const e = raw.lastIndexOf('}');
	if (s >= 0 && e > s) {
		try { return JSON.parse(raw.slice(s, e + 1)); } catch {}
	}
	return null;
}

export async function onRequest(context) {
	const { request, env } = context;
	const apiKey = env.OPENROUTER_API_KEY;
	const modelSingle = env.MODEL_SINGLE || 'google/gemma-4-26b-a4b-it:free';
	const modelBoth = env.MODEL_BOTH || 'google/gemma-4-31b-it:free';
	const modelFallback = env.MODEL_FALLBACK || 'google/gemma-4-31b-it:free';

	if (!apiKey) return jsonRes({ error: 'OPENROUTER_API_KEY not set in Cloudflare Pages env vars.' }, 500);
	if (request.method !== 'POST') return jsonRes({ error: 'Use POST.' }, 405);

	try {
		const form = await request.formData();
		const mode = form.get('mode') || 'audio';
		const spectrogramBlob = form.get('spectrogram');
		const imageBlob = form.get('image');
		const audioFeaturesStr = form.get('audio_features');

		let audioFeatures = null;
		if (audioFeaturesStr) {
			try { audioFeatures = JSON.parse(audioFeaturesStr); } catch {}
		}

		if (!spectrogramBlob?.size && !imageBlob?.size) {
			return jsonRes({ error: 'No spectrogram or image provided. Please record audio first.' }, 400);
		}

		// Build prompt text with audio features injected
		let promptText = PROMPTS[mode];
		if (audioFeatures) {
			const featureStr = `- Duration: ${audioFeatures.duration ?? '?'}s
- Dominant frequency: ${audioFeatures.dominantFreqHz ?? '?'} Hz
- Peak frequencies: ${(audioFeatures.peakFreqHz ?? []).join(', ')} Hz
- Energy (RMS): ${audioFeatures.rmsEnergy ?? '?'}
- Zero-crossing rate: ${audioFeatures.zeroCrossRate ?? '?'}/s
- Silence ratio: ${(audioFeatures.silenceRatio ?? 0) * 100}%
- Onset ratio: ${(audioFeatures.onsetRatio ?? 0) * 100}% energy in first half`;
			promptText = promptText.replace('{{AUDIO_FEATURES}}', featureStr);
		} else {
			promptText = promptText.replace('{{AUDIO_FEATURES}}', '(Audio measurements unavailable — rely on visual spectrogram analysis)');
		}

		const contentParts = [];

		// Prepend atlas reference image for audio/both modes
		if ((mode === 'audio' || mode === 'both') && spectrogramBlob?.size) {
			const atlasB64 = await getAtlasBase64(env);
			if (atlasB64) {
				contentParts.push({
					type: 'image_url',
					image_url: { url: `data:image/webp;base64,${atlasB64}` }
				});
			}
		}

		if (spectrogramBlob?.size > 0) {
			const specB64 = await blobToBase64(spectrogramBlob);
			contentParts.push({
				type: 'image_url',
				image_url: { url: `data:image/png;base64,${specB64}` }
			});
		}

		if (imageBlob?.size > 0) {
			const imgB64 = await blobToBase64(imageBlob);
			const mimeType = imageBlob.type || 'image/jpeg';
			contentParts.push({
				type: 'image_url',
				image_url: { url: `data:${mimeType};base64,${imgB64}` }
			});
		}

		contentParts.push({ type: 'text', text: PROMPTS[mode] });

		const model = mode === 'both' ? modelBoth : modelSingle;
		const messages = [{ role: 'user', content: contentParts }];

		let data;
		try {
			data = await callOpenRouter(apiKey, model, messages);
		} catch (err) {
			if (modelFallback && model !== modelFallback) {
				data = await callOpenRouter(apiKey, modelFallback, messages);
			} else {
				throw err;
			}
		}

		const rawText = data?.choices?.[0]?.message?.content || '';
		const result = parseJSON(rawText);

		if (!result || !result.category) {
			return jsonRes({
				error: 'Model did not return valid JSON',
				raw: rawText.slice(0, 500),
				model: data?.model || model
			}, 502);
		}

		result._meta = {
			model: data?.model || model,
			model_requested: model,
			timestamp: new Date().toISOString(),
			mode,
			atlas_used: !!atlasBase64Cache
		};
		return jsonRes(result);
	} catch (e) {
		return jsonRes({ error: e.message || 'Internal error' }, 500);
	}
}