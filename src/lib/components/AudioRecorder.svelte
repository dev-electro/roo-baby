<script>
	import { appState } from '$state/appState.svelte.js';
	import { convertToWav, isSupportedAudioFormat } from '$utils/audioEncoder.js';
	import { generateSpectrogram } from '$utils/spectrogramGenerator.js';
	import { onDestroy } from 'svelte';
	import { recordAudio as trackRecord } from '$utils/analytics.js';
	import Icon from './Icon.svelte';

	let recorder = null;
	let chunks = [];
	let timer = null;
	let elapsed = $state(0);
	let stream = null;
	const MAX = 10;

	async function start() {
		try {
			stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			chunks = [];
			recorder = new MediaRecorder(stream);
			recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
			recorder.onstop = async () => {
				const rid = appState.resetId;
				const raw = new Blob(chunks, { type: recorder.mimeType });
				if (isSupportedAudioFormat(raw.type)) {
					appState.audioBlob = raw;
				} else {
					appState.isConvertingAudio = true;
					try {
						const wav = await convertToWav(raw);
						if (appState.resetId !== rid) return;
						appState.audioBlob = wav;
					}
					catch { appState.setError('Audio conversion failed'); }
					finally { appState.isConvertingAudio = false; }
				}
				stream.getTracks().forEach(t => t.stop()); stream = null;
				if (appState.audioBlob && appState.resetId === rid) {
					appState.isGeneratingSpectrogram = true;
					try {
						const sg = await generateSpectrogram(appState.audioBlob);
						if (appState.resetId !== rid) return;
						appState.spectrogramBlob = sg;
					}
					catch { appState.spectrogramBlob = null; }
					finally { appState.isGeneratingSpectrogram = false; }
				}
			};
			recorder.start();
			appState.isRecording = true;
			elapsed = 0;
			timer = setInterval(() => { elapsed++; if (elapsed >= MAX) stop(); }, 1000);
		} catch { appState.setError('Microphone access needed'); }
	}

	function stop() {
		if (recorder?.state === 'recording') recorder.stop();
		clearInterval(timer); timer = null;
		appState.isRecording = false;
		trackRecord(elapsed);
	}

	function toggle() { appState.isRecording ? stop() : start(); }

	function reset() { appState.audioBlob = null; appState.spectrogramBlob = null; }

	onDestroy(() => {
		clearInterval(timer);
		if (recorder?.state === 'recording') recorder.stop();
		if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
	});

	let prog = $derived(elapsed / MAX);
</script>

<div class="r">
	{#if appState.audioBlob && !appState.isRecording}
		<div class="r-done animate-scale">
			<div class="r-check"><Icon name="check" size={18} color="var(--teal)" /></div>
			<div class="r-done-t">Cry recorded</div>
			<div class="r-done-s">{appState.isGeneratingSpectrogram ? 'Creating spectrogram…' : 'Ready'}</div>
			<button class="r-redo" onclick={reset}><Icon name="refresh" size={14} color="currentColor" /> Re‑record</button>
		</div>
	{:else}
		<div class="r-wrap">
			{#if appState.isRecording}
				<div class="r-rings">
					<div class="r-ring" style="animation-delay:0s"></div>
					<div class="r-ring" style="animation-delay:.7s"></div>
					<div class="r-ring" style="animation-delay:1.4s"></div>
				</div>
			{/if}
			<button class="r-btn" class:rec={appState.isRecording} onclick={toggle}>
				{#if appState.isRecording}
					<Icon name="stop" size={22} color="#fff" />
				{:else}
					<Icon name="mic" size={22} color="#fff" />
				{/if}
			</button>
			{#if appState.isRecording}
				<div class="r-timer">0:{elapsed.toString().padStart(2,'0')}</div>
				<div class="r-progress"><div class="r-progress-fill" style="width:{prog*100}%"></div></div>
				<div class="r-wave">
					{#each Array(11) as _, i}<div class="r-bar" style="animation-delay:{i*.07}s"></div>{/each}
				</div>
			{:else}
				<div class="r-hint">Tap to record your baby's cry</div>
				<div class="r-hint-sub">10 seconds max</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.r{display:flex;flex-direction:column;align-items:center;padding:28px 20px;width:100%}
	.r-wrap{display:flex;flex-direction:column;align-items:center;gap:10px;position:relative}
	.r-btn{
		width:88px;height:88px;border-radius:50%;position:relative;z-index:2;
		background:linear-gradient(145deg,var(--pink),#E04060);
		box-shadow:0 8px 28px rgba(255,107,122,.4),0 0 0 4px rgba(255,107,122,.12);
		font-size:2rem;display:flex;align-items:center;justify-content:center;
		transition:transform .15s;
	}
	.r-btn:hover{transform:scale(1.06)}
	.r-btn:active{transform:scale(.95)}
	.r-btn.rec{background:linear-gradient(145deg,#C03040,#E05060);animation:dot 1s ease-in-out infinite}
	.r-rings{position:absolute;inset:-10px;display:flex;align-items:center;justify-content:center}
	.r-ring{position:absolute;width:100%;height:100%;border-radius:50%;border:2px solid rgba(255,107,122,.3);animation:ring 2.2s ease-out infinite}
	.r-timer{font-family:'Fraunces',serif;font-size:1.2rem;color:var(--pink);font-weight:700}
	.r-progress{width:80px;height:3px;background:var(--card-border);border-radius:2px;overflow:hidden}
	.r-progress-fill{height:100%;background:linear-gradient(90deg,var(--pink),var(--gold));border-radius:2px;transition:width .3s linear}
	.r-wave{display:flex;align-items:flex-end;gap:3px;height:36px}
	.r-bar{width:4px;border-radius:100px;background:linear-gradient(180deg,var(--pink),var(--gold));animation:wave 1s ease-in-out infinite;height:5px}
	.r-hint{font-size:.85rem;color:var(--text-soft);font-weight:600}
	.r-hint-sub{font-size:.7rem;color:var(--text-dim)}
	.r-done{display:flex;flex-direction:column;align-items:center;gap:8px}
	.r-check{font-size:2rem}
	.r-done-t{font-size:1.05rem;font-weight:700;color:var(--text)}
	.r-done-s{font-size:.78rem;color:var(--text-soft)}
	.r-redo{padding:8px 20px;border-radius:100px;font-size:.8rem;font-weight:700;color:var(--text-soft);border:1px solid var(--card-border);background:var(--card-bg);transition:all .15s}
	.r-redo:hover{border-color:var(--pink);color:var(--text)}
</style>