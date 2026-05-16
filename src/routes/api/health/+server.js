/**
 * SvelteKit health check route — dev-mode counterpart of functions/api/health.js
 */
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function GET() {
	const hasGemini = !!(env.GEMINI_API_KEY);
	const hasOpenRouter = !!(env.OPENROUTER_API_KEY);
	return json({
		status: 'ok',
		runtime: 'sveltekit-dev',
		gemini: hasGemini,
		openrouter: hasOpenRouter,
		ready: hasGemini || hasOpenRouter,
	});
}
