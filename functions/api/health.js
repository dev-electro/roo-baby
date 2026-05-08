// Health check — verifies API keys and shows config

export async function onRequest(context) {
	const { env } = context;
	const geminiKey = env.GEMINI_API_KEY;
	const openrouterKey = env.OPENROUTER_API_KEY;
	const geminiSingle = env.GEMINI_MODEL_SINGLE || 'gemma-4-26b-a4b-it';
	const geminiBoth = env.GEMINI_MODEL_BOTH || 'gemma-4-31b-it';
	const modelSingle = env.MODEL_SINGLE || 'google/gemma-4-26b-a4b-it:free';
	const modelBoth = env.MODEL_BOTH || 'google/gemma-4-31b-it:free';
	const modelFallback = env.MODEL_FALLBACK || 'google/gemma-4-31b-it:free';

	if (!geminiKey && !openrouterKey) {
		return new Response(JSON.stringify({
			status: 'degraded',
			error: 'Neither GEMINI_API_KEY nor OPENROUTER_API_KEY is configured',
			timestamp: new Date().toISOString()
		}), {
			status: 503,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return new Response(JSON.stringify({
		status: 'ok',
		providers: {
			gemini: geminiKey ? 'configured' : 'not set',
			openrouter: openrouterKey ? 'configured' : 'not set'
		},
		models: {
			gemini_single: geminiSingle,
			gemini_both: geminiBoth,
			openrouter_single: modelSingle,
			openrouter_both: modelBoth,
			openrouter_fallback: modelFallback
		},
		runtime: 'Cloudflare Pages → Gemini (primary) / OpenRouter (fallback)',
		timestamp: new Date().toISOString()
	}), {
		headers: { 'Content-Type': 'application/json' }
	});
}