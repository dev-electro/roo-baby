/**
 * Text-to-Speech engine using Web Speech API.
 * Requires user gesture to unlock speechSynthesis on mobile.
 */

let voicesLoaded = false;
let preferredVoice = null;
let currentUtterance = null;
let unlocked = false;

function loadVoices() {
	if (!window.speechSynthesis) return;
	const voices = window.speechSynthesis.getVoices();
	if (voices.length === 0) return;

	const preferredNames = [
		'Samantha', 'Karen', 'Victoria', 'Moira', 'Tessa',
		'Google UK English Female', 'Microsoft Zira'
	];

	for (const name of preferredNames) {
		const found = voices.find(v => v.name.includes(name));
		if (found) { preferredVoice = found; break; }
	}

	if (!preferredVoice) {
		preferredVoice = voices.find(v => /Female|female|Woman|woman/i.test(v.name));
	}

	voicesLoaded = true;
}

if (typeof window !== 'undefined') {
	window.speechSynthesis?.getVoices();
	window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
	setTimeout(loadVoices, 200);
}

/**
 * Unlock speech synthesis with a user gesture (call once on first tap).
 */
export function unlockSpeech() {
	if (unlocked || !window.speechSynthesis) return;
	unlocked = true;
	const u = new SpeechSynthesisUtterance('');
	u.volume = 0;
	u.rate = 1;
	window.speechSynthesis.speak(u);
}

/**
 * Speak text with gentle, soothing settings.
 */
export function speak(text) {
	if (!window.speechSynthesis || !text) return;

	stopSpeaking();

	const utterance = new SpeechSynthesisUtterance(text);
	utterance.rate = 0.75;
	utterance.pitch = 1.1;
	utterance.volume = 0.6;

	if (preferredVoice) {
		utterance.voice = preferredVoice;
	}

	currentUtterance = utterance;
	utterance.onend = () => { currentUtterance = null; };
	utterance.onerror = () => { currentUtterance = null; };

	window.speechSynthesis.speak(utterance);
	return utterance;
}

/**
 * Stop all speech immediately.
 */
export function stopSpeaking() {
	if (!window.speechSynthesis) return;
	currentUtterance = null;
	window.speechSynthesis.cancel();
}

/**
 * Check if TTS is currently speaking.
 */
export function isSpeaking() {
	return window.speechSynthesis?.speaking || false;
}