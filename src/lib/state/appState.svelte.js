/**
 * Global reactive state using Svelte 5 runes
 */

export function createAppState() {
	let currentMode = $state('audio');
	let audioBlob = $state(null);
	let imageBlob = $state(null);
	let isRecording = $state(false);
	let isAnalyzing = $state(false);
	let isConvertingAudio = $state(false);
	let result = $state(null);
	let error = $state(null);
	let showSettings = $state(false);
	let cameraStream = $state(null);
	
	const isReady = $derived(() => {
		if (currentMode === 'audio') return !!audioBlob;
		if (currentMode === 'image') return !!imageBlob;
		return !!audioBlob && !!imageBlob;
	});
	
	const hasAnyInput = $derived(() => {
		return !!audioBlob || !!imageBlob;
	});
	
	function reset() {
		audioBlob = null;
		imageBlob = null;
		result = null;
		error = null;
		isRecording = false;
		isAnalyzing = false;
		isConvertingAudio = false;
		if (cameraStream) {
			cameraStream.getTracks().forEach(t => t.stop());
			cameraStream = null;
		}
	}
	
	function setError(msg) {
		error = msg;
	}
	
	function clearError() {
		error = null;
	}
	
	return {
		get currentMode() { return currentMode; },
		set currentMode(v) { currentMode = v; },
		get audioBlob() { return audioBlob; },
		set audioBlob(v) { audioBlob = v; },
		get imageBlob() { return imageBlob; },
		set imageBlob(v) { imageBlob = v; },
		get isRecording() { return isRecording; },
		set isRecording(v) { isRecording = v; },
		get isAnalyzing() { return isAnalyzing; },
		set isAnalyzing(v) { isAnalyzing = v; },
		get isConvertingAudio() { return isConvertingAudio; },
		set isConvertingAudio(v) { isConvertingAudio = v; },
		get result() { return result; },
		set result(v) { result = v; },
		get error() { return error; },
		get showSettings() { return showSettings; },
		set showSettings(v) { showSettings = v; },
		get cameraStream() { return cameraStream; },
		set cameraStream(v) { cameraStream = v; },
		get isReady() { return isReady(); },
		get hasAnyInput() { return hasAnyInput(); },
		reset,
		setError,
		clearError
	};
}

// Singleton instance
export const appState = createAppState();
