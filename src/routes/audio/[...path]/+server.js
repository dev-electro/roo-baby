import { error } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, platform }) {
	// Grab the bucket binding. Supports either ROO_BABY_AUDIO (recommended) or PUBLIC_R2_BASE (user's current)
	const bucket = platform?.env?.ROO_BABY_AUDIO || platform?.env?.PUBLIC_R2_BASE;
	
	if (!bucket) {
		// In local dev without wrangler, or if binding is missing
		throw error(500, "R2 bucket binding not found. Please bind 'ROO_BABY_AUDIO' or 'PUBLIC_R2_BASE' in Cloudflare Pages.");
	}

	const objectKey = params.path;
	if (!objectKey) {
		throw error(404, "Not found");
	}

	const object = await bucket.get(objectKey);

	if (object === null) {
		throw error(404, "Audio track not found in R2: " + objectKey);
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('etag', object.httpEtag);
	
	if (!headers.has('content-type')) {
		headers.set('content-type', 'audio/mp4');
	}

	headers.set('Cache-Control', 'public, max-age=31536000');
	headers.set('Accept-Ranges', 'bytes');

	return new Response(object.body, { headers });
}
