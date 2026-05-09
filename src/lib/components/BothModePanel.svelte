<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';
	import { onDestroy } from 'svelte';

	// Audio state
	let aRec = false;
	let aDur = 0;
	/** @type {BlobPart[]} */
	let aChunks = [];
	let aTimer = null;
	/** @type {MediaStream|null} */
	let aStream = null;
	/** @type {MediaRecorder|null} */
	let aMediaRec = null;

	// Video state
	/** @type {HTMLVideoElement|null} */
	let vEl = null;
	/** @type {HTMLCanvasElement|null} */
	let cEl = null;
	let vActive = false;
	/** @type {MediaStream|null} */
	let vStream = null;

	let error = $state(null);
	let step = $derived(!appState.audioBlob ? 1 : !appState.imageBlob ? 2 : 3);
	let progress = $derived((aDur / 10) * 100);

	// -- AUDIO --
	async function startAudio() {
		error = null;
		try {
			aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
			aMediaRec = new MediaRecorder(aStream);
			aChunks = [];
			aMediaRec.ondataavailable = e => { if (e.data.size > 0) aChunks.push(e.data); };
			aMediaRec.onstop = () => {
				appState.audioBlob = new Blob(aChunks, { type: 'audio/webm' });
				cleanAudio();
				if (!appState.imageBlob) startVideo(); // Auto-advance to video
			};
			aMediaRec.start(200);
			aRec = true;
			aDur = 0;
			aTimer = setInterval(() => {
				aDur++;
				if (aDur >= 10) stopAudio();
			}, 1000);
		} catch (err) {
			const e = /** @type {Error} */ (err);
			error = e.name === 'NotAllowedError' ? 'Mic access denied.' : 'Could not start mic.';
			cleanAudio();
		}
	}

	function stopAudio() { if (aMediaRec && aMediaRec.state !== 'inactive') aMediaRec.stop(); }

	function cleanAudio() {
		aRec = false; clearInterval(aTimer);
		if (aStream) { aStream.getTracks().forEach(t => t.stop()); aStream = null; }
	}

	// -- VIDEO --
	async function startVideo() {
		error = null;
		try {
			vStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
			if (vEl) { vEl.srcObject = vStream; vActive = true; }
		} catch (err) {
			const e = /** @type {Error} */ (err);
			error = e.name === 'NotAllowedError' ? 'Camera access denied.' : 'Could not start camera.';
			cleanVideo();
		}
	}

	function captureVideo() {
		if (!vEl || !cEl || !vActive) return;
		cEl.width = vEl.videoWidth; cEl.height = vEl.videoHeight;
		const ctx = cEl.getContext('2d');
		if (ctx) ctx.drawImage(vEl, 0, 0);
		cEl.toBlob(b => {
			if (b) appState.imageBlob = b;
			cleanVideo();
		}, 'image/jpeg', 0.8);
	}

	function cleanVideo() {
		vActive = false;
		if (vStream) { vStream.getTracks().forEach(t => t.stop()); vStream = null; }
		if (vEl) vEl.srcObject = null;
	}

	// -- SHARED --
	function reset() {
		appState.audioBlob = null; appState.imageBlob = null; error = null;
		cleanAudio(); cleanVideo();
	}

	function upload(e, type) {
		const f = e.target.files[0];
		if (!f) return;
		if (type === 'audio') { appState.audioBlob = f; if (!appState.imageBlob) startVideo(); }
		else { appState.imageBlob = f; }
		error = null;
	}

	onDestroy(() => { cleanAudio(); cleanVideo(); });
</script>

<div class="p-wrap">
	<!-- Stepper -->
	<div class="stepper">
		<div class="step" class:active={step===1} class:done={step>1}>
			<div class="st-num">{step>1 ? '✓' : '1'}</div>
			<span>Audio</span>
		</div>
		<div class="st-line"></div>
		<div class="step" class:active={step===2} class:done={step>2}>
			<div class="st-num">{step>2 ? '✓' : '2'}</div>
			<span>Face</span>
		</div>
	</div>

	<div class="content">
		{#if error}
			<div class="state-block error">
				<Icon name="warning" size={24} color="var(--blush)" />
				<p>{error}</p>
				<button class="btn btn-outline" onclick={() => error = null}>Try Again</button>
			</div>

		{:else if step === 1}
			<div class="rec-block">
				<p class="rec-desc">Step 1: Record your baby's cry</p>
				<button class="rec-btn" class:recording={aRec} onclick={aRec ? stopAudio : startAudio}>
					<div class="rec-btn-inner">
						<Icon name={aRec ? "stop" : "mic"} size={28} color="#fff" />
					</div>
				</button>
				<p class="rec-hint">{aRec ? `Recording... 0:${aDur.toString().padStart(2,'0')}` : 'Tap to record'}</p>
				
				{#if aRec}
					<div class="progress-wrap"><div class="progress-bar" style="width:{progress}%"></div></div>
				{:else}
					<div class="or-divider"><span>or</span></div>
					<label class="upload-btn">
						<Icon name="upload" size={16} color="currentColor" /> Upload audio
						<input type="file" accept="audio/*" onchange={e=>upload(e,'audio')} hidden />
					</label>
				{/if}
			</div>

		{:else if step === 2}
			<div class="cam-block">
				<p class="rec-desc">Step 2: Capture baby's face</p>
				<!-- svelte-ignore a11y_media_has_caption -->
				<video bind:this={vEl} autoplay playsinline class="video-feed" class:active={vActive}></video>
				<canvas bind:this={cEl} hidden></canvas>
				
				{#if !vActive}
					<div class="cam-placeholder"><Icon name="camera" size={32} color="var(--border)" /></div>
				{/if}

				<div class="cam-controls">
					{#if vActive}
						<button class="cap-btn" onclick={captureVideo}><div class="cap-btn-inner"></div></button>
					{:else}
						<button class="btn btn-primary" onclick={startVideo}>Open Camera</button>
						<div class="or-divider"><span>or</span></div>
						<label class="upload-btn">
							<Icon name="upload" size={16} color="currentColor" /> Upload photo
							<input type="file" accept="image/*" onchange={e=>upload(e,'image')} hidden />
						</label>
					{/if}
				</div>
			</div>

		{:else}
			<div class="state-block success">
				<div class="icon-circle success-bg"><Icon name="check" size={24} color="var(--primary)" /></div>
				<p>Ready for analysis</p>
				<button class="btn btn-outline" onclick={reset}>Start Over</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.p-wrap { width:100%; display:flex; flex-direction:column; }
	.stepper {
		display:flex; align-items:center; justify-content:center; gap:8px;
		padding:16px; border-bottom:1px solid var(--border); background:var(--surface-2);
	}
	.step { display:flex; align-items:center; gap:6px; font-size:0.8rem; font-weight:600; color:var(--text-dim); transition:all 0.2s; }
	.st-num {
		width:20px; height:20px; border-radius:50%; background:var(--surface); border:1px solid var(--border);
		display:flex; align-items:center; justify-content:center; font-size:0.65rem;
	}
	.step.active { color:var(--text); }
	.step.active .st-num { background:var(--primary); border-color:var(--primary); color:var(--surface); }
	.step.done { color:var(--text); }
	.step.done .st-num { background:var(--surface); border-color:var(--primary); color:var(--primary); }
	.st-line { width:24px; height:1px; background:var(--border); }

	.content { padding:24px; display:flex; justify-content:center; }

	.state-block { display:flex; flex-direction:column; align-items:center; gap:16px; text-align:center; }
	.state-block p { font-size:0.95rem; font-weight:500; color:var(--text); }
	.error { color:var(--blush); }

	.icon-circle { width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
	.success-bg { background:var(--primary-soft); border:1px solid var(--primary-glow); }

	.btn { padding:10px 20px; border-radius:var(--r-sm); font-size:0.85rem; font-weight:600; transition:all 0.2s; }
	.btn-outline { border:1px solid var(--border); color:var(--text); }
	.btn-outline:hover { background:var(--surface-2); border-color:var(--text-dim); }
	.btn-primary { background:var(--text); color:var(--surface); }
	.btn-primary:hover { opacity:0.9; }

	/* Audio */
	.rec-block { display:flex; flex-direction:column; align-items:center; gap:16px; width:100%; max-width:320px; }
	.rec-desc { font-size:0.9rem; font-weight:600; color:var(--text); margin-bottom:8px; }
	.rec-btn {
		width:88px; height:88px; border-radius:50%; background:var(--surface-2); border:1px solid var(--border);
		display:flex; align-items:center; justify-content:center; transition:all 0.2s; position:relative;
	}
	.rec-btn-inner { width:72px; height:72px; border-radius:50%; background:var(--text); display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
	.rec-btn:hover .rec-btn-inner { transform:scale(1.05); }
	.rec-btn.recording .rec-btn-inner { background:var(--red); border-radius:var(--r-md); }
	.rec-btn.recording::before { content:''; position:absolute; inset:-8px; border-radius:50%; border:2px solid var(--red); animation:pulse-ring 1.5s infinite; }
	.rec-hint { font-size:0.9rem; color:var(--text-soft); font-weight:500; }
	.progress-wrap { width:100%; height:4px; background:var(--border); border-radius:2px; overflow:hidden; }
	.progress-bar { height:100%; background:var(--red); transition:width 1s linear; }

	/* Video */
	.cam-block { display:flex; flex-direction:column; align-items:center; gap:16px; width:100%; max-width:320px; position:relative; }
	.video-feed { width:100%; aspect-ratio:3/4; object-fit:cover; border-radius:var(--r-md); background:var(--surface-2); display:none; border:1px solid var(--border); }
	.video-feed.active { display:block; }
	.cam-placeholder { width:100%; aspect-ratio:3/4; border-radius:var(--r-md); background:var(--surface-2); border:1px dashed var(--border); display:flex; align-items:center; justify-content:center; }
	.cam-controls { display:flex; flex-direction:column; gap:12px; width:100%; }
	.cap-btn { width:64px; height:64px; border-radius:50%; border:3px solid var(--text); background:transparent; display:flex; align-items:center; justify-content:center; margin:0 auto; transition:transform 0.1s; }
	.cap-btn:active { transform:scale(0.95); }
	.cap-btn-inner { width:50px; height:50px; border-radius:50%; background:var(--text); }

	/* Upload / OR */
	.or-divider { width:100%; text-align:center; position:relative; margin:4px 0; }
	.or-divider::before { content:''; position:absolute; top:50%; left:0; right:0; height:1px; background:var(--border); z-index:0; }
	.or-divider span { background:var(--surface); padding:0 12px; font-size:0.8rem; color:var(--text-dim); position:relative; z-index:1; font-weight:500; }
	.upload-btn {
		display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:12px;
		border-radius:var(--r-sm); border:1px dashed var(--text-dim); color:var(--text-soft);
		font-size:0.85rem; font-weight:600; cursor:pointer; transition:all 0.2s;
	}
	.upload-btn:hover { border-color:var(--text); color:var(--text); background:var(--surface-2); }
</style>
