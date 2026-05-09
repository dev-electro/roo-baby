/**
 * Google Analytics 4 — event tracking.
 * Set PUBLIC_GA_ID in .env or Cloudflare Pages env vars.
 * If not set, all calls are safe no-ops.
 *
 * Events tracked:
 *   page_view, mode_switch, record_audio, capture_photo,
 *   analyze_cry, play_sound, play_tts, toggle_theme,
 *   login, signup, error, settings_change
 */

const GA_ID = typeof import.meta !== 'undefined' ? (import.meta.env?.PUBLIC_GA_ID || '') : '';
let ready = false;

export function init() {
	if (!GA_ID || ready || typeof window === 'undefined') return;
	ready = true;

	const s = document.createElement('script');
	s.async = true;
	s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
	document.head.appendChild(s);

	window.dataLayer = window.dataLayer || [];
	function gtag() { window.dataLayer.push(arguments); }
	gtag('js', new Date());
	gtag('config', GA_ID, {
		send_page_view: false,
		anonymize_ip: true
	});
	window.gtag = gtag;
}

function gtag() {
	if (!ready || typeof window === 'undefined' || !window.gtag) return;
	window.gtag(...arguments);
}

/** Page view */
export function pageView(path) {
	if (!GA_ID) return;
	gtag('event', 'page_view', { page_path: path, page_title: document.title });
}

/** Mode switch: audio / image / both */
export function modeSwitch(mode) { gtag('event', 'mode_switch', { mode }); }

/** Audio recorded */
export function recordAudio(duration) { gtag('event', 'record_audio', { duration_sec: duration }); }

/** Photo captured or uploaded */
export function capturePhoto(source) { gtag('event', 'capture_photo', { source }); }

/** Analysis started/completed */
export function analyzeCry(mode, category, confidence) {
	gtag('event', 'analyze_cry', { mode, category, confidence });
}

/** Analysis error */
export function analyzeError(mode, reason) {
	gtag('event', 'analyze_error', { mode, reason: reason?.slice(0, 100) });
}

/** Sound played — synth or track */
export function playSound(type, source) { gtag('event', 'play_sound', { sound_type: type, source }); }

/** TTS spoken */
export function playTTS(category) { gtag('event', 'play_tts', { category }); }

/** Theme toggled */
export function toggleTheme(theme) { gtag('event', 'toggle_theme', { theme }); }

/** Login / signup */
export function login(method) { gtag('event', 'login', { method }); }
export function signup(method) { gtag('event', 'sign_up', { method }); }

/** Settings changed */
export function settingsChange(key, value) { gtag('event', 'settings_change', { key, value: String(value) }); }

/** Generic error */
export function appError(context, msg) { gtag('event', 'app_error', { context, message: msg?.slice(0, 100) }); }
