/**
 * Health check endpoint
 */
export async function onRequestGet(context) {
	const { env } = context;
	return new Response(JSON.stringify({
		status: 'ok',
		timestamp: new Date().toISOString(),
		config: {
			api_key_set: Boolean(env.GEMINI_API_KEY),
			model: env.GEMINI_MODEL_NAME || 'gemini-2.0-flash'
		}
	}), {
		headers: { 'Content-Type': 'application/json' }
	});
}
