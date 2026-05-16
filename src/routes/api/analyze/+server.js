/**
 * SvelteKit API route — dev-mode proxy for /api/analyze
 * Mirrors functions/api/analyze.js so `npm run dev` works locally.
 * In production (Cloudflare Pages), the CF Function at functions/api/analyze.js
 * takes priority and this route is never reached.
 *
 * Reads GEMINI_API_KEY / OPENROUTER_API_KEY from .env (via import.meta.env or process.env).
 */

import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

// ─── HELPERS ───────────────────────────────────────────────────────────

function parseJSON(text) {
	if (!text) return null;
	const s = text.indexOf('{');
	const e = text.lastIndexOf('}');
	if (s >= 0 && e > s) {
		try { return JSON.parse(text.slice(s, e + 1)); } catch {}
	}
	return null;
}

async function blobToBase64(blob) {
	const buf = new Uint8Array(await blob.arrayBuffer());
	let binary = '';
	for (let i = 0; i < buf.length; i += 4096) {
		binary += String.fromCharCode(...buf.slice(i, i + 4096));
	}
	return btoa(binary);
}

// ─── AI PROVIDERS ──────────────────────────────────────────────────────

async function callGemini(apiKey, model, contents) {
	const res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			contents: [{ role: 'user', parts: contents }],
			generationConfig: { maxOutputTokens: 500, temperature: 0.1, responseMimeType: 'application/json' }
		})
	});
	if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
	const data = await res.json();
	const parts = data?.candidates?.[0]?.content?.parts;
	if (!parts) throw new Error('Gemini returned no content');
	return parts.map(p => p.text || '').join('');
}

async function callOpenRouter(apiKey, model, messages, siteUrl) {
	const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			'HTTP-Referer': siteUrl,
			'X-Title': 'ROO Baby Cry Analyzer'
		},
		body: JSON.stringify({ model, messages, max_tokens: 500, temperature: 0.1, response_format: { type: 'json_object' } })
	});
	if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
	const data = await res.json();
	return data?.choices?.[0]?.message?.content || '';
}

async function callAI({ promptText, images, geminiKey, openrouterKey, siteUrl }) {
	let lastError;
	const delays = [1000, 2000, 4000];

	if (geminiKey) {
		for (const model of ['gemma-4-31b-it', 'gemma-4-26b-a4b-it']) {
			for (let attempt = 0; attempt <= 2; attempt++) {
				try {
					const parts = images.map(img => ({ inlineData: { mimeType: img.mime, data: img.b64 } }));
					parts.push({ text: promptText });
					const text = await callGemini(geminiKey, model, parts);
					const parsed = parseJSON(text);
					if (parsed) return { result: parsed, provider: 'gemini', model };
					throw new Error('Gemini invalid JSON');
				} catch (err) {
					lastError = err;
					if (err.message.includes('429') && attempt < 2) {
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
			for (let attempt = 0; attempt <= 2; attempt++) {
				try {
					const content = [];
					for (const img of images) content.push({ type: 'image_url', image_url: { url: `data:${img.mime};base64,${img.b64}` } });
					content.push({ type: 'text', text: promptText });
					const messages = [{ role: 'user', content }];
					const text = await callOpenRouter(openrouterKey, model, messages, siteUrl);
					const parsed = parseJSON(text);
					if (parsed) return { result: parsed, provider: 'openrouter', model };
					throw new Error('OpenRouter invalid JSON');
				} catch (err) {
					lastError = err;
					if (err.message.includes('429') && attempt < 2) {
						await new Promise(r => setTimeout(r, delays[attempt]));
						continue;
					}
					break;
				}
			}
		}
	}

	throw lastError || new Error('All AI providers exhausted. Check API keys in .env');
}

// ─── ATLAS & PROMPT CACHE ──────────────────────────────────────────────

let atlasCache = null;
let promptCache = {};
let statsCache = null;

async function getAtlas(origin) {
	if (atlasCache) return atlasCache;
	try {
		const res = await fetch(`${origin}/atlas/atlas_master.webp`, { signal: AbortSignal.timeout(5000) });
		if (res.ok) {
			atlasCache = { b64: await blobToBase64(await res.blob()), mime: 'image/webp' };
			return atlasCache;
		}
	} catch {}
	return null;
}

async function getPromptFile(origin, filename) {
	if (promptCache[filename]) return promptCache[filename];
	try {
		const res = await fetch(`${origin}/prompts/${filename}`, { signal: AbortSignal.timeout(3000) });
		if (res.ok) { promptCache[filename] = await res.text(); return promptCache[filename]; }
	} catch {}
	return null;
}

async function getAudioStats(origin) {
	if (statsCache) return statsCache;
	try {
		const res = await fetch(`${origin}/atlas/atlas_stats_prompt.txt`, { signal: AbortSignal.timeout(3000) });
		if (res.ok) { statsCache = await res.text(); return statsCache; }
	} catch {}
	return '';
}

function buildPrompt(base, audioFeatures, audioStats, userNotes) {
	let text = base;
	text = text.replace('{{AUDIO_STATS}}', audioStats || '(Statistical data unavailable)');
	if (audioFeatures) {
		text = text.replace('{{AUDIO_FEATURES}}',
			`- Duration: ${audioFeatures.duration ?? '?'}s\n` +
			`- Dominant frequency: ${audioFeatures.dominantFreqHz ?? '?'} Hz\n` +
			`- Peak frequencies: ${(audioFeatures.peakFreqHz ?? []).join(', ')} Hz\n` +
			`- Energy (RMS): ${audioFeatures.rmsEnergy ?? '?'}\n` +
			`- Zero-crossing rate: ${audioFeatures.zeroCrossRate ?? '?'}/s\n` +
			`- Silence ratio: ${((audioFeatures.silenceRatio ?? 0) * 100).toFixed(1)}%\n` +
			`- Onset ratio: ${((audioFeatures.onsetRatio ?? 0) * 100).toFixed(1)}% energy in first half`
		);
	} else {
		text = text.replace('{{AUDIO_FEATURES}}', '(Audio measurements unavailable)');
	}
	text = text.replace('{{USER_NOTES}}', userNotes ? `\nPARENT'S OBSERVATIONS:\n"${userNotes}"\n` : '');
	return text;
}

function unknownResult(reasoning) {
	return {
		category: 'UNKNOWN', confidence: 0, severity: 'NONE', noise_level: 'HIGH',
		cry_detected: false, pattern_matched: null,
		reasoning: reasoning || 'No baby cry detected',
		parent_action: 'Please record again closer to baby.', response_sound: 'whitenoise',
		pre_cry: false, pre_cry_message: null, is_adult: false, adult_message: null
	};
}

// ─── REQUEST HANDLER ───────────────────────────────────────────────────

export async function POST({ request, url }) {
	const geminiKey = env.GEMINI_API_KEY;
	const openrouterKey = env.OPENROUTER_API_KEY;
	const siteUrl = env.SITE_URL || url.origin;

	const isValidKey = (k) => k && !k.includes('your-') && !k.includes('YOUR_') && k.length > 10;

	if (!isValidKey(geminiKey) && !isValidKey(openrouterKey)) {
		return json({
			error: 'No API keys configured. Edit .env and set GEMINI_API_KEY (from aistudio.google.com/apikey) or OPENROUTER_API_KEY (from openrouter.ai/settings/keys).'
		}, { status: 500 });
	}

	let form;
	try {
		form = await request.formData();
	} catch {
		return json({ error: 'Invalid form data' }, { status: 400 });
	}

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

	const validGemini = isValidKey(geminiKey) ? geminiKey : null;
	const validOpenRouter = isValidKey(openrouterKey) ? openrouterKey : null;
	const origin = siteUrl.startsWith('http') ? siteUrl : url.origin;
	const providerOpts = { geminiKey: validGemini, openrouterKey: validOpenRouter, siteUrl: origin };

	try {
		const audioStats = await getAudioStats(origin);

		// Stage 1: detect if cry is present
		if (twoStage && (mode === 'audio' || mode === 'both') && spectrogramBlob?.size > 0) {
			const detectPrompt = await getPromptFile(origin, 'detect.txt');
			if (detectPrompt) {
				const specB64 = await blobToBase64(spectrogramBlob);
				const { result: detection } = await callAI({
					...providerOpts,
					promptText: detectPrompt,
					images: [{ b64: specB64, mime: spectrogramBlob.type || 'image/webp' }]
				});
				if (mode !== 'both' && (!detection.cry_present || (detection.confidence || 0) < 40)) {
					return json(unknownResult(detection.reasoning));
				}
			}
		}

		// Stage 2: classify
		const promptFile = mode === 'image' ? 'classify_image.txt' : mode === 'both' ? 'classify_both.txt' : 'classify_audio.txt';
		const promptBase = await getPromptFile(origin, promptFile);
		if (!promptBase) return json({ error: `Prompt file missing: ${promptFile}` }, { status: 500 });

		const promptText = buildPrompt(promptBase, audioFeatures, audioStats, userNotes);

		const images = [];
		if ((mode === 'audio' || mode === 'both') && spectrogramBlob?.size > 0) {
			const atlas = await getAtlas(origin);
			if (atlas) images.push(atlas);
			const b64 = await blobToBase64(spectrogramBlob);
			images.push({ b64, mime: spectrogramBlob.type || 'image/webp' });
		}
		if ((mode === 'image' || mode === 'both') && imageBlob?.size > 0) {
			const b64 = await blobToBase64(imageBlob);
			images.push({ b64, mime: imageBlob.type || 'image/jpeg' });
		}

		const { result, provider, model } = await callAI({ ...providerOpts, promptText, images });
		result._meta = { provider, model, timestamp: new Date().toISOString(), mode };
		return json(result);

	} catch (/** @type {any} */ err) {
		console.error('[/api/analyze]', err);
		return json({ error: err.message || 'Analysis failed' }, { status: 500 });
	}
}

export async function OPTIONS() {
	return new Response(null, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		}
	});
}
