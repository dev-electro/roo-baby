// Cloudflare Pages Function — multi-provider proxy
// Provider priority: Google Gemini → OpenRouter
// Prompts fetched from /static/prompts/ for modularity.

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

// ─── CACHING & FETCHERS ──────────────────────────────────────────────

const PROMPT_CACHE = new Map();
let AUDIO_STATS_CACHE = null;

async function getPrompt(siteUrl, filename) {
	if (PROMPT_CACHE.has(filename)) return PROMPT_CACHE.get(filename);
	try {
		const res = await fetch(\`\${siteUrl}/prompts/\${filename}\`, { signal: AbortSignal.timeout(3000) });
		if (res.ok) {
			const text = await res.text();
			PROMPT_CACHE.set(filename, text);
			return text;
		}
	} catch (e) {
		console.error(\`Failed to fetch prompt \${filename}:\`, e);
	}
	return null;
}

async function getAudioStats(siteUrl) {
	if (AUDIO_STATS_CACHE) return AUDIO_STATS_CACHE;
	try {
		const res = await fetch(\`\${siteUrl}/atlas/atlas_stats_prompt.txt\`, { signal: AbortSignal.timeout(3000) });
		if (res.ok) {
			AUDIO_STATS_CACHE = await res.text();
			return AUDIO_STATS_CACHE;
		}
	} catch (e) {
		console.error('Failed to fetch audio stats:', e);
	}
	return "";
}

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
	// Robust sanitization: find first { and last }
	const s = text.indexOf('{');
	const e = text.lastIndexOf('}');
	if (s >= 0 && e > s) {
		const raw = text.slice(s, e + 1);
		try { return JSON.parse(raw); } catch {}
	}
	return null;
}

// ─── ATLAS CACHE ──────────────────────────────────────────────────────

let atlasBase64Cache = null;
let atlasMimeCache = null;

async function getAtlasBase64(siteUrl) {
	if (atlasBase64Cache) return { b64: atlasBase64Cache, mime: atlasMimeCache };
	try {
		const res = await fetch(\`\${siteUrl}/atlas/atlas_master.webp\`, { signal: AbortSignal.timeout(5000) });
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

// ─── PROVIDER 1: Google Gemini ───────────────────────────────────────

async function callGemini(apiKey, model, contents) {
	const res = await fetch(\`\${GEMINI_BASE}/models/\${model}:generateContent?key=\${apiKey}\`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			contents: [{ role: 'user', parts: contents }],
			generationConfig: {
				maxOutputTokens: 800,
				temperature: 0.1,
				responseMimeType: 'application/json'
			}
		})
	});

	if (!res.ok) {
		const err = await res.text();
		throw new Error(\`Gemini \${res.status}: \${err.slice(0, 200)}\`);
	}

	const data = await res.json();
	const parts = data?.candidates?.[0]?.content?.parts;
	if (!parts) throw new Error('Gemini returned no content');
	return parts.map(p => p.text || '').join('');
}

// ─── PROVIDER 2: OpenRouter ──────────────────────────────────────────

async function callOpenRouter(apiKey, model, messages, siteUrl) {
	const res = await fetch(\`\${OPENROUTER_BASE}/chat/completions\`, {
		method: 'POST',
		headers: {
			'Authorization': \`Bearer \${apiKey}\`,
			'Content-Type': 'application/json',
			'HTTP-Referer': siteUrl,
			'X-Title': 'ROO Baby Cry Analyzer'
		},
		body: JSON.stringify({
			model,
			messages,
			max_tokens: 800,
			temperature: 0.1,
			response_format: { type: 'json_object' }
		})
	});

	if (!res.ok) {
		const err = await res.text();
		throw new Error(\`OpenRouter \${res.status}: \${err.slice(0, 200)}\`);
	}

	const data = await res.json();
	return data?.choices?.[0]?.message?.content || '';
}

// ─── UNIFIED PROVIDER DISPATCH ───────────────────────────────────────

function buildChatMessages(images, promptText) {
	const content = [];
	for (const img of images) {
		content.push({
			type: 'image_url',
			image_url: { url: \`data:\${img.mime};base64,\${img.b64}\` }
		});
	}
	content.push({ type: 'text', text: promptText });
	return [{ role: 'user', content }];
}

async function callAI({ promptText, images, geminiKey, openrouterKey, siteUrl }, retries = 2) {
	let lastError;
	const delays = [1000, 2000, 4000];

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
					if (parsed) return { result: parsed, provider: 'gemini', model, text };
					throw new Error(\`Gemini invalid JSON\`);
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

	if (openrouterKey) {
		for (const model of ['google/gemma-4-31b-it:free', 'google/gemma-4-26b-a4b-it:free']) {
			for (let attempt = 0; attempt <= retries; attempt++) {
				try {
					const messages = buildChatMessages(images, promptText);
					const text = await callOpenRouter(openrouterKey, model, messages, siteUrl);
					const parsed = parseJSON(text);
					if (parsed) return { result: parsed, provider: 'openrouter', model, text };
					throw new Error(\`OpenRouter invalid JSON\`);
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

	throw lastError || new Error('All providers exhausted');
}

// ─── PROMPT BUILDER ──────────────────────────────────────────────────

function buildPromptText(basePrompt, audioFeatures, audioStats, userNotes) {
	let text = basePrompt;
	text = text.replace('{{AUDIO_STATS}}', audioStats || "(Statistical data unavailable)");

	if (audioFeatures) {
		const featureStr = \`- Duration: \${audioFeatures.duration ?? '?'}s
- Dominant frequency: \${audioFeatures.dominantFreqHz ?? '?'} Hz
- Peak frequencies: \${(audioFeatures.peakFreqHz ?? []).join(', ')} Hz
- Energy (RMS): \${audioFeatures.rmsEnergy ?? '?'}
- Zero-crossing rate: \${audioFeatures.zeroCrossRate ?? '?'}/s
- Silence ratio: \${((audioFeatures.silenceRatio ?? 0) * 100).toFixed(1)}%
- Onset ratio: \${((audioFeatures.onsetRatio ?? 0) * 100).toFixed(1)}% energy in first half\`;
		text = text.replace('{{AUDIO_FEATURES}}', featureStr);
	} else {
		text = text.replace('{{AUDIO_FEATURES}}', '(Audio measurements unavailable)');
	}

	text = text.replace('{{USER_NOTES}}', userNotes ? \`\\nPARENT'S OBSERVATIONS: "\\n\${userNotes}"\\n\` : '');
	return text;
}

function buildUnknownResult(reasoning) {
	return {
		category: 'UNKNOWN', confidence: 0, severity: 'NONE', noise_level: 'HIGH',
		cry_detected: false, pattern_matched: null, reasoning: reasoning || 'No baby cry detected',
		parent_action: 'Please record again closer to baby.', response_sound: 'whitenoise',
		pre_cry: false, pre_cry_message: null, is_adult: false, adult_message: null
	};
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────

export async function onRequest({ request, env }) {
	const geminiKey = env.GEMINI_API_KEY;
	const openrouterKey = env.OPENROUTER_API_KEY;
	
	const url = new URL(request.url);
	const siteUrl = env.SITE_URL || url.origin;

	if (!geminiKey && !openrouterKey) return jsonRes({ error: 'Missing API keys' }, 500);
	if (request.method !== 'POST') return jsonRes({ error: 'Use POST' }, 405);

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

		const audioStats = await getAudioStats(siteUrl);
		const providerOpts = { geminiKey, openrouterKey, siteUrl };

		// Stage 1 Detection (if requested or in audio/both mode)
		if (twoStage && (mode === 'audio' || mode === 'both') && spectrogramBlob?.size > 0) {
			const detectPrompt = await getPrompt(siteUrl, 'detect.txt');
			if (!detectPrompt) throw new Error('Detection prompt missing');
			
			const specB64 = await blobToBase64(spectrogramBlob);
			const { result: detection } = await callAI({ ...providerOpts, promptText: detectPrompt, images: [{ b64: specB64, mime: spectrogramBlob.type || 'image/png' }] });

			if (mode !== 'both' && (!detection.cry_present || (detection.confidence || 0) < 40)) {
				return jsonRes(buildUnknownResult(detection.reasoning));
			}
		}

		// Main Analysis
		let promptFile = 'classify_audio.txt';
		if (mode === 'image') promptFile = 'classify_image.txt';
		if (mode === 'both') promptFile = 'classify_both.txt';

		let promptBase = await getPrompt(siteUrl, promptFile);
		if (!promptBase) throw new Error(`Analysis prompt missing: ${promptFile}`);
		
		const promptText = buildPromptText(promptBase, audioFeatures, audioStats, userNotes);

		const images = [];
		if ((mode === 'audio' || mode === 'both') && spectrogramBlob?.size > 0) {
			const atlas = await getAtlasBase64(siteUrl);
			if (atlas) images.push({ b64: atlas.b64, mime: atlas.mime });
			const b64 = await blobToBase64(spectrogramBlob);
			images.push({ b64, mime: spectrogramBlob.type || 'image/webp' });
		}
		if ((mode === 'image' || mode === 'both') && imageBlob?.size > 0) {
			const b64 = await blobToBase64(imageBlob);
			images.push({ b64, mime: imageBlob.type || 'image/jpeg' });
		}

		const { result, provider, model } = await callAI({ ...providerOpts, promptText, images });
		result._meta = { provider, model, timestamp: new Date().toISOString(), mode };
		return jsonRes(result);

	} catch (e) {
		console.error('Request error:', e);
		return jsonRes({ error: e.message || 'Internal error' }, 500);
	}
}
