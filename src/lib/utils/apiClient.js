/**
 * API client — supports both Cloudflare Pages Function and external Colab backend
 */

let customApiUrl = '';
if (typeof window !== 'undefined') {
	customApiUrl = localStorage.getItem('roo_api_url') || '';
}

export function setApiUrl(url) {
	customApiUrl = url;
	if (typeof window !== 'undefined') {
		localStorage.setItem('roo_api_url', url);
	}
}

export function getApiUrl() {
	return customApiUrl;
}

function baseUrl() {
	return customApiUrl || '';
}

function endpoint(path) {
	if (customApiUrl) {
		// External backend (Colab) uses /analyze/audio, /analyze/image, /analyze/both
		return `${customApiUrl}${path}`;
	}
	// Pages Function uses /api/analyze (POST multipart, auto-detects mode)
	return '/api/analyze';
}

/**
 * @param {Object} params
 * @param {string} params.mode - 'audio' | 'image' | 'both'
 * @param {Blob|null} params.audio
 * @param {Blob|null} params.image
 */
export async function analyze({ mode, audio, image }) {
	const formData = new FormData();

	if (mode !== 'image' && audio) {
		formData.append('audio', audio, 'cry.wav');
	}
	if (mode !== 'audio' && image) {
		formData.append('image', image, 'baby.jpg');
	}

	const url = customApiUrl
		? `${customApiUrl}/analyze/${mode}`  // Colab: individual endpoints
		: '/api/analyze';                     // Pages: single endpoint

	const response = await fetch(url, { method: 'POST', body: formData });
	const data = await response.json();

	if (!response.ok || data.error) {
		throw new Error(data.error || `Server error ${response.status}`);
	}

	return data;
}

export async function checkHealth() {
	if (customApiUrl) {
		const res = await fetch(`${customApiUrl}/health`);
		return res.json();
	}
	const res = await fetch('/api/health');
	return res.json();
}
