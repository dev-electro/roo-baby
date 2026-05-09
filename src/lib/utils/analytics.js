/**
 * Google Analytics 4 event tracking.
 * Events: page_view, analyze_cry, mode_switch, play_sound, login, signup
 */
const GA_ID = 'G-XXXXXXXXXX';

let initialized = false;

export function init() {
	if (initialized || typeof window === 'undefined') return;
	initialized = true;

	const script = document.createElement('script');
	script.async = true;
	script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
	document.head.appendChild(script);

	window.dataLayer = window.dataLayer || [];
	function gtag() { window.dataLayer.push(arguments); }
	gtag('js', new Date());
	gtag('config', GA_ID);
	window.gtag = gtag;
}

export function track(name, params = {}) {
	if (typeof window !== 'undefined' && window.gtag) {
		window.gtag('event', name, params);
	}
}

export function pageView(path) { track('page_view', { page_path: path }); }
export function analyze(mode) { track('analyze_cry', { mode }); }
export function modeSwitch(mode) { track('mode_switch', { mode }); }
export function playSound(type, source) { track('play_sound', { type, source }); }
export function login() { track('login', { method: 'local' }); }
export function signup() { track('sign_up', { method: 'local' }); }
