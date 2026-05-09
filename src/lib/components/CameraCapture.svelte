<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';
	import { onDestroy } from 'svelte';

	/** @type {HTMLVideoElement|null} */
	let videoEl = null;
	/** @type {HTMLCanvasElement|null} */
	let canvasEl = null;
	
	let isCam = $state(false);
	let error = $state(null);
	/** @type {MediaStream|null} */
	let stream = null;

	async function start() {
		error = null;
		appState.imageBlob = null;
		try {
			stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
			if (videoEl) {
				videoEl.srcObject = stream;
				isCam = true;
			}
		} catch (err) {
			/** @type {Error} */
			const e = err;
			error = e.name === 'NotAllowedError'
				? 'Camera access denied. Check browser permissions.'
				: 'Could not start camera. Ensure it is connected.';
			cleanup();
		}
	}

	function capture() {
		if (!videoEl || !canvasEl || !isCam) return;
		canvasEl.width = videoEl.videoWidth;
		canvasEl.height = videoEl.videoHeight;
		const ctx = canvasEl.getContext('2d');
		if (ctx) ctx.drawImage(videoEl, 0, 0);
		canvasEl.toBlob(b => {
			if (b) appState.imageBlob = b;
			cleanup();
		}, 'image/jpeg', 0.8);
	}

	function reset() {
		appState.imageBlob = null;
		error = null;
		cleanup();
	}

	function cleanup() {
		isCam = false;
		if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
		if (videoEl) videoEl.srcObject = null;
	}

	function upload(e) {
		const f = e.target.files[0];
		if (!f) return;
		appState.imageBlob = f;
		error = null;
		cleanup();
	}

	onDestroy(cleanup);
</script>

<div class="card-inner">
	{#if error}
		<div class="state-block error">
			<Icon name="warning" size={24} color="var(--blush)" />
			<p>{error}</p>
			<button class="btn btn-outline" onclick={() => error = null}>Try Again</button>
		</div>
	{:else if appState.imageBlob}
		<div class="state-block success">
			<div class="img-preview">
				<img src={URL.createObjectURL(appState.imageBlob)} alt="Captured baby face" />
				<div class="img-badge"><Icon name="check" size={12} color="#fff" /></div>
			</div>
			<p>Face captured successfully</p>
			<button class="btn btn-outline" onclick={reset}>Retake Photo</button>
		</div>
	{:else}
		<div class="cam-block">
			<!-- svelte-ignore a11y_media_has_caption -->
			<video bind:this={videoEl} autoplay playsinline class="video-feed" class:active={isCam}></video>
			<canvas bind:this={canvasEl} hidden></canvas>
			
			{#if !isCam}
				<div class="cam-placeholder">
					<Icon name="camera" size={32} color="var(--border)" />
				</div>
			{/if}

			<div class="cam-controls">
				{#if isCam}
					<button class="cap-btn" onclick={capture} aria-label="Take photo">
						<div class="cap-btn-inner"></div>
					</button>
				{:else}
					<button class="btn btn-primary" onclick={start}>Open Camera</button>
					<div class="or-divider"><span>or</span></div>
					<label class="upload-btn">
						<Icon name="upload" size={16} color="currentColor" />
						Upload photo
						<input type="file" accept="image/*" onchange={upload} hidden />
					</label>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.card-inner { padding:24px; width:100%; display:flex; flex-direction:column; align-items:center; }

	.state-block { display:flex; flex-direction:column; align-items:center; gap:16px; text-align:center; }
	.state-block p { font-size:0.95rem; font-weight:500; color:var(--text); }
	.error { color:var(--blush); }

	.btn {
		padding:10px 20px; border-radius:var(--r-sm); font-size:0.85rem; font-weight:600;
		transition:all 0.2s;
	}
	.btn-outline { border:1px solid var(--border); color:var(--text); }
	.btn-outline:hover { background:var(--surface-2); border-color:var(--text-dim); }
	.btn-primary { background:var(--text); color:var(--surface); }
	.btn-primary:hover { opacity:0.9; }

	.img-preview { position:relative; width:120px; height:120px; border-radius:var(--r-md); padding:4px; border:2px solid var(--primary); }
	.img-preview img { width:100%; height:100%; object-fit:cover; border-radius:calc(var(--r-md) - 4px); }
	.img-badge {
		position:absolute; bottom:-6px; right:-6px; width:24px; height:24px; border-radius:50%;
		background:var(--primary); display:flex; align-items:center; justify-content:center;
		box-shadow:0 2px 8px rgba(0,0,0,0.2); border:2px solid var(--surface);
	}

	.cam-block { display:flex; flex-direction:column; gap:16px; width:100%; max-width:320px; position:relative; }
	
	.video-feed {
		width:100%; aspect-ratio:3/4; object-fit:cover; border-radius:var(--r-md);
		background:var(--surface-2); display:none; border:1px solid var(--border);
	}
	.video-feed.active { display:block; }
	
	.cam-placeholder {
		width:100%; aspect-ratio:3/4; border-radius:var(--r-md);
		background:var(--surface-2); border:1px dashed var(--border);
		display:flex; align-items:center; justify-content:center;
	}

	.cam-controls { display:flex; flex-direction:column; gap:12px; width:100%; }

	.cap-btn {
		width:64px; height:64px; border-radius:50%; border:3px solid var(--text);
		background:transparent; display:flex; align-items:center; justify-content:center;
		margin:0 auto; transition:transform 0.1s;
	}
	.cap-btn:active { transform:scale(0.95); }
	.cap-btn-inner { width:50px; height:50px; border-radius:50%; background:var(--text); }

	.or-divider {
		width:100%; text-align:center; position:relative; margin:4px 0;
	}
	.or-divider::before {
		content:''; position:absolute; top:50%; left:0; right:0; height:1px; background:var(--border); z-index:0;
	}
	.or-divider span {
		background:var(--surface); padding:0 12px; font-size:0.8rem; color:var(--text-dim);
		position:relative; z-index:1; font-weight:500;
	}

	.upload-btn {
		display:flex; align-items:center; justify-content:center; gap:8px;
		width:100%; padding:12px; border-radius:var(--r-sm);
		border:1px dashed var(--text-dim); color:var(--text-soft);
		font-size:0.85rem; font-weight:600; cursor:pointer; transition:all 0.2s;
	}
	.upload-btn:hover { border-color:var(--text); color:var(--text); background:var(--surface-2); }
</style>
