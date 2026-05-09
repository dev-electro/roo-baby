<script>
	import { appState } from '$state/appState.svelte.js';
	import { onDestroy } from 'svelte';
	import { capturePhoto as trackPhoto } from '$utils/analytics.js';
	import Icon from './Icon.svelte';

	let videoEl, canvasEl;
	let preview  = $state('');
	let fallback = $state(false);
	let active   = $state(false);
	let facing   = $state('user');
	let busy     = $state(false);
	let asked    = $state(false);
	let denied   = $state(false);

	function req() { asked = true; start(); }

	async function start() {
		if (active || busy) return;
		if (appState.imageBlob) return;
		busy = true; denied = false; stopStream();
		try {
			const s = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } }
			});
			appState.cameraStream = s;
			active = true; busy = false;
			if (videoEl) { videoEl.srcObject = s; try { await videoEl.play(); } catch {} }
		} catch (err) {
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
		canvasEl.getContext('2d').drawImage(videoEl, 0, 0);
		canvasEl.toBlob(b => {
			if (b && appState.resetId === rid) {
				if (preview) URL.revokeObjectURL(preview);
				preview = URL.createObjectURL(b);
				appState.imageBlob = b;
				stopStream();
				trackPhoto('camera');
			}
		}, 'image/jpeg', .92);
	}

	function upload(e) {
		const f = e.target.files[0];
		if (f) {
			if (preview) URL.revokeObjectURL(preview);
			preview = URL.createObjectURL(f);
			appState.imageBlob = f;
			fallback = false; // Bug fix: reset fallback state
			trackPhoto('upload');
		}
	}

	function retake() {
		if (preview) URL.revokeObjectURL(preview);
		preview = '';
		appState.imageBlob = null;
		fallback = false; active = false; asked = false; denied = false;
	}

	function stopStream() {
		if (appState.cameraStream) {
			appState.cameraStream.getTracks().forEach(t => t.stop());
			appState.cameraStream = null;
		}
		active = false;
	}

	onDestroy(() => { stopStream(); if (preview) URL.revokeObjectURL(preview); });
</script>

<div class="c">
	{#if appState.imageBlob && preview}
		<!-- Preview -->
		<div class="c-preview animate-in">
			<div class="c-preview-img"><img src={preview} alt="Captured" /></div>
			<div class="c-preview-label">
				<Icon name="check" size={16} color="var(--mint)" /> Face captured
			</div>
			<div class="c-row">
				<button class="c-btn" onclick={retake}><Icon name="refresh" size={14} color="currentColor" /> Retake</button>
				<label class="c-btn">
					<Icon name="upload" size={14} color="currentColor" /> Upload
					<input type="file" accept="image/jpeg,image/png" onchange={upload} class="c-hidden" />
				</label>
			</div>
		</div>

	{:else if denied}
		<!-- Camera denied -->
		<div class="c-denied animate-up">
			<div class="c-denied-icon">📷</div>
			<strong class="c-denied-title">Camera access blocked</strong>
			<p class="c-denied-sub">Allow camera in browser settings, or upload a photo.</p>
			<div class="c-row">
				<button class="c-btn" onclick={() => { denied = false; req(); }}>
					<Icon name="refresh" size={14} color="currentColor" /> Try again
				</button>
				<label class="c-btn c-btn-lav">
					<Icon name="upload" size={14} color="currentColor" /> Upload photo
					<input type="file" accept="image/jpeg,image/png" onchange={upload} class="c-hidden" />
				</label>
			</div>
		</div>

	{:else if fallback}
		<!-- Upload fallback -->
		<div class="c-fallback animate-up">
			<label class="c-upload-zone">
				<div class="c-upload-icon"><Icon name="upload" size={28} color="var(--lavender)" /></div>
				<div class="c-upload-text">Upload a baby photo</div>
				<div class="c-upload-sub">JPG or PNG, well-lit face</div>
				<input type="file" accept="image/jpeg,image/png" onchange={upload} class="c-hidden" />
			</label>
			<button class="c-btn" onclick={() => { fallback = false; req(); }}>
				<Icon name="camera" size={14} color="currentColor" /> Try camera
			</button>
		</div>

	{:else if !asked}
		<!-- Ask state -->
		<div class="c-ask animate-up">
			<div class="c-ask-icon"><Icon name="camera" size={36} color="var(--lavender)" /></div>
			<div class="c-ask-text">Capture baby's face</div>
			<div class="c-ask-sub">Point camera at your baby for best results</div>
			<button class="c-big" onclick={req}>
				<Icon name="camera" size={18} color="#fff" /> Open Camera
			</button>
			<label class="c-link">
				<Icon name="upload" size={14} color="currentColor" /> Or upload photo
				<input type="file" accept="image/jpeg,image/png" onchange={upload} class="c-hidden" />
			</label>
		</div>

	{:else}
		<!-- Live camera -->
		<div class="c-view animate-fade">
			{#if busy}
				<div class="c-skeleton"></div>
			{/if}
			<video bind:this={videoEl} autoplay playsinline muted class="c-video" class:mirror={facing === 'user'}></video>
			<!-- Guide oval -->
			<div class="c-guide" aria-hidden="true">
				<svg viewBox="0 0 120 140" class="c-oval">
					<ellipse cx="60" cy="70" rx="44" ry="56" fill="rgba(167,139,250,.06)" stroke="var(--lavender)" stroke-width="2" stroke-dasharray="6 4" />
				</svg>
			</div>
			<div class="c-overlay-top">
				<button class="c-flip" onclick={flip} aria-label="Flip camera">
					<Icon name="flip-camera" size={16} color="#fff" />
				</button>
			</div>
			<div class="c-overlay-bottom">
				<button class="c-snap" onclick={capture} aria-label="Take photo"></button>
			</div>
		</div>
		<label class="c-link">
			<Icon name="upload" size={14} color="currentColor" /> Upload instead
			<input type="file" accept="image/jpeg,image/png" onchange={upload} class="c-hidden" />
		</label>
	{/if}

	<canvas bind:this={canvasEl} style="display:none"></canvas>
</div>

<style>
	.c { width:100%; display:flex; flex-direction:column; align-items:center; gap:10px; }

	/* Camera view */
	.c-view { position:relative; width:100%; aspect-ratio:3/4; max-height:68vh; border-radius:var(--r-lg); overflow:hidden; background:var(--border); }
	.c-skeleton { position:absolute; inset:0; z-index:2; }
	.c-skeleton::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(167,139,250,.08),transparent); background-size:200% 100%; animation:shimmer 1.4s ease-in-out infinite; }
	.c-video { width:100%; height:100%; object-fit:cover; }
	.c-video.mirror { transform:scaleX(-1); }
	.c-guide { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; }
	.c-oval  { width:65%; height:75%; }
	.c-overlay-top    { position:absolute; top:10px; right:10px; z-index:3; }
	.c-overlay-bottom { position:absolute; bottom:20px; left:0; right:0; display:flex; justify-content:center; z-index:3; }
	.c-flip { width:40px; height:40px; border-radius:50%; background:rgba(0,0,0,.5); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; transition:background .15s; }
	.c-flip:hover { background:rgba(0,0,0,.7); }
	.c-snap {
		width:64px; height:64px; border-radius:50%;
		background:linear-gradient(145deg, var(--lavender), var(--indigo));
		box-shadow:0 4px 24px var(--lav-glow);
		border:3px solid rgba(255,255,255,.25);
		transition:transform .12s;
	}
	.c-snap:active { transform:scale(.9); }

	/* Preview */
	.c-preview { display:flex; flex-direction:column; align-items:center; gap:12px; width:100%; padding:8px; }
	.c-preview-img { width:100%; max-width:260px; border-radius:var(--r-lg); overflow:hidden; border:2px solid var(--mint); box-shadow:0 0 24px var(--mint-glow); }
	.c-preview-img img { width:100%; display:block; }
	.c-preview-label { font-size:.85rem; font-weight:700; color:var(--mint); display:flex; align-items:center; gap:6px; }
	.c-row { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; }

	/* Buttons */
	.c-btn {
		padding:9px 20px; border-radius:var(--r-pill);
		font-size:.8rem; font-weight:700; color:var(--text-soft);
		border:1px solid var(--border); background:var(--surface);
		transition:all .15s; display:inline-flex; align-items:center; gap:5px;
		position:relative; cursor:pointer;
	}
	.c-btn:hover { border-color:var(--lavender); color:var(--text); }
	.c-btn-lav { border-color:var(--lavender); color:var(--lavender); background:var(--lav-soft); }

	/* Ask state */
	.c-ask { display:flex; flex-direction:column; align-items:center; gap:8px; padding:28px 16px; text-align:center; }
	.c-ask-icon { width:72px; height:72px; border-radius:var(--r-lg); background:var(--lav-soft); border:1px solid rgba(167,139,250,.2); display:flex; align-items:center; justify-content:center; margin-bottom:4px; }
	.c-ask-text { font-size:1rem; font-weight:800; color:var(--text); }
	.c-ask-sub  { font-size:.78rem; color:var(--text-soft); margin-bottom:6px; }
	.c-big {
		padding:14px 32px; border-radius:var(--r-pill);
		font-size:.95rem; font-weight:800;
		background:linear-gradient(135deg, var(--lavender), var(--indigo));
		color:#fff; box-shadow:0 4px 20px var(--lav-glow);
		transition:transform .15s, box-shadow .2s;
		display:inline-flex; align-items:center; gap:8px;
	}
	.c-big:hover  { transform:translateY(-1px); box-shadow:0 6px 28px var(--lav-glow); }
	.c-big:active { transform:scale(.97); }
	.c-link {
		font-size:.78rem; color:var(--text-soft); font-weight:600;
		cursor:pointer; padding:8px 14px; border-radius:var(--r-sm);
		transition:all .15s; display:inline-flex; align-items:center; gap:5px; position:relative;
	}
	.c-link:hover { color:var(--text); background:var(--surface); }

	/* Upload zone */
	.c-fallback { display:flex; flex-direction:column; align-items:center; gap:12px; width:100%; }
	.c-upload-zone {
		display:flex; flex-direction:column; align-items:center; gap:8px;
		padding:36px 40px; border:2px dashed var(--border); border-radius:var(--r-lg);
		background:var(--surface); cursor:pointer; position:relative;
		transition:border-color .2s, background .2s; text-align:center; width:100%;
	}
	.c-upload-zone:hover { border-color:var(--lavender); background:var(--lav-soft); }
	.c-upload-icon  { width:56px; height:56px; border-radius:var(--r-md); background:var(--lav-soft); display:flex; align-items:center; justify-content:center; }
	.c-upload-text  { font-size:.95rem; font-weight:800; color:var(--text); }
	.c-upload-sub   { font-size:.72rem; color:var(--text-soft); }

	/* Denied */
	.c-denied { display:flex; flex-direction:column; align-items:center; gap:10px; padding:24px; background:var(--blush-soft); border:1px solid rgba(253,164,175,.2); border-radius:var(--r-lg); text-align:center; max-width:300px; }
	.c-denied-icon  { font-size:2.2rem; }
	.c-denied-title { font-size:.95rem; font-weight:800; color:var(--blush); }
	.c-denied-sub   { font-size:.78rem; color:var(--text-soft); line-height:1.5; }

	.c-hidden { position:absolute; inset:0; opacity:0; cursor:pointer; }
</style>
