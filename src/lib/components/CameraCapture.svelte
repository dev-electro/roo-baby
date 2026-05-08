<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';
	
	let videoElement;
	let canvasElement;
	let previewUrl = '';
	let showFallback = false;
	let fileInput;
	let hasPermission = false;
	
	$: if (videoElement && appState.currentMode === 'image') {
		startCamera();
	}
	
	async function startCamera() {
		if (appState.cameraStream) return;
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
			});
			appState.cameraStream = stream;
			if (videoElement) {
				videoElement.srcObject = stream;
			}
			hasPermission = true;
		} catch (err) {
			showFallback = true;
			hasPermission = false;
		}
	}
	
	function captureImage() {
		if (!videoElement || !canvasElement) return;
		
		const video = videoElement;
		const canvas = canvasElement;
		canvas.width = video.videoWidth || 640;
		canvas.height = video.videoHeight || 480;
		const ctx = canvas.getContext('2d');
		ctx.drawImage(video, 0, 0);
		
		canvas.toBlob((blob) => {
			if (blob) {
				appState.imageBlob = blob;
				previewUrl = URL.createObjectURL(blob);
			}
		}, 'image/jpeg', 0.92);
	}
	
	function handleFileUpload(e) {
		const file = e.target.files[0];
		if (file) {
			appState.imageBlob = file;
			previewUrl = URL.createObjectURL(file);
		}
	}
	
	function retake() {
		appState.imageBlob = null;
		previewUrl = '';
		if (!hasPermission) {
			showFallback = true;
		}
	}
	
	function cleanup() {
		if (appState.cameraStream) {
			appState.cameraStream.getTracks().forEach(t => t.stop());
			appState.cameraStream = null;
		}
	}
</script>

<div class="camera-section">
	{#if appState.imageBlob && previewUrl}
		<div class="preview animate-scale-in">
			<div class="preview-frame">
				<img src={previewUrl} alt="Captured baby face" />
			</div>
			<div class="preview-meta">
				<Icon name="check" size={14} color="var(--mint)" />
				<span>Image captured</span>
			</div>
			<button class="retake-btn" onclick={retake}>
				<Icon name="refresh" size={14} />
				Retake
			</button>
		</div>
	{:else if showFallback || !hasPermission}
		<div class="fallback animate-fade-in">
			<div class="fallback-icon">
				<Icon name="upload" size={32} color="var(--text-muted)" />
			</div>
			<p class="fallback-text">Upload baby photo</p>
			<p class="fallback-sub">JPG or PNG, well-lit preferred</p>
			<input
				bind:this={fileInput}
				type="file"
				accept="image/jpeg,image/png"
				onchange={handleFileUpload}
				class="hidden-input"
			/>
		</div>
	{:else}
		<div class="camera-viewfinder">
				<video
					bind:this={videoElement}
					autoplay
					playsinline
					muted
					class="camera-video"
				></video>
			<div class="camera-overlay">
				<div class="corner tl"></div>
				<div class="corner tr"></div>
				<div class="corner bl"></div>
				<div class="corner br"></div>
			</div>
			<button class="capture-btn" onclick={captureImage} type="button">
				<Icon name="camera" size={22} color="#fff" />
				<span>Capture Face</span>
			</button>
		</div>
	{/if}
	
	<canvas bind:this={canvasElement} class="hidden-canvas"></canvas>
</div>

<style>
	.camera-section {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		padding: 24px;
	}

	.camera-viewfinder {
		position: relative;
		width: 100%;
		max-width: 320px;
		border-radius: var(--radius-lg);
		overflow: hidden;
		aspect-ratio: 4/3;
		background: var(--bg-elevated);
	}

	.camera-video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.camera-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.corner {
		position: absolute;
		width: 24px;
		height: 24px;
		border-color: var(--coral);
		border-style: solid;
		opacity: 0.6;
	}

	.corner.tl { top: 10px; left: 10px; border-width: 2px 0 0 2px; }
	.corner.tr { top: 10px; right: 10px; border-width: 2px 2px 0 0; }
	.corner.bl { bottom: 10px; left: 10px; border-width: 0 0 2px 2px; }
	.corner.br { bottom: 10px; right: 10px; border-width: 0 2px 2px 0; }

	.capture-btn {
		position: absolute;
		bottom: 14px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		border-radius: var(--radius-full);
		background: linear-gradient(135deg, var(--coral), var(--amber));
		color: #fff;
		font-size: 0.85rem;
		font-weight: 700;
		box-shadow: var(--shadow-md);
		transition: all var(--transition-fast);
		z-index: 2;
	}

	.capture-btn:hover {
		transform: translateX(-50%) scale(1.05);
		box-shadow: var(--shadow-lg);
	}

	.capture-btn:active {
		transform: translateX(-50%) scale(0.98);
	}

	.preview {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		width: 100%;
	}

	.preview-frame {
		width: 100%;
		max-width: 280px;
		border-radius: var(--radius-lg);
		overflow: hidden;
		border: 2px solid rgba(82,217,193,0.25);
		box-shadow: 0 0 20px rgba(82,217,193,0.1);
	}

	.preview-frame img {
		width: 100%;
		height: auto;
		display: block;
	}

	.preview-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--mint);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.retake-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 18px;
		border-radius: var(--radius-full);
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-muted);
		background: var(--surface);
		border: 1px solid var(--border);
		transition: all var(--transition-fast);
	}

	.retake-btn:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	.fallback {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 40px 24px;
		width: 100%;
		max-width: 300px;
		border-radius: var(--radius-lg);
		background: var(--surface);
		border: 2px dashed var(--border);
		cursor: pointer;
		transition: all var(--transition-fast);
		position: relative;
	}

	.fallback:hover {
		border-color: var(--border-glow);
		background: var(--surface-hover);
	}

	.fallback-icon {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--surface-hover);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.fallback-text {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--text);
	}

	.fallback-sub {
		font-size: 0.75rem;
		color: var(--text-faint);
	}

	.hidden-input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}

	.hidden-canvas {
		display: none;
	}
</style>
