/**
 * API client — sends spectrogram + photo + audio features to Cloudflare Pages Function
 * which proxies to OpenRouter (Gemma 4 via free endpoints)
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

export async function analyze({ mode, audio, image, spectrogram, audioFeatures, userNotes, twoStage = true }) {
	const formData = new FormData();

	if (mode !== 'image' && spectrogram) {
		formData.append('spectrogram', spectrogram, 'spectrogram.png');
	}

	if (mode !== 'audio' && image) {
		formData.append('image', image, 'baby.jpg');
	}

	if (audioFeatures) {
		formData.append('audio_features', JSON.stringify(audioFeatures));
	}

	if (userNotes) {
		formData.append('user_notes', userNotes);
	}

	if (twoStage && mode !== 'image') {
		formData.append('two_stage', 'true');
	}

	formData.append('mode', mode);

	const url = customApiUrl
		? `${customApiUrl}/analyze/${mode}`
		: '/api/analyze';

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