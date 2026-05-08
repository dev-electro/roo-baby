/**
 * Text-to-Speech engine using Web Speech API
 */

let voicesLoaded = false;
let preferredVoice = null;

function loadVoices() {
	if (!window.speechSynthesis) return;
	const voices = window.speechSynthesis.getVoices();
	if (voices.length === 0) return;
	
	// Prefer warm, gentle female voices
	const preferredNames = [
		'Samantha', 'Karen', 'Victoria', 'Moira', 'Tessa',
		'Google UK English Female', 'Microsoft Zira'
	];
	
	for (const name of preferredNames) {
		const found = voices.find(v => v.name.includes(name));
		if (found) {
			preferredVoice = found;
			break;
		}
	}
	
	// Fallback: any female-sounding voice
	if (!preferredVoice) {
		preferredVoice = voices.find(v => 
			/Female|female|Woman|woman/i.test(v.name)
		);
	}
	
	voicesLoaded = true;
}

if (typeof window !== 'undefined') {
	window.speechSynthesis?.getVoices();
	window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
	// Try immediately in case voices are already loaded
	setTimeout(loadVoices, 100);
}

/**
 * Speak text with gentle, soothing settings
 * @param {string} text
 */
export function speak(text) {
	if (!window.speechSynthesis) return;
	
	// Cancel any ongoing speech
	window.speechSynthesis.cancel();
	
	const utterance = new SpeechSynthesisUtterance(text);
	utterance.rate = 0.75;
	utterance.pitch = 1.1;
	utterance.volume = 0.6;
	
	if (preferredVoice) {
		utterance.voice = preferredVoice;
	}
	
	window.speechSynthesis.speak(utterance);
	return utterance;
}

/**
 * Stop all speech
 */
export function stopSpeaking() {
	if (!window.speechSynthesis) return;
	window.speechSynthesis.cancel();
}
