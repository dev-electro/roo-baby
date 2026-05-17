import { error } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, request, platform }) {
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

	const rangeHeader = request.headers.get('range');
	
	// Fetch the object from R2 with the specified range if it exists
	const object = await bucket.get(objectKey, rangeHeader ? { range: rangeHeader } : undefined);

	if (object === null) {
		throw error(404, "Audio track not found in R2: " + objectKey);
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('etag', object.httpEtag);
	
	// Force correct audio MIME types (Safari refuses to play audio/octet-stream)
	const contentType = headers.get('content-type') || '';
	if (!contentType || contentType === 'application/octet-stream') {
		if (objectKey.endsWith('.m4a')) {
			headers.set('content-type', 'audio/mp4');
		} else if (objectKey.endsWith('.mp3')) {
			headers.set('content-type', 'audio/mpeg');
		} else if (objectKey.endsWith('.wav')) {
			headers.set('content-type', 'audio/wav');
		} else {
			headers.set('content-type', 'audio/mp4');
		}
	}

	headers.set('Cache-Control', 'public, max-age=31536000');
	headers.set('Accept-Ranges', 'bytes');

	let status = 200;
	if (object.range) {
		status = 206;
		const offset = object.range.offset;
		const length = object.range.length;
		headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
		headers.set('Content-Length', length.toString());
	} else {
		headers.set('Content-Length', object.size.toString());
	}

	return new Response(object.body, { status, headers });
}
