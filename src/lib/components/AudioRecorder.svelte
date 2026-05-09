<script>
	import { appState } from '$state/appState.svelte.js';
	import { convertToWav, isSupportedAudioFormat } from '$utils/audioEncoder.js';
	import { generateSpectrogram } from '$utils/spectrogramGenerator.js';
	import { onDestroy } from 'svelte';
	import { recordAudio as trackRecord } from '$utils/analytics.js';
	import Icon from './Icon.svelte';

	let recorder = null;
	let chunks   = [];
	let timer    = null;
	let elapsed  = $state(0);
	let stream   = null;
	let micDenied = $state(false);
	const MAX    = 10;

	async function start() {
		micDenied = false;
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
					} catch { appState.setError('Audio conversion failed'); }
					finally  { appState.isConvertingAudio = false; }
				}
				stream.getTracks().forEach(t => t.stop()); stream = null;
				if (appState.audioBlob && appState.resetId === rid) {
					appState.isGeneratingSpectrogram = true;
					try {
						const sg = await generateSpectrogram(appState.audioBlob);
						if (appState.resetId !== rid) return;
						appState.spectrogramBlob = sg;
						appState.setSpectrogramFailed(false);
					} catch {
						appState.spectrogramBlob = null;
						appState.setSpectrogramFailed(true); // unlock analyze button
					} finally { appState.isGeneratingSpectrogram = false; }
				}
			};
			recorder.start();
			appState.isRecording = true;
			elapsed = 0;
			timer = setInterval(() => { elapsed++; if (elapsed >= MAX) stop(); }, 1000);
		} catch (err) {
			if (err?.name === 'NotAllowedError') micDenied = true;
			else appState.setError('Microphone access needed');
		}
	}

	function stop() {
		if (recorder?.state === 'recording') recorder.stop();
		clearInterval(timer); timer = null;
		appState.isRecording = false;
		trackRecord(elapsed);
	}

	function toggle() { appState.isRecording ? stop() : start(); }
	function reset()  { appState.audioBlob = null; appState.spectrogramBlob = null; appState.setSpectrogramFailed(false); }

	onDestroy(() => {
		clearInterval(timer);
		if (recorder?.state === 'recording') recorder.stop();
		if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
	});

	let prog = $derived(elapsed / MAX);
	let barCount = 16;
</script>

<div class="r">
	{#if micDenied}
		<div class="r-denied animate-up">
			<div class="r-denied-icon">🎙️</div>
			<strong class="r-denied-title">Microphone blocked</strong>
			<p class="r-denied-sub">Allow microphone access in browser settings, then reload.</p>
			<button class="r-retry" onclick={() => { micDenied = false; start(); }}>
				<Icon name="refresh" size={14} color="currentColor" /> Try again
			</button>
		</div>
	{:else if appState.audioBlob && !appState.isRecording}
		<div class="r-done animate-in">
			<div class="r-done-check">
				<Icon name="check" size={22} color="var(--mint)" />
			</div>
			<div class="r-done-t">Cry recorded</div>
			<div class="r-done-s">
				{#if appState.isGeneratingSpectrogram}
					Generating spectrogram…
				{:else if appState.spectrogramFailed}
					⚠️ Spectrogram skipped — analysis will still work
				{:else}
					Ready to analyze
				{/if}
			</div>
			<button class="r-redo" onclick={reset}>
				<Icon name="refresh" size={14} color="currentColor" /> Re-record
			</button>
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

			<button class="r-btn" class:rec={appState.isRecording} onclick={toggle} aria-label={appState.isRecording ? 'Stop recording' : 'Start recording'}>
				<Icon name={appState.isRecording ? 'stop' : 'mic'} size={26} color="#fff" />
			</button>

			{#if appState.isRecording}
				<div class="r-timer">0:{elapsed.toString().padStart(2,'0')}</div>
				<div class="r-progress"><div class="r-progress-fill" style="width:{prog*100}%"></div></div>
				<div class="r-wave">
					{#each Array(barCount) as _, i}
						<div class="r-bar" style="animation-delay:{i * 0.06}s; animation-duration:{0.7 + (i % 4) * 0.15}s"></div>
					{/each}
				</div>
			{:else}
				<div class="r-hint">Tap to record your baby's cry</div>
				<div class="r-hint-sub">10 seconds maximum</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.r { display:flex; flex-direction:column; align-items:center; padding:36px 20px; width:100%; }

	/* Wrap */
	.r-wrap { display:flex; flex-direction:column; align-items:center; gap:14px; position:relative; }

	/* Button */
	.r-btn {
		width:96px; height:96px; border-radius:50%; position:relative; z-index:2;
		background: linear-gradient(145deg, var(--lavender), var(--indigo));
		box-shadow: 0 8px 32px var(--lav-glow), 0 0 0 6px rgba(167,139,250,.1);
		display:flex; align-items:center; justify-content:center;
		transition: transform .15s, box-shadow .2s;
	}
	.r-btn:hover  { transform:scale(1.06); box-shadow:0 12px 40px var(--lav-glow), 0 0 0 8px rgba(167,139,250,.15); }
	.r-btn:active { transform:scale(.95); }
	.r-btn.rec    {
		background: linear-gradient(145deg, var(--blush), #E0405A);
		box-shadow: 0 8px 32px var(--blush-glow), 0 0 0 6px rgba(253,164,175,.1);
		animation: breathe 1.2s ease-in-out infinite;
	}

	/* Rings */
	.r-rings { position:absolute; inset:-14px; display:flex; align-items:center; justify-content:center; }
	.r-ring  {
		position:absolute; width:calc(100% + 28px); height:calc(100% + 28px);
		border-radius:50%; border:2px solid rgba(253,164,175,.4);
		animation: ping 2.4s ease-out infinite;
	}

	/* Timer */
	.r-timer { font-family:'Fraunces',serif; font-size:1.4rem; color:var(--blush); font-weight:700; }

	/* Progress */
	.r-progress { width:96px; height:3px; background:var(--border); border-radius:2px; overflow:hidden; }
	.r-progress-fill { height:100%; background:linear-gradient(90deg,var(--blush),var(--amber)); border-radius:2px; transition:width .3s linear; }

	/* Waveform */
	.r-wave { display:flex; align-items:flex-end; gap:3px; height:52px; }
	.r-bar  {
		width:4px; border-radius:100px;
		background: linear-gradient(180deg, var(--lavender), var(--mint));
		animation: wave .8s ease-in-out infinite;
		transform-origin: bottom;
		min-height:4px;
	}

	/* Hints */
	.r-hint     { font-size:.92rem; color:var(--text-soft); font-weight:700; }
	.r-hint-sub { font-size:.72rem; color:var(--text-dim); }

	/* Done state */
	.r-done { display:flex; flex-direction:column; align-items:center; gap:10px; }
	.r-done-check {
		width:56px; height:56px; border-radius:50%;
		background:var(--mint-soft); border:2px solid var(--mint);
		display:flex; align-items:center; justify-content:center;
		box-shadow:0 0 24px var(--mint-glow);
	}
	.r-done-t   { font-size:1.1rem; font-weight:800; color:var(--text); }
	.r-done-s   { font-size:.78rem; color:var(--text-soft); }
	.r-redo     {
		padding:8px 22px; border-radius:var(--r-pill);
		font-size:.8rem; font-weight:700; color:var(--text-soft);
		border:1px solid var(--border); background:var(--surface);
		transition:all .15s; display:inline-flex; align-items:center; gap:5px;
	}
	.r-redo:hover { border-color:var(--lavender); color:var(--text); }

	/* Denied */
	.r-denied {
		display:flex; flex-direction:column; align-items:center; gap:10px;
		padding:24px; background:var(--blush-soft); border:1px solid rgba(253,164,175,.2);
		border-radius:var(--r-lg); text-align:center; max-width:280px;
	}
	.r-denied-icon  { font-size:2.2rem; }
	.r-denied-title { font-size:.95rem; font-weight:800; color:var(--blush); }
	.r-denied-sub   { font-size:.78rem; color:var(--text-soft); line-height:1.5; }
	.r-retry {
		padding:8px 20px; border-radius:var(--r-pill);
		font-size:.8rem; font-weight:700; color:var(--blush);
		border:1px solid rgba(253,164,175,.3); background:rgba(253,164,175,.1);
		transition:all .15s; display:inline-flex; align-items:center; gap:5px;
	}
	.r-retry:hover { background:rgba(253,164,175,.2); }
</style>