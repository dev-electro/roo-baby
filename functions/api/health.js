// functions/api/health.js
export async function onRequest(context) {
	const { env } = context;
	return new Response(JSON.stringify({
		status: 'ok',
		timestamp: new Date().toISOString(),
		key_set: !!env.GEMINI_API_KEY,
		model: env.GEMINI_MODEL_NAME || 'gemini-2.0-flash'
	}), {
		headers: { 'Content-Type': 'application/json' }
	});
}
