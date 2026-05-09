/**
 * Global reactive state — Svelte 5 runes
 * v2: spectrogramFailed flag, SSR-safe localStorage, isReady allows spectrogram failure
 */

function safe(fn, fallback) {
	try { return fn(); } catch { return fallback; }
}

export function createAppState() {
	let currentMode         = $state('audio');
	let audioBlob           = $state(null);
	let imageBlob           = $state(null);
	let spectrogramBlob     = $state(null);
	let spectrogramFailed   = $state(false);
	let isRecording         = $state(false);
	let isAnalyzing         = $state(false);
	let isConvertingAudio   = $state(false);
	let isGeneratingSpectrogram = $state(false);
	let result              = $state(null);
	let error               = $state(null);
	let showSettings        = $state(false);
	let autoPlaySounds      = $state(safe(() => localStorage.getItem('roo-autoplay') === 'true', false));
	let cameraStream        = $state(null);
	let resetId             = $state(0);
	let userNotes           = $state('');

	// isReady: spectrogram optional if generation failed
	const isReady = $derived(() => {
		const hasAudio = !!audioBlob && (!!spectrogramBlob || spectrogramFailed);
		if (currentMode === 'audio') return hasAudio;
		if (currentMode === 'image') return !!imageBlob;
		return hasAudio && !!imageBlob;
	});

	const hasAnyInput = $derived(() => !!audioBlob || !!imageBlob);

	function reset() {
		resetId++;
		if (cameraStream) {
			cameraStream.getTracks().forEach(t => t.stop());
			cameraStream = null;
		}
		audioBlob           = null;
		imageBlob           = null;
		spectrogramBlob     = null;
		spectrogramFailed   = false;
		result              = null;
		error               = null;
		isRecording         = false;
		isAnalyzing         = false;
		isConvertingAudio   = false;
		isGeneratingSpectrogram = false;
		userNotes           = '';
	}

	function setError(msg) { error = msg; }
	function clearError()  { error = null; }
	function setSpectrogramFailed(v) { spectrogramFailed = v; }

	return {
		get currentMode()              { return currentMode; },
		set currentMode(v)             { currentMode = v; },
		get audioBlob()                { return audioBlob; },
		set audioBlob(v)               { audioBlob = v; },
		get imageBlob()                { return imageBlob; },
		set imageBlob(v)               { imageBlob = v; },
		get spectrogramBlob()          { return spectrogramBlob; },
		set spectrogramBlob(v)         { spectrogramBlob = v; },
		get spectrogramFailed()        { return spectrogramFailed; },
		get isRecording()              { return isRecording; },
		set isRecording(v)             { isRecording = v; },
		get isAnalyzing()              { return isAnalyzing; },
		set isAnalyzing(v)             { isAnalyzing = v; },
		get isConvertingAudio()        { return isConvertingAudio; },
		set isConvertingAudio(v)       { isConvertingAudio = v; },
		get isGeneratingSpectrogram()  { return isGeneratingSpectrogram; },
		set isGeneratingSpectrogram(v) { isGeneratingSpectrogram = v; },
		get result()                   { return result; },
		set result(v)                  { result = v; },
		get error()                    { return error; },
		get showSettings()             { return showSettings; },
		set showSettings(v)            { showSettings = v; },
		get autoPlaySounds()           { return autoPlaySounds; },
		set autoPlaySounds(v)          { autoPlaySounds = v; },
		get cameraStream()             { return cameraStream; },
		set cameraStream(v)            { cameraStream = v; },
		get resetId()                  { return resetId; },
		get userNotes()                { return userNotes; },
		set userNotes(v)               { userNotes = v; },
		get isReady()                  { return isReady(); },
		get hasAnyInput()              { return hasAnyInput(); },
		reset,
		setError,
		clearError,
		setSpectrogramFailed,
	};
}

export const appState = createAppState();
