<script>
	import { appState } from '$state/appState.svelte.js';
	import { onDestroy } from 'svelte';
	import { trackInputCapture } from '$utils/analytics.js';
	import Icon from './Icon.svelte';

	/** @type {HTMLVideoElement|undefined} */  let videoEl  = $state(undefined);
	/** @type {HTMLCanvasElement|undefined} */ let canvasEl = $state(undefined);

	let preview  = $state('');
	let fallback = $state(false);
	let active   = $state(false);
	let facing   = $state('user');
	let busy     = $state(false);
	let asked    = $state(false);
	let denied   = $state(false);

	// 🔑 Core fix: when resetId changes (mode switch or manual reset),
	// stop any running camera stream and reset all local UI state
	// so the component returns to the idle "Open Camera" screen.
	$effect(() => {
		const _rid = appState.resetId; // reactive dependency
		// Only react to external resets (not our own internal operations)
		return () => {
			// Cleanup: stop stream when this effect re-runs (resetId changed)
			if (active || busy) {
				appState.cameraStream?.getTracks().forEach(t => t.stop());
				appState.cameraStream = null;
				active = false; busy = false;
			}
			if (preview) { URL.revokeObjectURL(preview); preview = ''; }
			asked = false; fallback = false; denied = false;
		};
	});

	function req() { asked = true; start(); }

	async function start() {
		if (active || busy) return;
		if (appState.imageBlob) return;
		busy = true; denied = false; stopStream();
		try {
			const s = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: facing, width:{ ideal:1280 }, height:{ ideal:960 } }
			});
			appState.cameraStream = s;
			active = true; busy = false;
			if (videoEl) { videoEl.srcObject = s; try { await videoEl.play(); } catch {} }
		} catch (/** @type {any} */ err) {
			busy = false;
			if (err?.name === 'NotAllowedError') denied = true;
			else fallback = true;
		}
	}

	async function flip() {
		facing = facing === 'user' ? 'environment' : 'user';
		if (active) { active = false; await start(); }
	}

	function capture() {
		if (!videoEl || !canvasEl) return;
		const rid = appState.resetId;
		canvasEl.width  = videoEl.videoWidth  || 1280;
		canvasEl.height = videoEl.videoHeight || 960;
		canvasEl.getContext('2d')?.drawImage(videoEl, 0, 0);
		canvasEl.toBlob(b => {
			if (b && appState.resetId === rid) {
				if (preview) URL.revokeObjectURL(preview);
				preview = URL.createObjectURL(b);
				appState.imageBlob = b;
				stopStream();
				trackInputCapture('image', 'camera');
			}
		}, 'image/jpeg', .92);
	}

	/** @type {HTMLInputElement|undefined} */ let fileEl = $state(undefined);

	function pickFile() { fileEl?.click(); }

	function upload(/** @type {Event} */ e) {
		const f = /** @type {HTMLInputElement} */(e.target).files?.[0];
		if (!f) return;
		if (preview) URL.revokeObjectURL(preview);
		preview = URL.createObjectURL(f);
		appState.imageBlob = f;
		fallback = false; asked = true;
		trackInputCapture('image', 'upload');
		// Reset input so same file can be re-selected
		if (fileEl) fileEl.value = '';
	}

	function retake() {
		if (preview) URL.revokeObjectURL(preview);
		preview = ''; appState.imageBlob = null;
		fallback = false; active = false; asked = false; denied = false;
	}

	function stopStream() {
		appState.cameraStream?.getTracks().forEach(t => t.stop());
		appState.cameraStream = null; active = false;
	}

	onDestroy(() => { stopStream(); if (preview) URL.revokeObjectURL(preview); });
</script>

<div class="cc" class:cc--live={asked && active && !appState.imageBlob}>
	{#if appState.imageBlob && preview}
		<!-- ── PREVIEW — full-width captured image ── -->
		<div class="cc-preview animate-in">
			<img src={preview} alt="Captured baby face" class="cc-img" />
			<div class="cc-preview-bar">
				<div class="cc-captured-badge">
					<Icon name="check" size={14} color="var(--success)" />
					<span>Photo captured</span>
				</div>
				<div class="cc-preview-actions">
					<button class="cc-action-btn" onclick={retake}>
						<Icon name="refresh" size={16} color="currentColor" />
						Retake
					</button>
					<button class="cc-action-btn cc-accent" onclick={pickFile}>
						<Icon name="upload" size={16} color="currentColor" />
						Replace
					</button>
				</div>
			</div>
		</div>

	{:else if denied}
		<!-- ── PERMISSION DENIED ── -->
		<div class="cc-state">
			<div class="cc-state-icon err">
				<Icon name="camera" size={26} color="var(--error)" />
			</div>
			<p class="cc-state-title">Camera access blocked</p>
			<p class="cc-state-sub">Allow camera in browser settings, or upload a photo instead.</p>
			<div class="cc-state-actions">
				<button class="btn-secondary" onclick={() => { denied = false; req(); }}>
					<Icon name="refresh" size={16} color="currentColor" /> Try again
				</button>
				<button class="btn-primary" onclick={pickFile}>
					<Icon name="upload" size={16} color="currentColor" /> Upload photo
				</button>
			</div>
		</div>

	{:else if fallback}
		<!-- ── UPLOAD FALLBACK ── -->
		<div class="cc-dropzone" role="button" tabindex="0" onclick={pickFile} onkeydown={e => e.key==='Enter' && pickFile()}>
			<div class="cc-drop-icon">
				<Icon name="upload" size={30} color="var(--accent)" />
			</div>
			<p class="cc-drop-title">Upload a photo</p>
			<p class="cc-drop-sub">Clear, well-lit photo of baby's face · JPG or PNG</p>
			<span class="cc-drop-cta">Choose photo</span>
		</div>
		<button class="btn-ghost" style="align-self:center" onclick={() => { fallback = false; req(); }}>
			<Icon name="camera" size={15} color="currentColor" /> Try camera instead
		</button>

	{:else if !asked}
		<!-- ── IDLE / ASK STATE ── -->
		<div class="cc-ask">
			<div class="cc-ask-icon">
				<Icon name="camera" size={32} color="var(--accent)" />
			</div>
			<p class="cc-ask-title">Capture Baby's Face</p>
			<p class="cc-ask-sub">Point camera at baby for emotional cues — works best in good light</p>
			<button class="cc-open-btn" onclick={req}>
				<Icon name="camera" size={20} color="#fff" />
				Open Camera
			</button>
			<button class="btn-ghost" style="align-self:center; cursor:pointer" onclick={pickFile}>
				<Icon name="upload" size={15} color="currentColor" /> Upload a photo instead
			</button>
		</div>

	{:else}
		<!-- ── LIVE VIEWFINDER ── -->
		<div class="cc-viewfinder">
			<!-- Video -->
			{#if busy}
				<div class="cc-loading">
					<div class="cc-spinner"></div>
					<p>Starting camera…</p>
				</div>
			{/if}
			<video
				bind:this={videoEl}
				autoplay playsinline muted
				class="cc-video"
				class:mirror={facing === 'user'}
			></video>

			<!-- Face guide oval -->
			<div class="cc-guide" aria-hidden="true">
				<svg viewBox="0 0 200 240" class="cc-oval">
					<ellipse cx="100" cy="120" rx="74" ry="94"
						fill="none"
						stroke="rgba(255,255,255,.35)"
						stroke-width="2"
						stroke-dasharray="8 5" />
				</svg>
				<p class="cc-guide-label">Position face here</p>
			</div>

			<!-- Top overlay: flip -->
			<div class="cc-top-bar">
				<button class="cc-flip-btn" onclick={flip} aria-label="Flip camera">
					<Icon name="flip-camera" size={18} color="#fff" />
				</button>
				<button class="cc-flip-btn" onclick={pickFile} title="Upload instead" aria-label="Upload photo instead">
					<Icon name="upload" size={18} color="#fff" />
				</button>
			</div>

			<!-- Bottom overlay: shutter -->
			<div class="cc-bottom-bar">
				<button class="cc-shutter" onclick={capture} aria-label="Take photo">
					<div class="cc-shutter-inner"></div>
				</button>
			</div>
		</div>
	{/if}

	<canvas bind:this={canvasEl} style="display:none"></canvas>
	<!-- Single persistent hidden file input — NEVER inside #if blocks -->
	<!-- This prevents browser focus-restoration from auto-opening the dialog on tab switch -->
	<input
		bind:this={fileEl}
		type="file"
		accept="image/jpeg,image/png,image/webp"
		onchange={upload}
		style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;top:0;left:0"
		tabindex="-1"
		aria-hidden="true"
	/>
</div>

<style>
	.cc {
		width: 100%;
		display: flex; flex-direction: column; gap: 10px;
	}

	/* ── PREVIEW ── */
	.cc-preview { display: flex; flex-direction: column; width: 100%; }
	.cc-img {
		width: 100%;
		max-height: 72vw; /* wide preview */
		object-fit: cover;
		border-radius: var(--r-xl) var(--r-xl) 0 0;
		display: block;
	}
	@media(min-width: 480px) { .cc-img { max-height: 340px; } }

	.cc-preview-bar {
		display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;
		padding: 12px 16px;
		background: var(--surface-2); border: 1px solid var(--border);
		border-radius: 0 0 var(--r-xl) var(--r-xl);
		border-top: none;
	}
	.cc-captured-badge {
		display: flex; align-items: center; gap: 6px;
		font-size: .78rem; font-weight: 800; color: var(--success);
	}
	.cc-preview-actions { display: flex; gap: 8px; flex-wrap: wrap; }
	.cc-action-btn {
		display: inline-flex; align-items: center; gap: 6px;
		padding: 9px 18px; border-radius: var(--r-md); min-height: 44px;
		font-size: .8rem; font-weight: 800; cursor: pointer;
		background: var(--surface-3); color: var(--text-2);
		border: 1px solid var(--border);
		transition: all .12s; position: relative;
	}
	.cc-action-btn:hover { color: var(--text); border-color: var(--accent-border); }
	.cc-action-btn.cc-accent { background: var(--accent-muted); color: var(--accent); border-color: var(--accent-border); }

	/* ── STATES ── */
	.cc-state {
		display: flex; flex-direction: column; align-items: center; gap: 14px;
		padding: 32px 20px; text-align: center;
	}
	.cc-state-icon {
		width: 64px; height: 64px; border-radius: var(--r-xl);
		display: flex; align-items: center; justify-content: center;
	}
	.cc-state-icon.err { background: var(--error-bg); border: 1px solid var(--error-border); }
	.cc-state-title { font-size: 1.05rem; font-weight: 800; color: var(--text); }
	.cc-state-sub   { font-size: .82rem; color: var(--text-2); line-height: 1.6; max-width: 280px; }
	.cc-state-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }

	/* ── UPLOAD DROPZONE ── */
	.cc-dropzone {
		display: flex; flex-direction: column; align-items: center; gap: 10px;
		padding: 40px 24px; cursor: pointer; position: relative;
		border: 2px dashed var(--border);
		border-radius: var(--r-xl);
		background: var(--surface-2);
		transition: border-color .15s, background .15s;
		text-align: center;
	}
	.cc-dropzone:hover { border-color: var(--accent); background: var(--accent-muted); }
	.cc-drop-icon {
		width: 68px; height: 68px; border-radius: var(--r-xl);
		background: var(--accent-muted); border: 1px solid var(--accent-border);
		display: flex; align-items: center; justify-content: center;
	}
	.cc-drop-title { font-size: 1.05rem; font-weight: 800; color: var(--text); }
	.cc-drop-sub   { font-size: .78rem; color: var(--text-2); line-height: 1.5; }
	.cc-drop-cta {
		padding: 10px 28px; border-radius: var(--r-pill);
		font-size: .85rem; font-weight: 800;
		background: var(--accent); color: #fff; margin-top: 6px;
	}

	/* ── ASK STATE ── */
	.cc-ask {
		display: flex; flex-direction: column; align-items: center; gap: 14px;
		padding: 36px 20px; text-align: center;
	}
	.cc-ask-icon {
		width: 80px; height: 80px; border-radius: var(--r-2xl);
		background: var(--accent-muted); border: 1px solid var(--accent-border);
		display: flex; align-items: center; justify-content: center;
	}
	.cc-ask-title { font-size: 1.2rem; font-weight: 800; color: var(--text); }
	.cc-ask-sub   { font-size: .82rem; color: var(--text-2); line-height: 1.6; max-width: 280px; }
	.cc-open-btn {
		display: flex; align-items: center; gap: 10px;
		padding: 16px 40px; border-radius: var(--r-xl); min-height: 56px;
		font-size: 1.05rem; font-weight: 800;
		background: var(--accent); color: #fff;
		box-shadow: var(--shadow-glow);
		transition: transform .12s, box-shadow .15s;
	}
	.cc-open-btn:hover  { transform: scale(1.03); }
	.cc-open-btn:active { transform: scale(.97); }

	/* ── VIEWFINDER ── */
	.cc-viewfinder {
		position: relative; width: 100%;
		/* Tall 3:4 ratio for portrait face capture */
		aspect-ratio: 3/4;
		max-height: 78vw;
		border-radius: var(--r-xl);
		overflow: hidden;
		background: #000;
		animation: fade-in .25s ease both;
	}
	@media(min-width: 480px) { .cc-viewfinder { max-height: 420px; } }

	/* Full-bleed mode — remove card body padding via parent */
	.cc--live .cc-viewfinder { border-radius: var(--r-xl); }

	.cc-video {
		width: 100%; height: 100%;
		object-fit: cover; display: block;
	}
	.cc-video.mirror { transform: scaleX(-1); }

	/* Loading overlay */
	.cc-loading {
		position: absolute; inset: 0; z-index: 4;
		background: rgba(9,9,11,.8);
		display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
	}
	.cc-loading p { font-size: .9rem; color: var(--text-2); font-weight: 700; }
	.cc-spinner {
		width: 36px; height: 36px;
		border: 3px solid var(--border); border-top-color: var(--accent);
		border-radius: 50%; animation: spin .7s linear infinite;
	}

	/* Face guide */
	.cc-guide {
		position: absolute; inset: 0; pointer-events: none;
		display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
		padding-top: 12%;
	}
	.cc-oval { width: 62%; opacity: .7; }
	.cc-guide-label {
		font-size: .72rem; font-weight: 700; color: rgba(255,255,255,.55);
		margin-top: 8px; letter-spacing: .04em;
	}

	/* Top bar */
	.cc-top-bar {
		position: absolute; top: 12px; right: 12px; z-index: 3;
		display: flex; flex-direction: column; gap: 8px;
	}
	.cc-flip-btn {
		width: 44px; height: 44px; border-radius: 50%;
		background: rgba(0,0,0,.55); backdrop-filter: blur(10px);
		display: flex; align-items: center; justify-content: center;
		transition: background .12s; position: relative; cursor: pointer;
	}
	.cc-flip-btn:hover { background: rgba(0,0,0,.75); }

	/* Bottom shutter bar */
	.cc-bottom-bar {
		position: absolute; bottom: 24px; left: 0; right: 0; z-index: 3;
		display: flex; justify-content: center;
	}
	.cc-shutter {
		width: 80px; height: 80px; border-radius: 50%;
		background: rgba(255,255,255,.15); backdrop-filter: blur(8px);
		border: 3px solid rgba(255,255,255,.7);
		display: flex; align-items: center; justify-content: center;
		transition: transform .12s;
	}
	.cc-shutter:hover  { transform: scale(1.06); }
	.cc-shutter:active { transform: scale(.91); }
	.cc-shutter-inner {
		width: 58px; height: 58px; border-radius: 50%;
		background: rgba(255,255,255,.9);
}
</style>
