/**
 * API client for the ROO backend (same-origin Pages Function)
 */

/**
 * @param {Object} params
 * @param {string} params.mode - 'audio' | 'image' | 'both'
 * @param {Blob|null} params.audio
 * @param {Blob|null} params.image
 * @returns {Promise<Object>}
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
	
	let data;
	try {
		data = await response.json();
	} catch {
		throw new Error('Invalid response from server.');
	}
	
	if (!response.ok) {
		throw new Error(data.error || `Server error: ${response.status}`);
	}
	
	if (data.error) {
		throw new Error(data.error);
	}
	
	return data;
}
