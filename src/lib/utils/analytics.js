export function trackEvent(eventName, params = {}) {
	try {
		if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
			window.gtag('event', eventName, params);
		}
	} catch (e) {
		console.warn('Analytics error:', e);
	}
}

// Helper methods for specific ROO Baby events
export function trackInputCapture(type, method) {
	// type: 'audio' or 'image'
	// method: 'record', 'upload', 'camera'
	trackEvent('input_captured', {
		input_type: type,
		capture_method: method
	});
}

export function trackModeSelect(mode) {
	trackEvent('mode_selected', { selected_mode: mode });
}

export function trackAnalyze(mode, predictedCategory, confidence) {
	trackEvent('analysis_complete', {
		analysis_mode: mode,
		predicted_category: predictedCategory,
		confidence_score: confidence
	});
}

export function trackError(mode, errorMessage) {
	trackEvent('analysis_failed', {
		analysis_mode: mode,
		error_message: errorMessage
	});
}
