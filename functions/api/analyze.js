// Cloudflare Pages Function — dual-provider proxy
// Primary: Google Gemini API (direct, higher rate limits)
// Fallback: OpenRouter API (free endpoints)
// Sends spectrogram images + face photos + reference atlas to Gemma 4 models

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

const PROMPTS = {
	audio: `You are ROO, the world's best baby cry analyst. Analyze this spectrogram of a baby's cry.

AUDIO MEASUREMENTS (from signal processing):
{{AUDIO_FEATURES}}

⚠️ CRITICAL EDGE-CASE CHECKS — do these FIRST:

1. SILENCE: If silence ratio > 80% AND RMS < 0.002 AND autocorrelation < 0.2 → NO cry. Return UNKNOWN/0%.
2. NOISE (static/fan/hum): If autocorrelation < 0.2 AND spectral spread > 800Hz AND peaks are scattered outside 200-1000Hz → ambient noise, NOT a cry. Return UNKNOWN.
3. CLIPPING: If clipping ratio > 5% → audio is distorted, analysis unreliable. Note this and lower confidence.
4. MUSIC/TV: If harmonic ratio > 0.6 AND multiple harmonic peaks → NOT a baby cry. Return UNKNOWN.
5. MULTIPLE SOURCES: If cry-range peak ratio < 50% AND many spectral peaks → overlapping sounds. Lower confidence significantly.
6. OUTSIDE CRY RANGE: If dominant frequency < 200Hz or > 1000Hz → likely not a baby cry. Return UNKNOWN or low confidence.
7. LOW QUALITY: If autocorrelation < 0.2 → pitch is unreliable. Lower confidence by 30%+.

ONLY if the WARNINGS say "No edge case detected — likely a real baby cry" should you analyze with normal confidence.

SPECTROGRAM READING GUIDE:
- X-axis: time (seconds), Y-axis: frequency (Hz)
- Color: bright = loud, dark = silent
- A real baby cry shows: visible bright bands in 200-1000Hz, rhythmic gaps, clear onset/offset patterns
- A dark/empty spectrogram = silence or near-silence → return UNKNOWN

BABY CRY CATEGORIES:
- HUNGER: rhythmic vertical bands 400-600Hz, gradual buildup, 0.5-1s intervals
- PAIN: sudden bright spikes 600-800Hz with dark gaps, urgent pattern
- TIRED: dim smears 300-450Hz, fading in/out, whiny quality
- DISCOMFORT: steady glow 400-500Hz, sustained, grunting
- BURPING: short isolated bursts, pitch descending each burst

The first image is a REFERENCE ATLAS. The second is the USER'S spectrogram.
{{USER_NOTES}}
STEP 1: Check WARNINGS first — if any edge case is flagged, respond accordingly (UNKNOWN or low confidence).
STEP 2: Only if the signal looks like a real cry, compare against reference atlas.
STEP 3: Match dominant frequency and rhythm pattern to the most likely category.

Respond with ONLY valid JSON:
{"category":"HUNGER","confidence":85,"severity":"MEDIUM","reasoning":"Dominant 450Hz with rhythmic onset, no edge cases detected","parent_action":"Feed the baby now","response_sound":"heartbeat","pre_cry":false,"pre_cry_message":null}
severity: LOW|MEDIUM|HIGH|CRITICAL  sound: heartbeat|whitenoise|lullaby|shush`,

	image: `You are ROO, the world's best baby cry analyst. Analyze this photo.

FIRST: Is the person in this photo a BABY (age 0-3 years)?
BABY features: round face, chubby cheeks, small/flat nose, fine/sparse hair, smooth skin, large head-to-body ratio, short neck.
ADULT/OLDER CHILD features: facial hair, defined jawline, wrinkles, makeup, mature bone structure, longer face.

If this IS a baby/infant/toddler (0-3 years) → Set is_adult to false. Analyze the baby's expression seriously:

VISUAL CUES:
- HUNGER: rooting reflex, hands moving to mouth, lip smacking → feed
- PAIN: scrunched face, eyes shut tight, redness → soothe immediately
- TIRED: droopy eyes, glassy stare, eye rubbing → help sleep
- DISCOMFORT: arched back, legs drawn up, fidgeting → adjust position
- BURPING: squirming, brief back arching → burp

If this is an ADULT or OLDER CHILD (4+ years) → Set is_adult to true. Still analyze the face EXACTLY as above (we want to show the funny result!), but make the reasoning playful — imagine if this adult were a giant baby. Keep the category, confidence, severity, and parent_action as you would for a baby (it's part of the joke!).
{{USER_NOTES}}
Respond with ONLY valid JSON (include is_adult AND adult_message if adult):
{"category":"HUNGER","confidence":78,"severity":"MEDIUM","reasoning":"Rooting reflex visible with hands moving toward mouth area","parent_action":"Feed soon","response_sound":"heartbeat","pre_cry":true,"pre_cry_message":"Baby may be getting hungry soon","is_adult":false,"adult_message":null}
For adults: {"category":"TIRED","confidence":65,"severity":"MEDIUM","reasoning":"Droopy adult eyes detected — clearly hasn't slept in days. Classic parent exhaustion pattern.","parent_action":"Hand the baby to your partner and take a nap","response_sound":"lullaby","pre_cry":false,"pre_cry_message":null,"is_adult":true,"adult_message":"We see you're testing ROO on yourself! The results are totally wrong — ROO is designed for babies 0-3 years only. Try it on your little one for real insights! 🍼"}
severity: LOW|MEDIUM|HIGH|CRITICAL  sound: heartbeat|whitenoise|lullaby|shush`,

	both: `You are ROO, the world's best baby cry analyst. CROSS-REFERENCE both the spectrogram AND the face photo for the highest accuracy diagnosis.

FIRST: Is the face photo a BABY (age 0-3 years)?
BABY: round face, chubby cheeks, small nose, fine hair, large head-to-body ratio.
ADULT/OLDER CHILD: facial hair, defined jawline, wrinkles, makeup, mature bone structure.

If the face IS a baby (0-3 years) → Set is_adult to false. Proceed with serious cross-reference analysis.
If the face is an ADULT or OLDER CHILD (4+ years) → Set is_adult to true. Still do the FULL cross-reference analysis for fun (spectrogram + face), but make the reasoning playful — imagine this adult as a giant baby. Keep real category/confidence/severity based on what you see.

AUDIO MEASUREMENTS (from signal processing):
{{AUDIO_FEATURES}}

⚠️ AUDIO EDGE-CASE CHECKS (check these next):
- If WARNINGS include SILENCE/NOISE/DISTORTION/MUSIC → the audio is unreliable. Still cross-reference with the face, but note audio issues and reduce confidence by 40-60%.
- If the spectrogram is dark/empty AND WARNINGS confirm silence → the audio adds nothing. Rely on face analysis only, set confidence lower.
- If autocorrelation < 0.2 → pitch data is unreliable. Don't trust dominant frequency.
- If multiple sources detected → a mixed signal. Lower confidence significantly.
- Only if WARNINGS say "No edge case detected" → audio data is reliable for cross-reference.

The first image is a REFERENCE ATLAS. The second image is the USER'S spectrogram. The third image is the face.

SPECTROGRAM READING: X=time, Y=freq (Hz), brightness=intensity (dark=silent, bright=loud)
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

STEP 1: Check WARNINGS for audio quality issues.
STEP 2: Read audio measurements — dominant freq, peak freqs, rhythm.
STEP 3: Compare spectrogram against reference atlas.
STEP 4: Analyze facial expression and body language.
STEP 5: Cross-reference all signals. Higher confidence when they converge AND no edge cases.
{{USER_NOTES}}
Respond with ONLY valid JSON:
{"category":"HUNGER","confidence":91,"severity":"HIGH","reasoning":"Dominant 450Hz + rhythmic onset 75% + rooting reflex — all three signals converge on hunger","parent_action":"Feed immediately","response_sound":"heartbeat","pre_cry":false,"pre_cry_message":null,"is_adult":false,"adult_message":null}
For adults: include is_adult:true and a funny adult_message like "We see you're testing ROO on yourself! These results are nonsense — ROO is for babies. Try it on your little one!"
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

async function blobToBase64Raw(blob) {
	const buf = await blob.arrayBuffer();
	return new Uint8Array(buf);
}

let atlasBase64Cache = null;
let atlasMimeCache = null;

async function getAtlasBase64(siteUrl) {
	if (atlasBase64Cache) return { b64: atlasBase64Cache, mime: atlasMimeCache };
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
			atlasMimeCache = 'image/webp';
			return { b64: atlasBase64Cache, mime: atlasMimeCache };
		}
	} catch {}
	return null;
}

// ── Google Gemini API ──
async function callGemini(apiKey, model, contents, retries = 2) {
	for (let attempt = 0; attempt <= retries; attempt++) {
		const res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [{ role: 'user', parts: contents }],
				generationConfig: {
					maxOutputTokens: 400,
					temperature: 0.1,
					responseMimeType: 'application/json'
				}
			})
		});

		if (res.status === 429 && attempt < retries) {
			const delay = 2000 * Math.pow(2, attempt);
			await new Promise(r => setTimeout(r, delay));
			continue;
		}

		if (!res.ok) {
			const err = await res.text();
			throw new Error(`Gemini ${res.status}: ${err.slice(0, 300)}`);
		}

		return res.json();
	}
}

// ── OpenRouter API ──
async function callOpenRouter(apiKey, model, messages, retries = 2, siteUrl = 'https://roo-baby.pages.dev') {
	for (let attempt = 0; attempt <= retries; attempt++) {
		const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
				'HTTP-Referer': siteUrl,
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
			const delay = 2000 * Math.pow(2, attempt);
			await new Promise(r => setTimeout(r, delay));
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

function extractGeminiText(data) {
	const parts = data?.candidates?.[0]?.content?.parts;
	if (!parts) return '';
	return parts.map(p => p.text || '').join('');
}

export async function onRequest(context) {
	const { request, env } = context;
	const geminiKey = env.GEMINI_API_KEY;
	const openrouterKey = env.OPENROUTER_API_KEY;
	const geminiSingle = env.GEMINI_MODEL_SINGLE || 'gemma-4-26b-a4b-it';
	const geminiBoth = env.GEMINI_MODEL_BOTH || 'gemma-4-31b-it';
	const modelSingle = env.MODEL_SINGLE || 'google/gemma-4-26b-a4b-it:free';
	const modelBoth = env.MODEL_BOTH || 'google/gemma-4-31b-it:free';
	const modelFallback = env.MODEL_FALLBACK || 'google/gemma-4-31b-it:free';
	const siteUrl = env.SITE_URL || 'https://roo-baby.pages.dev';

	if (!geminiKey && !openrouterKey) {
		return jsonRes({ error: 'Either GEMINI_API_KEY or OPENROUTER_API_KEY must be set.' }, 500);
	}
	if (request.method !== 'POST') return jsonRes({ error: 'Use POST.' }, 405);

	try {
		const form = await request.formData();
		const mode = form.get('mode') || 'audio';
		const spectrogramBlob = form.get('spectrogram');
		const imageBlob = form.get('image');
		const audioFeaturesStr = form.get('audio_features');
		const userNotes = form.get('user_notes') || '';

		let audioFeatures = null;
		if (audioFeaturesStr) {
			try { audioFeatures = JSON.parse(audioFeaturesStr); } catch {}
		}

		if (!spectrogramBlob?.size && !imageBlob?.size) {
			return jsonRes({ error: 'No spectrogram or image provided. Please record audio first.' }, 400);
		}

		let promptText = PROMPTS[mode];
		if (audioFeatures) {
			const edgeFlags = [];
			if (audioFeatures.isSilent) edgeFlags.push('⚠️ SILENCE DETECTED');
			if (audioFeatures.isClipping) edgeFlags.push('⚠️ CLIPPING/DISTORTION');
			if (audioFeatures.isNoise) edgeFlags.push('⚠️ LIKELY AMBIENT NOISE (not a cry)');
			if (audioFeatures.isOutsideCryRange) edgeFlags.push('⚠️ FREQ OUTSIDE CRY RANGE');
			if (audioFeatures.hasMultipleSources) edgeFlags.push('⚠️ MULTIPLE SOUND SOURCES');
			if (audioFeatures.isMusicLike) edgeFlags.push('⚠️ MUSIC/TV-LIKE AUDIO');
			if (audioFeatures.isLowQualitySignal) edgeFlags.push('⚠️ LOW QUALITY SIGNAL');

			const featureStr = `- Duration: ${audioFeatures.duration ?? '?'}s
- Dominant frequency: ${audioFeatures.dominantFreqHz ?? '?'} Hz
- Peak frequencies: ${(audioFeatures.peakFreqHz ?? []).join(', ')} Hz
- Energy (RMS): ${audioFeatures.rmsEnergy ?? '?'}
- Zero-crossing rate: ${audioFeatures.zeroCrossRate ?? '?'}/s
- Silence ratio: ${(audioFeatures.silenceRatio ?? 0) * 100}%
- Onset ratio: ${(audioFeatures.onsetRatio ?? 0) * 100}% energy in first half
- Autocorrelation strength: ${audioFeatures.autoCorrStrength ?? '?'} (how "pitched" the sound is)
- Clipping ratio: ${(audioFeatures.clippingRatio ?? 0) * 100}%
- Spectral centroid: ${audioFeatures.spectralCentroid ?? '?'} Hz (sound brightness)
- Cry-range peak ratio: ${(audioFeatures.cryPeakRatio ?? 0) * 100}% peaks in 200-1000Hz
- WARNINGS: ${edgeFlags.length > 0 ? edgeFlags.join('; ') : 'No edge case detected — likely a real baby cry'}`;
			promptText = promptText.replace('{{AUDIO_FEATURES}}', featureStr);
		} else {
			promptText = promptText.replace('{{AUDIO_FEATURES}}', '(Audio measurements unavailable — rely on visual spectrogram analysis)');
		}

		if (userNotes) {
			promptText = promptText.replace('{{USER_NOTES}}', `\nPARENT'S OBSERVATIONS (provided by the user — incorporate this context):\n"${userNotes}"\n`);
		} else {
			promptText = promptText.replace('{{USER_NOTES}}', '');
		}

		// Build image payloads
		const images = [];
		if ((mode === 'audio' || mode === 'both') && spectrogramBlob?.size) {
			const atlas = await getAtlasBase64(siteUrl);
			if (atlas) {
				images.push({ b64: atlas.b64, mime: atlas.mime });
			}
		}

		if (spectrogramBlob?.size > 0) {
			const specB64 = await blobToBase64(spectrogramBlob);
			images.push({ b64: specB64, mime: spectrogramBlob.type || 'image/png' });
		}

		if (imageBlob?.size > 0) {
			const imgB64 = await blobToBase64(imageBlob);
			images.push({ b64: imgB64, mime: imageBlob.type || 'image/jpeg' });
		}

		// ── Try Gemini first (if key available), then fall back to OpenRouter ──
		let lastError;
		let result = null;
		let usedProvider = null;
		let usedModel = null;

		// Provider 1: Google Gemini (direct API)
		if (geminiKey) {
			try {
				const geminiModel = mode === 'both' ? geminiBoth : geminiSingle;
				const parts = [];

				for (const img of images) {
					parts.push({ inlineData: { mimeType: img.mime, data: img.b64 } });
				}
				parts.push({ text: promptText });

				const data = await callGemini(geminiKey, geminiModel, parts);
				const rawText = extractGeminiText(data);
				const parsed = parseJSON(rawText);
				if (parsed && parsed.category) {
					result = parsed;
					usedProvider = 'gemini';
					usedModel = geminiModel;
				} else {
					throw new Error(`Gemini returned invalid JSON: ${(rawText || '').slice(0, 200)}`);
				}
			} catch (err) {
				lastError = err;
			}
		}

		// Provider 2: OpenRouter (if Gemini failed or no key)
		if (!result && openrouterKey) {
			const openrouterModels = [mode === 'both' ? modelBoth : modelSingle];
			if (modelFallback && modelFallback !== openrouterModels[0]) {
				openrouterModels.push(modelFallback);
			}

			for (const m of openrouterModels) {
				try {
					const msgContent = [];
					for (const img of images) {
						msgContent.push({
							type: 'image_url',
							image_url: { url: `data:${img.mime};base64,${img.b64}` }
						});
					}
					msgContent.push({ type: 'text', text: promptText });

					const messages = [{ role: 'user', content: msgContent }];
					const data = await callOpenRouter(openrouterKey, m, messages, 2, siteUrl);
					const rawText = data?.choices?.[0]?.message?.content || '';
					const parsed = parseJSON(rawText);
					if (parsed && parsed.category) {
						result = parsed;
						usedProvider = 'openrouter';
						usedModel = m;
						break;
					}
					throw new Error(`OpenRouter model ${m} returned invalid JSON`);
				} catch (err) {
					lastError = err;
				}
			}
		}

		if (!result) {
			throw lastError || new Error('No API keys configured');
		}

		result._meta = {
			provider: usedProvider,
			model: usedModel,
			timestamp: new Date().toISOString(),
			mode,
			atlas_used: !!atlasBase64Cache
		};
		return jsonRes(result);
	} catch (e) {
		return jsonRes({ error: e.message || 'Internal error' }, 500);
	}
}