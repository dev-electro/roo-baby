<script>
	import { appState } from '$state/appState.svelte.js';
	import { convertToWav, isSupportedAudioFormat } from '$utils/audioEncoder.js';
	import { onDestroy } from 'svelte';
	import Icon from './Icon.svelte';

	/** @type {MediaRecorder|null} */ let recorder = null;
	/** @type {Blob[]} */            let chunks   = [];
	/** @type {number|null} */       let timer    = null;
	/** @type {MediaStream|null} */  let stream   = null;
	/** @type {HTMLInputElement|undefined} */ let fileEl = $state(undefined);

	let recording = $state(false);
	let secs      = $state(0);
	let denied    = $state(false);
	let hasAudio  = $derived(!!appState.audioBlob);
	let fmtTime   = $derived(`${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`);

	async function start() {
		denied = false;
		try { stream = await navigator.mediaDevices.getUserMedia({ audio:true }); }
		catch { denied = true; return; }
		chunks = [];
		recorder = new MediaRecorder(stream);
		recorder.ondataavailable = e => chunks.push(e.data);
		recorder.onstop = async () => {
			const raw = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' });
			let blob = raw;
			if (!isSupportedAudioFormat(raw.type)) {
				appState.isConvertingAudio = true;
				try { blob = await convertToWav(raw); } catch { blob = raw; }
				appState.isConvertingAudio = false;
			}
			appState.audioBlob = blob;
			await appState.processAudio(blob);
			stream?.getTracks().forEach(t => t.stop()); stream = null;
		};
		recorder.start(); secs = 0; recording = true;
		timer = setInterval(() => { secs++; if(secs >= 10) stop(); }, 1000);
	}

	function stop() {
		if(timer){ clearInterval(timer); timer = null; }
		if(recorder?.state === 'recording') recorder.stop();
		recording = false;
	}

	function clear() {
		appState.audioBlob = null;
		appState.spectrogramBlob = null;
		appState.setSpectrogramFailed(false);
		secs = 0;
	}

	function pickFile() { fileEl?.click(); }

	async function uploadFile(/** @type {Event} */ e) {
		const f = /** @type {HTMLInputElement} */(e.target).files?.[0];
		if (!f) return;
		appState.isConvertingAudio = true;
		let blob = /** @type {Blob} */(f);
		if (!isSupportedAudioFormat(f.type)) {
			try { blob = await convertToWav(f); } catch { blob = f; }
		}
		appState.isConvertingAudio = false;
		appState.audioBlob = blob;
		await appState.processAudio(blob);
		if (fileEl) fileEl.value = '';
	}

	onDestroy(() => { if(recording) stop(); });
</script>

<div class="ar">
	{#if denied}
		<!-- Permission denied state -->
		<div class="ar-blocked">
			<div class="state-icon err">
				<Icon name="warning" size={28} color="var(--error)" />
			</div>
			<p class="state-title">Microphone blocked</p>
			<p class="state-desc">Allow microphone access in your browser settings, then try again.</p>
			<div class="ar-denied-actions">
				<button class="btn-secondary" onclick={() => { denied = false; start(); }}>
					<Icon name="refresh" size={16} color="currentColor" /> Try again
				</button>
				<button class="btn-secondary" onclick={pickFile}>
					<Icon name="upload" size={16} color="currentColor" /> Upload file
				</button>
			</div>
		</div>

	{:else if hasAudio}
		<!-- Captured state -->
		<div class="ar-captured">
			<div class="ar-captured-top">
				<div class="state-icon ok">
					<Icon name="check" size={24} color="var(--success)" />
				</div>
				<div class="ar-captured-info">
					<p class="state-title">Audio captured</p>
					<p class="state-desc">
						{#if appState.isConvertingAudio}Converting…
						{:else if appState.isGeneratingSpectrogram}Generating spectrogram…
						{:else}Ready to analyze · {fmtTime}
						{/if}
					</p>
				</div>
				<button class="ar-del" onclick={clear} aria-label="Remove recording">
					<Icon name="close" size={15} color="currentColor" />
				</button>
			</div>
			<!-- Spectrogram preview or waveform bars -->
			<div class="ar-wave static" aria-hidden="true">
				{#if appState.spectrogramBlob}
					<img
						src={URL.createObjectURL(appState.spectrogramBlob)}
						alt="Mel spectrogram preview"
						style="height:100%; width:100%; object-fit:contain; border-radius:4px;"
					/>
				{:else}
					{#each Array(32) as _,i}
						<div class="ar-bar" style="height:{12 + Math.abs(Math.sin(i*0.9+1))*18}px;opacity:{0.4+i/80}"></div>
					{/each}
				{/if}
			</div>
		</div>

	{:else if recording}
		<!-- Recording state -->
		<div class="ar-rec-state">
			<div class="ar-timer">
				<div class="rec-dot"></div>
				<span class="rec-time">{fmtTime}</span>
				<span class="rec-limit">/ 0:10</span>
				<div class="rec-progress-track">
					<div class="rec-progress-fill" style="width:{secs * 10}%"></div>
				</div>
			</div>
			<!-- Live waveform -->
			<div class="ar-wave live" aria-hidden="true">
				{#each Array(24) as _,i}
					<div class="ar-bar-live" style="animation-delay:{i*.08}s"></div>
				{/each}
			</div>
			<button class="ar-stop" onclick={stop}>
				<Icon name="stop" size={18} color="currentColor" />
				Stop Recording
			</button>
		</div>

	{:else}
		<!-- Idle state -->
		<div class="ar-idle">
			<button class="ar-mic-btn" onclick={start} aria-label="Start recording">
				<div class="ar-ping"></div>
				<div class="ar-ping" style="animation-delay:.8s"></div>
				<Icon name="mic" size={32} color="#fff" />
			</button>
			<p class="ar-idle-cta">Tap to Record Cry</p>
			<p class="ar-idle-sub">Up to 10 seconds · Stays on device</p>
			<div class="ar-divider"><span>or</span></div>
			<button class="ar-upload-btn" onclick={pickFile}>
				<Icon name="upload" size={16} color="currentColor" />
				Upload audio file
			</button>
			<p class="ar-upload-hint">MP3, WAV, M4A, WebM supported</p>
		</div>
	{/if}
</div>

<!-- Persistent hidden file input — always in DOM, never inside #if blocks -->
<input
	bind:this={fileEl}
	type="file"
	accept="audio/*"
	onchange={uploadFile}
	style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;top:0;left:0"
	tabindex="-1"
	aria-hidden="true"
/>

<style>
	.ar { padding:20px; width:100%; position:relative; }

	/* ── Shared state styles ── */
	.state-icon {
		width:52px; height:52px; border-radius:var(--r-lg);
		display:flex; align-items:center; justify-content:center; flex-shrink:0;
	}
	.state-icon.err { background:var(--error-bg);   border:1px solid var(--error-border); }
	.state-icon.ok  { background:var(--success-bg); border:1px solid var(--success-border); }
	.state-title { font-size:1rem;  font-weight:800; color:var(--text); }
	.state-desc  { font-size:.8rem; color:var(--text-2); margin-top:4px; line-height:1.5; }

	/* ── Blocked ── */
	.ar-blocked {
		display:flex; flex-direction:column; align-items:center; gap:10px;
		text-align:center; padding:24px 12px;
	}
	.ar-denied-actions { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-top:4px; }

	/* ── Captured ── */
	.ar-captured { display:flex; flex-direction:column; gap:14px; }
	.ar-captured-top { display:flex; align-items:center; gap:12px; }
	.ar-captured-info { flex:1; }
	.ar-del {
		width:40px; height:40px; border-radius:var(--r-md); flex-shrink:0;
		display:flex; align-items:center; justify-content:center;
		color:var(--text-3); transition:background .12s, color .12s;
	}
	.ar-del:hover { background:var(--error-bg); color:var(--error); }

	/* Static waveform / spectrogram preview */
	.ar-wave.static {
		display:flex; align-items:center; gap:3px; height:56px;
		border-radius:var(--r-md); overflow:hidden;
		background:var(--surface-2); padding:4px;
	}
	.ar-bar {
		flex:1; background:var(--success); border-radius:2px; opacity:.45;
		min-height:3px; max-height:36px;
	}

	/* ── Recording ── */
	.ar-rec-state { display:flex; flex-direction:column; gap:16px; }
	.ar-timer { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
	.rec-dot {
		width:10px; height:10px; border-radius:50%;
		background:var(--error); animation:pulse 1s ease-in-out infinite; flex-shrink:0;
	}
	.rec-time  { font-size:1.5rem; font-weight:800; color:var(--text); font-variant-numeric:tabular-nums; }
	.rec-limit { font-size:.78rem; color:var(--text-3); }
	.rec-progress-track {
		flex:1; height:4px; background:var(--surface-3); border-radius:2px; overflow:hidden; min-width:60px;
	}
	.rec-progress-fill { height:100%; background:var(--error); transition:width 1s linear; border-radius:2px; }

	.ar-wave.live { display:flex; align-items:flex-end; gap:3px; height:48px; }
	.ar-bar-live {
		flex:1; border-radius:2px; min-height:6px;
		background:var(--error); opacity:.65;
		animation:wave .65s ease-in-out infinite;
		transform-origin:bottom;
	}

	.ar-stop {
		display:flex; align-items:center; justify-content:center; gap:8px;
		width:100%; height:56px; border-radius:var(--r-lg);
		font-size:1rem; font-weight:800;
		background:var(--error-bg); color:var(--error);
		border:1px solid var(--error-border);
		transition:background .12s;
	}
	.ar-stop:hover { background:rgba(239,68,68,.18); }

	/* ── Idle ── */
	.ar-idle {
		display:flex; flex-direction:column; align-items:center; gap:12px;
		padding:24px 0 16px;
	}
	.ar-mic-btn {
		width:88px; height:88px; border-radius:50%;
		background:var(--accent); position:relative;
		display:flex; align-items:center; justify-content:center;
		transition:transform .15s, box-shadow .15s;
		box-shadow:0 8px 28px var(--accent-glow);
	}
	.ar-mic-btn:hover  { transform:scale(1.06); }
	.ar-mic-btn:active { transform:scale(.95); }
	.ar-ping {
		position:absolute; inset:-8px; border-radius:50%;
		border:2px solid var(--accent-border);
		animation:ping 2.2s ease-out infinite;
	}
	.ar-idle-cta  { font-size:1rem; font-weight:800; color:var(--text); }
	.ar-idle-sub  { font-size:.72rem; color:var(--text-3); }

	/* Divider */
	.ar-divider {
		display:flex; align-items:center; width:100%; gap:10px;
		margin:2px 0;
	}
	.ar-divider::before, .ar-divider::after {
		content:''; flex:1; height:1px; background:var(--border);
	}
	.ar-divider span { font-size:.65rem; font-weight:800; color:var(--text-3); letter-spacing:.06em; }

	/* Upload button */
	.ar-upload-btn {
		display:inline-flex; align-items:center; gap:8px;
		padding:11px 24px; border-radius:var(--r-pill);
		font-size:.85rem; font-weight:700;
		background:var(--surface-2); color:var(--text-2);
		border:1px solid var(--border);
		transition:all .15s; cursor:pointer;
	}
	.ar-upload-btn:hover { background:var(--surface-3); border-color:var(--accent-border); color:var(--text); }
	.ar-upload-hint { font-size:.62rem; color:var(--text-3); }

	.btn-secondary {
		display:flex; align-items:center; gap:8px;
		padding:10px 20px; border-radius:var(--r-pill);
		font-size:.85rem; font-weight:700;
		background:var(--surface-2); color:var(--text-2);
		border:1px solid var(--border);
		cursor:pointer; transition:all .15s;
	}
	.btn-secondary:hover { border-color:var(--accent); color:var(--text); background:var(--surface-3); }
</style>