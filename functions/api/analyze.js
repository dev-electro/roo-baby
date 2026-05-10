// Cloudflare Pages Function — multi-provider proxy
// Provider priority: Google Gemini → OpenRouter → Cloudflare Workers AI
// All API keys and model names configured via environment variables.

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

// ─── PROMPTS ──────────────────────────────────────────────────────────

const PROMPT_DETECT = `Analyze this spectrogram from a baby recording.
Answer one question only: Is there a baby cry signal present?

A baby cry shows:
- Structured rhythmic patterns (ON-OFF-ON-OFF)
- Concentrated energy bands in 200-1000 Hz range
- Organized spectral structure

Noise shows:
- Random speckled texture everywhere
- Diffuse energy without structure
- No rhythm or clear onset/offset patterns

Noise is NORMAL and EXPECTED. Look past it for underlying structured signal.

Respond ONLY with valid JSON:
{"cry_present": true, "confidence": 85, "reasoning": "Brief what you see"}`;

const PROMPT_CLASSIFY_AUDIO = `You are ROO, a precise baby cry classification expert.
Your job is to identify the type of baby cry, even in noisy recordings.

CRITICAL RULE: NEVER return UNKNOWN due to noise.
Background noise is EXPECTED and NORMAL in real recordings.
If a baby cry is present, classify it — regardless of noise level.
Only return UNKNOWN if there is genuinely NO baby cry at all.

The first image is a REFERENCE ATLAS showing both CLEAN and NOISY baby cry spectrograms for each category.
The second image is the USER'S spectrogram — a real recording that may contain background noise.

AUDIO MEASUREMENTS:
{{AUDIO_FEATURES}}

ANALYSIS STEPS:

Step 1 — Confirm cry presence:
Is there a baby cry signal? Look for structured patterns, rhythmic elements, concentrated energy bands.
Noise is random and chaotic. A cry has STRUCTURE even when noisy.

Step 2 — Ignore the noise layer:
Noise appears as: uniform speckled texture, random bright dots, diffuse energy everywhere.
Baby cry appears as: concentrated bands, rhythmic structure, organized patterns.
Mentally remove the noise texture. Focus on the underlying structured signal.

Step 3 — Match the CRY PATTERN (Dunstan Baby Language & Acoustic Cues):

HUNGER pattern ("NEH"): Rhythmic onset, tongue pushed to roof of mouth.
  Phonetic: Starts with "N" sound.
  Spectrogram: Regular repeating bright bands with gaps (metronome ON-OFF).
  Frequency: Concentrated mid-range bands (400-600Hz).
  Even noisy hunger cries show this rhythmic structure.

PAIN/LOWER GAS pattern ("EAIR"): Urgent, intense, long-duration.
  Phonetic: Deep "Eairh" sound from lower abdomen.
  Spectrogram: Sudden high-energy explosion across WIDE frequency range.
  Onset: Immediate full brightness. High frequencies (600-800Hz+) strongly activated.

TIRED/SLEEPY pattern ("OWH"): Breathiness, yawning reflex.
  Phonetic: Oval mouth shape, "Owh" sound like a yawn.
  Spectrogram: Irregular, fading bands in LOWER frequencies (300-450Hz).
  Energy: Decreases toward end of each cry episode; whiny signature.

DISCOMFORT pattern ("HEH"): Response to skin sensitivity/physical sensation.
  Phonetic: Breathiness, starts with "H" sound.
  Spectrogram: Continuous medium-energy signal. No clear ON-OFF rhythm.
  Frequency: Steady mid-frequency activation (400-500Hz).

BURP/UPPER GAS pattern ("EH"): Short, sharp, repetitive bursts.
  Phonetic: "Eh-Eh-Eh" sound, trying to release air from chest.
  Spectrogram: Short sharp bursts with gaps. Irregular timing.
  Frequency: Multiple brief high-energy spikes (500-900Hz).

Step 4 — Compare to references:
Which reference in the atlas (look at both clean and noisy examples) most closely matches the STRUCTURAL PATTERN of the user's spectrogram?
Focus on rhythm and frequency distribution, not noise level.

Step 5 — Assign confidence:
90-100%: Pattern very clear despite noise
70-89%:  Pattern identifiable but partially obscured
50-69%:  Pattern suggested but noise is heavy
Below 50%: Return UNKNOWN — cry too obscured to classify reliably
{{USER_NOTES}}

Respond ONLY in this exact JSON format — no other text:
{"category":"HUNGER","confidence":78,"severity":"MEDIUM","noise_level":"HIGH","cry_detected":true,"pattern_matched":"rhythmic on-off bands in mid frequency range","reasoning":"Despite background noise, regular rhythmic structure at 400-600Hz visible, matching hunger reference pattern","parent_action":"Baby needs feeding. Try breastfeeding or bottle now.","response_sound":"heartbeat"}

severity: LOW | MEDIUM | HIGH | CRITICAL
noise_level: CLEAN | LOW | MODERATE | HIGH
response_sound: heartbeat | whitenoise | lullaby | shush`;

const PROMPT_IMAGE = `Analyze this photo of a person.

FIRST: Is this person a BABY (age 0-3 years)?
BABY features: round face, chubby cheeks, small/flat nose, fine/sparse hair, smooth skin, large head-to-body ratio, short neck.
ADULT/OLDER CHILD features: facial hair, defined jawline, wrinkles, makeup, mature bone structure.

If this IS a baby/infant/toddler (0-3 years) → Set is_adult to false. Analyze seriously:
- HUNGER: rooting reflex, hands moving to mouth, lip smacking → feed
- PAIN: scrunched face, eyes shut tight, redness → soothe
- TIRED: droopy eyes, glassy stare, eye rubbing → help sleep
- DISCOMFORT: arched back, legs drawn up, fidgeting → adjust position
- BURPING: squirming, brief back arching → burp
{{USER_NOTES}}

If this is an ADULT or OLDER CHILD (4+ years) → Set is_adult to true. Still analyze the face EXACTLY as above but make the reasoning playful — imagine this adult as a giant baby.
Respond ONLY with valid JSON:
{"category":"HUNGER","confidence":78,"severity":"MEDIUM","noise_level":"CLEAN","cry_detected":true,"pattern_matched":"facial cues: rooting/smacking","reasoning":"Rooting reflex visible with hands moving toward mouth","parent_action":"Feed soon","response_sound":"heartbeat","pre_cry":true,"pre_cry_message":"Baby may be getting hungry soon","is_adult":false,"adult_message":null}
For adults: include is_adult:true and adult_message like "We see you're testing ROO on yourself! The results are totally wrong — ROO is for babies 0-3 years only."`;

const PROMPT_BOTH = `You are ROO, a precise baby cry classification expert.
CROSS-REFERENCE both the spectrogram AND face photo for highest accuracy.

FIRST: Is the face photo a BABY (age 0-3 years)?
BABY: round face, chubby cheeks, small nose, fine hair, large head-to-body ratio.
ADULT/OLDER CHILD: facial hair, defined jawline, wrinkles, makeup, mature bone structure.

If BABY → Set is_adult to false. Proceed with serious cross-reference.
If ADULT/OLDER (4+) → Set is_adult to true. Still do FULL analysis for fun, but make reasoning playful.

The first image is a REFERENCE ATLAS showing both CLEAN and NOISY baby cry spectrograms.
The second image is the USER'S spectrogram.
The third image is the face photo.

AUDIO MEASUREMENTS:
{{AUDIO_FEATURES}}

CRITICAL RULE: NEVER return UNKNOWN due to noise. Noise is EXPECTED.

SPECTROGRAM PATTERNS:
- HUNGER: rhythmic bands 400-600Hz, metronome ON-OFF
- PAIN: sudden wide-frequency spikes, urgent onset
- TIRED: fading lower-frequency bands, whiny
- DISCOMFORT: steady mid-frequency, continuous
- BURPING: short sharp bursts, irregular

FACIAL CUES:
- HUNGER: rooting, hands to mouth, lip smacking
- PAIN: scrunched face, shut eyes, redness
- TIRED: droopy eyes, glassy stare, rubbing
- DISCOMFORT: arched back, legs up, fidgeting
- BURPING: squirming, brief arching
{{USER_NOTES}}

STEPS:
1. Read audio measurements
2. Compare spectrogram to reference atlas (ignore noise, match structure)
3. Analyze facial expression
4. Cross-reference all signals for final classification
5. Higher confidence when audio + visual signals converge

Respond ONLY in JSON:
{"category":"HUNGER","confidence":91,"severity":"HIGH","noise_level":"LOW","cry_detected":true,"pattern_matched":"rhythmic on-off bands in mid frequency + facial cues","reasoning":"Dominant 450Hz + rhythmic onset 75% + rooting reflex — all three signals converge on hunger","parent_action":"Feed immediately","response_sound":"heartbeat","pre_cry":false,"pre_cry_message":null,"is_adult":false,"adult_message":null}
For adults: include is_adult:true and adult_message.`;

// ─── HELPERS ──────────────────────────────────────────────────────────

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

// ─── ATLAS CACHE ──────────────────────────────────────────────────────

let atlasBase64Cache = null;
let atlasMimeCache = null;

async function getAtlasBase64(siteUrl) {
	if (atlasBase64Cache) return { b64: atlasBase64Cache, mime: atlasMimeCache };
	try {
		const res = await fetch(`${siteUrl}/atlas/atlas_master.png`, { signal: AbortSignal.timeout(5000) });
		if (res.ok) {
			const buf = await res.arrayBuffer();
			const bytes = new Uint8Array(buf);
			let binary = '';
			for (let i = 0; i < bytes.length; i += 4096) {
				binary += String.fromCharCode(...bytes.slice(i, i + 4096));
			}
			atlasBase64Cache = btoa(binary);
			atlasMimeCache = 'image/png';
			return { b64: atlasBase64Cache, mime: atlasMimeCache };
		}
	} catch {}
	return null;
}

// ─── PROVIDER 1: Google Gemini ───────────────────────────────────────

async function callGemini(apiKey, model, contents) {
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

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
	}

	const data = await res.json();
	const parts = data?.candidates?.[0]?.content?.parts;
	if (!parts) throw new Error('Gemini returned no content');
	return parts.map(p => p.text || '').join('');
}

// ─── PROVIDER 2: OpenRouter ──────────────────────────────────────────

async function callOpenRouter(apiKey, model, messages, siteUrl) {
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

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`OpenRouter ${res.status}: ${err.slice(0, 200)}`);
	}

	const data = await res.json();
	return data?.choices?.[0]?.message?.content || '';
}

// ─── UNIFIED PROVIDER DISPATCH ───────────────────────────────────────
// Provider model priority:
//   Gemini:      gemma-4-31b-it → gemma-4-26b-a4b-it
//   OpenRouter:  google/gemma-4-31b-it:free → google/gemma-4-26b-a4b-it:free

function buildChatMessages(images, promptText) {
	const content = [];
	for (const img of images) {
		content.push({
			type: 'image_url',
			image_url: { url: `data:${img.mime};base64,${img.b64}` }
		});
	}
	content.push({ type: 'text', text: promptText });
	return [{ role: 'user', content }];
}

async function callAI({ promptText, images, geminiKey, openrouterKey, siteUrl }, retries = 2) {
	let lastError;

	const delays = [1000, 2000, 4000];

	// ── Gemini (both models: 31b first, then 26b) ──
	if (geminiKey) {
		for (const model of ['gemma-4-31b-it', 'gemma-4-26b-a4b-it']) {
			for (let attempt = 0; attempt <= retries; attempt++) {
				try {
					const parts = [];
					for (const img of images) {
						parts.push({ inlineData: { mimeType: img.mime, data: img.b64 } });
					}
					parts.push({ text: promptText });
					const text = await callGemini(geminiKey, model, parts);
					const parsed = parseJSON(text);
					if (parsed && (parsed.category || parsed.cry_present !== undefined)) {
						return { result: parsed, provider: 'gemini', model, text };
					}
					throw new Error(`Gemini invalid JSON: ${(text || '').slice(0, 150)}`);
				} catch (err) {
					lastError = err;
					if (err.message.includes('429') && attempt < retries) {
						await new Promise(r => setTimeout(r, delays[attempt]));
						continue;
					}
					break;
				}
			}
		}
	}

	// ── OpenRouter (both free endpoints: 31b then 26b) ──
	if (openrouterKey) {
		for (const model of ['google/gemma-4-31b-it:free', 'google/gemma-4-26b-a4b-it:free']) {
			for (let attempt = 0; attempt <= retries; attempt++) {
				try {
					const messages = buildChatMessages(images, promptText);
					const text = await callOpenRouter(openrouterKey, model, messages, siteUrl);
					const parsed = parseJSON(text);
					if (parsed && (parsed.category || parsed.cry_present !== undefined)) {
						return { result: parsed, provider: 'openrouter', model, text };
					}
					throw new Error(`OpenRouter invalid JSON: ${(text || '').slice(0, 150)}`);
				} catch (err) {
					lastError = err;
					if (err.message.includes('429') && attempt < retries) {
						await new Promise(r => setTimeout(r, delays[attempt]));
						continue;
					}
					break;
				}
			}
		}
	}

	throw lastError || new Error('All providers exhausted — check API keys');
}

// ─── PROMPT BUILDER ──────────────────────────────────────────────────

function buildPromptText(basePrompt, audioFeatures, userNotes) {
	let text = basePrompt;

	if (audioFeatures) {
		const edgeFlags = [];
		if (audioFeatures.isSilent) edgeFlags.push('SILENCE DETECTED');
		if (audioFeatures.isClipping) edgeFlags.push('CLIPPING/DISTORTION');
		if (audioFeatures.isNoise) edgeFlags.push('LIKELY AMBIENT NOISE');
		if (audioFeatures.isOutsideCryRange) edgeFlags.push('FREQ OUTSIDE CRY RANGE');
		if (audioFeatures.hasMultipleSources) edgeFlags.push('MULTIPLE SOUND SOURCES');
		if (audioFeatures.isMusicLike) edgeFlags.push('MUSIC/TV-LIKE AUDIO');
		if (audioFeatures.isLowQualitySignal) edgeFlags.push('LOW QUALITY SIGNAL');

		const featureStr = `- Duration: ${audioFeatures.duration ?? '?'}s
- Dominant frequency: ${audioFeatures.dominantFreqHz ?? '?'} Hz
- Peak frequencies: ${(audioFeatures.peakFreqHz ?? []).join(', ')} Hz
- Energy (RMS): ${audioFeatures.rmsEnergy ?? '?'}
- Zero-crossing rate: ${audioFeatures.zeroCrossRate ?? '?'}/s
- Silence ratio: ${(audioFeatures.silenceRatio ?? 0) * 100}%
- Onset ratio: ${(audioFeatures.onsetRatio ?? 0) * 100}% energy in first half
- Autocorrelation strength: ${audioFeatures.autoCorrStrength ?? '?'} (how "pitched")
- Clipping ratio: ${(audioFeatures.clippingRatio ?? 0) * 100}%
- Spectral centroid: ${audioFeatures.spectralCentroid ?? '?'} Hz
- Cry-range peak ratio: ${(audioFeatures.cryPeakRatio ?? 0) * 100}% peaks in 200-1000Hz
- Signal notes: ${edgeFlags.length > 0 ? edgeFlags.join('; ') : 'Clean signal — likely a real baby cry'}`;
		text = text.replace('{{AUDIO_FEATURES}}', featureStr);
	} else {
		text = text.replace('{{AUDIO_FEATURES}}', '(Audio measurements unavailable — rely on visual spectrogram analysis)');
	}

	if (userNotes) {
		text = text.replace('{{USER_NOTES}}', `\nPARENT'S OBSERVATIONS:\n"${userNotes}"\n`);
	} else {
		text = text.replace('{{USER_NOTES}}', '');
	}

	return text;
}

function buildUnknownResult(reasoning, provider, model) {
	return {
		category: 'UNKNOWN',
		confidence: 0,
		severity: 'NONE',
		noise_level: 'HIGH',
		cry_detected: false,
		pattern_matched: null,
		reasoning: reasoning || 'No baby cry detected in recording',
		parent_action: 'No cry detected. Please record again closer to baby.',
		response_sound: 'whitenoise',
		pre_cry: false,
		pre_cry_message: null,
		is_adult: false,
		adult_message: null,
		_meta: { provider, model, timestamp: new Date().toISOString(), stages: 1 }
	};
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────

export async function onRequest({ request, env }) {
	const geminiKey = env.GEMINI_API_KEY;
	const openrouterKey = env.OPENROUTER_API_KEY;
	const geminiModel = env.GEMINI_MODEL || env.GEMINI_MODEL_BOTH || env.GEMINI_MODEL_SINGLE || 'gemma-4-31b-it';
	const openrouterModel = env.OPENROUTER_MODEL || env.MODEL_BOTH || env.MODEL_SINGLE || 'google/gemma-4-31b-it:free';
	const siteUrl = env.SITE_URL || 'https://roo-baby.pages.dev';

	if (!geminiKey && !openrouterKey) {
		return jsonRes({ error: 'Set GEMINI_API_KEY and/or OPENROUTER_API_KEY in env.' }, 500);
	}
	if (request.method !== 'POST') return jsonRes({ error: 'Use POST.' }, 405);

	try {
		const form = await request.formData();
		const mode = form.get('mode') || 'audio';
		const twoStage = form.get('two_stage') === 'true';
		const spectrogramBlob = form.get('spectrogram');
		const imageBlob = form.get('image');
		const audioFeaturesStr = form.get('audio_features');
		const userNotes = form.get('user_notes') || '';

		let audioFeatures = null;
		if (audioFeaturesStr) {
			try { audioFeatures = JSON.parse(audioFeaturesStr); } catch {}
		}

		if (!spectrogramBlob?.size && !imageBlob?.size) {
			return jsonRes({ error: 'No spectrogram or image provided.' }, 400);
		}

		const providerOpts = { geminiKey, openrouterKey, siteUrl };

		// ─── TWO-STAGE MODE ──────────────────────────────────────────

		if (twoStage && (mode === 'audio' || mode === 'both') && spectrogramBlob?.size > 0) {
			// Stage 1 — Detection
			const specB64 = await blobToBase64(spectrogramBlob);
			const detectImages = [{ b64: specB64, mime: spectrogramBlob.type || 'image/png' }];

			let detectResult;
			try {
				detectResult = await callAI({ ...providerOpts, promptText: PROMPT_DETECT, images: detectImages });
			} catch (err) {
				return jsonRes({ error: 'Detection stage failed: ' + err.message }, 500);
			}

			const detection = detectResult.result;

			if (mode !== 'both' && (!detection.cry_present || (detection.confidence || 0) < 40)) {
				return jsonRes(buildUnknownResult(
					detection.reasoning || 'No baby cry detected in recording',
					detectResult.provider,
					detectResult.model
				));
			}

			// Stage 2 — Classification
			let classifyPrompt;
			if (mode === 'both') {
				classifyPrompt = PROMPT_BOTH;
				if (!detection.cry_present) {
					classifyPrompt += "\nNOTE: Audio detection was inconclusive. Please prioritize facial analysis, but still check the spectrogram for subtle patterns.";
				}
			} else {
				classifyPrompt = PROMPT_CLASSIFY_AUDIO;
			}
			const promptText = buildPromptText(classifyPrompt, audioFeatures, userNotes);

			const classifyImages = [];
			if (mode === 'audio' || mode === 'both') {
				const atlas = await getAtlasBase64(siteUrl);
				if (atlas) classifyImages.push({ b64: atlas.b64, mime: atlas.mime });
			}
			classifyImages.push({ b64: specB64, mime: spectrogramBlob.type || 'image/png' });
			if (mode === 'both' && imageBlob?.size > 0) {
				const imgB64 = await blobToBase64(imageBlob);
				classifyImages.push({ b64: imgB64, mime: imageBlob.type || 'image/jpeg' });
			}

			let classifyResult;
			try {
				classifyResult = await callAI({ ...providerOpts, promptText, images: classifyImages });
			} catch (err) {
				return jsonRes({ error: 'Classification stage failed: ' + err.message }, 500);
			}

			const result = classifyResult.result;
			result._meta = {
				provider: classifyResult.provider,
				model: classifyResult.model,
				timestamp: new Date().toISOString(),
				mode,
				stages: 2,
				stage1_provider: detectResult.provider,
				stage1_model: detectResult.model,
				stage1_cry_present: detection.cry_present,
				stage1_confidence: detection.confidence,
				atlas_used: !!atlasBase64Cache
			};
			return jsonRes(result);
		}

		// ─── SINGLE-STAGE MODE ──────────────────────────────────────

		let promptBase;
		if (mode === 'image') {
			promptBase = PROMPT_IMAGE;
		} else if (mode === 'both') {
			promptBase = PROMPT_BOTH;
		} else {
			promptBase = PROMPT_CLASSIFY_AUDIO;
		}

		const promptText = buildPromptText(promptBase, audioFeatures, userNotes);

		const images = [];
		if ((mode === 'audio' || mode === 'both') && spectrogramBlob?.size > 0) {
			const atlas = await getAtlasBase64(siteUrl);
			if (atlas) images.push({ b64: atlas.b64, mime: atlas.mime });
		}
		if (spectrogramBlob?.size > 0) {
			const specB64 = await blobToBase64(spectrogramBlob);
			images.push({ b64: specB64, mime: spectrogramBlob.type || 'image/png' });
		}
		if (imageBlob?.size > 0) {
			const imgB64 = await blobToBase64(imageBlob);
			images.push({ b64: imgB64, mime: imageBlob.type || 'image/jpeg' });
		}

		const { result, provider, model } = await callAI({ ...providerOpts, promptText, images });

		result._meta = {
			provider,
			model,
			timestamp: new Date().toISOString(),
			mode,
			stages: 1,
			atlas_used: !!atlasBase64Cache
		};
		return jsonRes(result);

	} catch (e) {
		return jsonRes({ error: e.message || 'Internal error' }, 500);
	}
}
