// Health check — verifies OpenRouter API key is configured

export async function onRequest(context) {
	const { env } = context;
	const apiKey = env.OPENROUTER_API_KEY;
	const modelSingle = env.MODEL_SINGLE || 'google/gemma-4-26b-a4b-it:free';
	const modelBoth = env.MODEL_BOTH || 'google/gemma-4-31b-it:free';
	const modelFallback = env.MODEL_FALLBACK || 'google/gemma-4-31b-it:free';

	if (!apiKey) {
		return new Response(JSON.stringify({
			status: 'degraded',
			error: 'OPENROUTER_API_KEY not configured',
			timestamp: new Date().toISOString()
		}), {
			status: 503,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return new Response(JSON.stringify({
		status: 'ok',
		models: { single: modelSingle, both: modelBoth, fallback: modelFallback },
		runtime: 'Cloudflare Pages → OpenRouter',
		key_set: true,
		timestamp: new Date().toISOString()
	}), {
		headers: { 'Content-Type': 'application/json' }
	});
}