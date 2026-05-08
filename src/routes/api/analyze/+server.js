/**
 * ROO API Route — Runs as Cloudflare Pages Function
 * Receives audio/image, forwards to Gemini API, returns analysis.
 */

import { env } from '$env/dynamic/private';
import { buildAnalysisPrompt } from '$lib/prompts/analysis.js';

const SUPPORTED_AUDIO_TYPES = [
	'audio/wav', 'audio/x-wav', 'audio/wave',
	'audio/mpeg', 'audio/mp3',
	'audio/flac', 'audio/x-flac',
	'audio/ogg', 'audio/aac', 'audio/x-m4a', 'audio/mp4'
];

function isSupportedAudio(type) {
	return SUPPORTED_AUDIO_TYPES.some(t => type?.includes(t));
}

function toBase64(arrayBuffer) {
	const bytes = new Uint8Array(arrayBuffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

function cleanMarkdownFences(text) {
	return text
		.replace(/^```json\s*/i, '')
		.replace(/^```\s*/i, '')
		.replace(/\s*```$/i, '')
		.trim();
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		const formData = await request.formData();
		const parts = [];

		if (formData.has('audio')) {
			const audioFile = formData.get('audio');
			const mimeType = audioFile.type || 'audio/wav';
			
			if (!isSupportedAudio(mimeType)) {
				return new Response(
					JSON.stringify({
						error: `Unsupported audio format: ${mimeType}. Please upload WAV, MP3, FLAC, AAC, or OGG.`
					}),
					{ status: 400, headers: { 'Content-Type': 'application/json' } }
				);
			}
			
			const audioBuffer = await audioFile.arrayBuffer();
			parts.push({
				inlineData: {
					mimeType: mimeType,
					data: toBase64(audioBuffer)
				}
			});
		}

		if (formData.has('image')) {
			const imageFile = formData.get('image');
			const imageBuffer = await imageFile.arrayBuffer();
			parts.push({
				inlineData: {
					mimeType: 'image/jpeg',
					data: toBase64(imageBuffer)
				}
			});
		}

		if (parts.length === 0) {
			return new Response(
				JSON.stringify({ error: 'No audio or image provided.' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		// Determine mode based on what was provided
		const hasAudio = formData.has('audio');
		const hasImage = formData.has('image');
		const mode = hasAudio && hasImage ? 'both' : hasAudio ? 'audio' : 'image';
		
		parts.push({ text: buildAnalysisPrompt(mode) });

		const modelName = env.GEMINI_MODEL_NAME || 'gemini-1.5-flash-latest';

		const apiResponse = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${env.GEMINI_API_KEY}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					contents: [{ parts }],
					generationConfig: {
						temperature: 0.1,
						maxOutputTokens: 400
					}
				})
			}
		);

		if (!apiResponse.ok) {
			const errText = await apiResponse.text();
			return new Response(
				JSON.stringify({
					error: `Gemini API error: ${apiResponse.status}. Check your API key and model name.`
				}),
				{ status: 502, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const data = await apiResponse.json();
		const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

		let result;
		try {
			const cleaned = cleanMarkdownFences(text);
			result = JSON.parse(cleaned);
		} catch {
			result = {
				category: 'UNKNOWN',
				confidence: 0,
				severity: 'LOW',
				reasoning: 'Could not parse analysis. Please try again.',
				parent_action: 'Re-record in a quieter environment.',
				response_sound: 'whitenoise',
				pre_cry: false,
				pre_cry_message: null
			};
		}

		return new Response(JSON.stringify(result), {
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (err) {
		return new Response(
			JSON.stringify({ error: err.message || 'Internal server error' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}
