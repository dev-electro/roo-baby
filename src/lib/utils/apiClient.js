/**
 * API client — calls Cloudflare Pages Function at /api/analyze
 */
export async function analyze({ mode, audio, image }) {
	const formData = new FormData();
	
	if (mode !== 'image' && audio) {
		formData.append('audio', audio, 'cry.wav');
	}
	if (mode !== 'audio' && image) {
		formData.append('image', image, 'baby.jpg');
	}
	
	const response = await fetch('/api/analyze', {
		method: 'POST',
		body: formData
	});
	
	const data = await response.json();
	
	if (!response.ok || data.error) {
		throw new Error(data.error || `Server error ${response.status}`);
	}
	
	return data;
}

/**
 * Check if backend is reachable
 */
export async function checkHealth() {
	const res = await fetch('/api/health');
	return res.json();
}
