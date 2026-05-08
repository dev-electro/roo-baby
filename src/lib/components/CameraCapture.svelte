<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';
	import { onDestroy } from 'svelte';

	let videoElement;
	let canvasElement;
	let previewUrl = '';
	let showFallback = false;
	let hasPermission = false;
	let cameraActive = false;
	let facingMode = 'user';
	let starting = false;
	let cameraRequested = false;

	function requestCamera() {
		cameraRequested = true;
		startCamera();
	}

	async function startCamera() {
		if (cameraActive || starting) return;
		if (appState.imageBlob) return;
		starting = true;
		stopCamera();
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } }
			});
			appState.cameraStream = stream;
			cameraActive = true;
			starting = false;
			if (videoElement) {
				videoElement.srcObject = stream;
				try { await videoElement.play(); } catch {}
			}
			hasPermission = true;
		} catch (err) {
			starting = false;
			showFallback = true;
			hasPermission = false;
		}
	}

	async function flipCamera() {
		facingMode = facingMode === 'user' ? 'environment' : 'user';
		if (cameraActive) {
			cameraActive = false;
			await startCamera();
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
				if (previewUrl) URL.revokeObjectURL(previewUrl);
				appState.imageBlob = blob;
				previewUrl = URL.createObjectURL(blob);
				stopCamera();
			}
		}, 'image/jpeg', 0.92);
	}

	function handleFileUpload(e) {
		const file = e.target.files[0];
		if (file) {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
			appState.imageBlob = file;
			previewUrl = URL.createObjectURL(file);
		}
	}

	function retake() {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		appState.imageBlob = null;
		previewUrl = '';
		showFallback = false;
		cameraActive = false;
		cameraRequested = false;
	}

	function stopCamera() {
		if (appState.cameraStream) {
			appState.cameraStream.getTracks().forEach(t => t.stop());
			appState.cameraStream = null;
		}
		cameraActive = false;
	}

	onDestroy(() => {
		stopCamera();
		if (previewUrl) URL.revokeObjectURL(previewUrl);
	});
</script>

<div class="camera-section">
	{#if appState.imageBlob && previewUrl}
		<div class="preview animate-scale-in">
			<div class="preview-frame">
				<img src={previewUrl} alt="Captured baby face" />
			</div>
			<div class="preview-meta">
				<Icon name="check" size={14} color="var(--accent)" />
				<span>Image captured</span>
			</div>
			<div class="preview-actions">
				<button class="retake-btn" onclick={retake}>
					<Icon name="refresh" size={14} />
					Retake
				</button>
				<label class="upload-btn">
					<Icon name="upload" size={14} />
					Upload
					<input type="file" accept="image/jpeg,image/png" onchange={handleFileUpload} class="hidden-input" />
				</label>
			</div>
		</div>
	{:else if showFallback || !hasPermission}
		<div class="fallback-mode">
			<div class="fallback-upload animate-fade-in">
				<div class="fallback-icon">
					<Icon name="upload" size={32} color="var(--text-muted)" />
				</div>
				<p class="fallback-text">Upload baby photo</p>
				<p class="fallback-sub">JPG or PNG, well-lit preferred</p>
				<input
					type="file"
					accept="image/jpeg,image/png"
					onchange={handleFileUpload}
					class="hidden-input"
				/>
			</div>
			<div class="fallback-divider">
				<span>or</span>
			</div>
			<button class="try-camera-btn" onclick={() => { showFallback = false; hasPermission = false; requestCamera(); }}>
				<Icon name="camera" size={16} />
				Try Camera
			</button>
		</div>
	{:else if !cameraRequested}
		<div class="camera-prompt">
			<div class="prompt-icon">
				<Icon name="camera" size={32} color="var(--primary)" />
			</div>
			<p class="prompt-text">Enable camera to capture baby's face</p>
			<p class="prompt-sub">This helps ROO see facial expressions for better analysis</p>
			<button class="enable-btn" onclick={requestCamera} type="button">
				<Icon name="camera" size={18} color="#fff" />
				Enable Camera
			</button>
			<label class="upload-link">
				<input type="file" accept="image/jpeg,image/png" onchange={handleFileUpload} class="hidden-input" />
				<Icon name="upload" size={14} />
				Or upload a photo
			</label>
		</div>
	{:else}
		<div class="camera-viewfinder animate-fade-in">
			<video
				bind:this={videoElement}
				autoplay
				playsinline
				muted
				class="camera-video"
				class:mirror={facingMode === 'user'}
			></video>
			<div class="camera-overlay">
				<div class="face-guide">
					<svg viewBox="0 0 120 120" class="face-oval">
						<ellipse cx="60" cy="60" rx="48" ry="58" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.35" />
					</svg>
				</div>
				<div class="corner tl"></div>
				<div class="corner tr"></div>
				<div class="corner bl"></div>
				<div class="corner br"></div>
				<div class="camera-hint">Position baby's face in frame</div>
			</div>
			<button class="flip-btn" onclick={flipCamera} type="button" aria-label="Switch camera">
				<Icon name="flip-camera" size={18} color="#fff" />
			</button>
			<button class="capture-btn" onclick={captureImage} type="button">
				<Icon name="camera" size={20} color="#fff" />
				<span>Capture</span>
			</button>
		</div>

		<label class="upload-link">
			<input type="file" accept="image/jpeg,image/png" onchange={handleFileUpload} class="hidden-input" />
			<Icon name="upload" size={14} />
			Upload photo
		</label>
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

	.camera-prompt {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 20px;
	}

	.prompt-icon {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: var(--primary-soft);
		border: 1px solid rgba(255,120,90,0.15);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 4px;
	}

	.prompt-text {
		font-size: 0.92rem;
		font-weight: 700;
		color: var(--text);
	}

	.prompt-sub {
		font-size: 0.78rem;
		color: var(--text-muted);
		margin-bottom: 8px;
	}

	.enable-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 14px 28px;
		border-radius: var(--radius-full);
		font-size: 0.9rem;
		font-weight: 700;
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		color: #fff;
		box-shadow: 0 4px 20px rgba(255,120,90,0.3);
		transition: all var(--transition-fast);
	}

	.enable-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 28px rgba(255,120,90,0.4);
	}

	.enable-btn:active {
		transform: translateY(0);
	}

	.camera-viewfinder {
		position: relative;
		width: 100%;
		max-width: 400px;
		border-radius: var(--radius-xl);
		overflow: hidden;
		aspect-ratio: 4/3;
		background: var(--bg-elevated);
		box-shadow: 0 0 30px rgba(255,120,90,0.06);
	}

	.camera-video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.camera-video.mirror { transform: scaleX(-1); }

	.flip-btn {
		position: absolute; top: 12px; right: 12px;
		width: 36px; height: 36px; border-radius: 50%;
		background: rgba(0,0,0,0.45); backdrop-filter: blur(8px);
		display: flex; align-items: center; justify-content: center;
		z-index: 3;
		transition: all var(--transition-fast);
	}
	.flip-btn:hover { background: rgba(0,0,0,0.65); transform: scale(1.08); }

	.camera-overlay { position: absolute; inset: 0; pointer-events: none; }

	.face-guide {
		position: absolute; inset: 0;
		display: flex; align-items: center; justify-content: center;
		padding: 30px 20px;
	}
	.face-oval { width: 70%; height: 85%; opacity: 0.6; }

	.corner { position: absolute; width: 28px; height: 28px; border-color: var(--primary); border-style: solid; opacity: 0.6; }
	.corner.tl { top: 8px; left: 8px; border-width: 2.5px 0 0 2.5px; border-radius: 4px 0 0 0; }
	.corner.tr { top: 8px; right: 8px; border-width: 2.5px 2.5px 0 0; border-radius: 0 4px 0 0; }
	.corner.bl { bottom: 8px; left: 8px; border-width: 0 0 2.5px 2.5px; border-radius: 0 0 0 4px; }
	.corner.br { bottom: 8px; right: 8px; border-width: 0 2.5px 2.5px 0; border-radius: 0 0 4px 0; }

	.camera-hint {
		position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%);
		font-size: 0.72rem; font-weight: 600;
		color: rgba(255,255,255,0.65); background: rgba(0,0,0,0.45);
		backdrop-filter: blur(8px); padding: 5px 14px;
		border-radius: var(--radius-full); white-space: nowrap;
	}

	.capture-btn {
		position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
		display: flex; align-items: center; gap: 8px;
		padding: 12px 28px; border-radius: var(--radius-full);
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		color: #fff; font-size: 0.9rem; font-weight: 700;
		box-shadow: 0 4px 20px rgba(255,120,90,0.4);
		pointer-events: auto; transition: all var(--transition-fast); z-index: 2;
	}
	.capture-btn:hover { transform: translateX(-50%) scale(1.05); }
	.capture-btn:active { transform: translateX(-50%) scale(0.97); }

	.upload-link {
		display: flex; align-items: center; gap: 6px;
		font-size: 0.82rem; font-weight: 600; color: var(--text-muted);
		cursor: pointer; padding: 10px 20px; border-radius: var(--radius-full);
		border: 1px solid var(--border); background: var(--surface);
		transition: all var(--transition-fast); position: relative;
	}
	.upload-link:hover { border-color: var(--border-glow); background: var(--surface-hover); color: var(--text); }

	.preview { display: flex; flex-direction: column; align-items: center; gap: 12px; width: 100%; }

	.preview-frame {
		width: 100%; max-width: 400px; border-radius: var(--radius-lg); overflow: hidden;
		border: 2px solid rgba(94,234,212,0.2); box-shadow: 0 0 24px rgba(94,234,212,0.08);
	}
	.preview-frame img { width: 100%; height: auto; display: block; }

	.preview-meta {
		display: flex; align-items: center; gap: 6px;
		font-size: 0.82rem; font-weight: 700; color: var(--accent);
		letter-spacing: 0.06em; text-transform: uppercase;
	}

	.preview-actions { display: flex; align-items: center; gap: 12px; }

	.retake-btn, .upload-btn {
		display: flex; align-items: center; gap: 6px;
		padding: 10px 20px; border-radius: var(--radius-full);
		font-size: 0.82rem; font-weight: 600;
		color: var(--text-muted); background: var(--surface);
		border: 1px solid var(--border);
		transition: all var(--transition-fast);
	}
	.upload-btn { cursor: pointer; position: relative; }
	.retake-btn:hover, .upload-btn:hover { background: var(--surface-hover); color: var(--text); border-color: var(--border-glow); }

	.fallback-mode { display: flex; flex-direction: column; align-items: center; gap: 16px; width: 100%; }

	.fallback-upload {
		display: flex; flex-direction: column; align-items: center; gap: 10px;
		padding: 36px 24px; width: 100%; max-width: 320px;
		border-radius: var(--radius-xl); background: var(--surface);
		border: 2px dashed var(--border); cursor: pointer;
		transition: all var(--transition-fast); position: relative;
	}
	.fallback-upload:hover { border-color: var(--border-glow); background: var(--surface-hover); }

	.fallback-icon {
		width: 56px; height: 56px; border-radius: 50%;
		background: var(--surface-hover);
		display: flex; align-items: center; justify-content: center;
	}

	.fallback-text { font-size: 0.95rem; font-weight: 700; color: var(--text); }
	.fallback-sub { font-size: 0.75rem; color: var(--text-faint); }

	.fallback-divider {
		display: flex; align-items: center; gap: 12px; width: 200px;
		color: var(--text-faint); font-size: 0.75rem; font-weight: 600;
	}
	.fallback-divider::before, .fallback-divider::after {
		content: ''; flex: 1; height: 1px; background: var(--border);
	}

	.try-camera-btn {
		display: flex; align-items: center; gap: 6px;
		padding: 10px 22px; border-radius: var(--radius-full);
		font-size: 0.82rem; font-weight: 600;
		color: var(--text-muted); background: var(--surface);
		border: 1px solid var(--border);
		transition: all var(--transition-fast);
	}
	.try-camera-btn:hover { background: var(--surface-hover); color: var(--text); border-color: var(--border-glow); }

	.hidden-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
	.hidden-canvas { display: none; }

	@media (max-width: 380px) {
		.camera-viewfinder { max-width: 300px; }
		.preview-frame { max-width: 280px; }
	}
</style>