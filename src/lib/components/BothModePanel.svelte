<script>
	import { appState } from '$state/appState.svelte.js';
	import { convertToWav, isSupportedAudioFormat } from '$utils/audioEncoder.js';
	import { generateSpectrogram } from '$utils/spectrogramGenerator.js';
	import Icon from './Icon.svelte';
	import { onMount, onDestroy } from 'svelte';
	
	let audioChunks = [];
	let isRecordingAudio = false;
	let audioRecorder = null;
	let audioTimer = null;
	let audioElapsed = 0;
	let currentAudioStream = null;
	let showAudioFallback = false;
	let audioFileInput;
	
	let videoElement;
	let canvasElement;
	let imageCaptured = false;
	let cameraActive = false;
	let showImageFallback = false;
	let imageFileInput;
	let facingMode = 'user';
	let starting = false;
	let previewUrl = '';
	let cameraRequested = false;
	
	const MAX_AUDIO = 10;
	
	async function startAudio() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			currentAudioStream = stream;
			audioChunks = [];
			audioRecorder = new MediaRecorder(stream);
			
			audioRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) audioChunks.push(e.data);
			};
			
			audioRecorder.onstop = async () => {
				const raw = new Blob(audioChunks, { type: audioRecorder.mimeType });
				if (isSupportedAudioFormat(raw.type)) {
					appState.audioBlob = raw;
				} else {
					appState.isConvertingAudio = true;
					try {
						appState.audioBlob = await convertToWav(raw);
					} catch {
						appState.setError('Audio conversion failed');
					} finally {
						appState.isConvertingAudio = false;
					}
				}
				stream.getTracks().forEach(t => t.stop());
				currentAudioStream = null;
				
				if (appState.audioBlob) {
					appState.isGeneratingSpectrogram = true;
					try {
						appState.spectrogramBlob = await generateSpectrogram(appState.audioBlob);
					} catch {
						appState.spectrogramBlob = null;
					} finally {
						appState.isGeneratingSpectrogram = false;
					}
				}
			};
			
			audioRecorder.start();
			isRecordingAudio = true;
			appState.isRecording = true;
			audioElapsed = 0;
			audioTimer = setInterval(() => {
				audioElapsed++;
				if (audioElapsed >= MAX_AUDIO) stopAudio();
			}, 1000);
		} catch {
			showAudioFallback = true;
			appState.setError('Microphone access denied');
		}
	}
	
	function stopAudio() {
		if (audioRecorder?.state === 'recording') audioRecorder.stop();
		clearInterval(audioTimer);
		isRecordingAudio = false;
		appState.isRecording = false;
	}
	
	function toggleAudio() {
		isRecordingAudio ? stopAudio() : startAudio();
	}
	
	function handleAudioUpload(e) {
		const file = e.target.files[0];
		if (file) {
			appState.audioBlob = file;
			appState.clearError();
			generateSpectrogramFromBlob(file);
		}
	}
	
	async function generateSpectrogramFromBlob(blob) {
		appState.isGeneratingSpectrogram = true;
		try {
			appState.spectrogramBlob = await generateSpectrogram(blob);
		} catch {
			appState.spectrogramBlob = null;
		} finally {
			appState.isGeneratingSpectrogram = false;
		}
	}
	
	function resetAudio() {
		appState.audioBlob = null;
		appState.spectrogramBlob = null;
		appState.isRecording = false;
		showAudioFallback = false;
		audioElapsed = 0;
	}
	
	async function startCamera() {
		if (cameraActive || starting) return;
		if (imageCaptured || appState.imageBlob) return;
		starting = true;
		stopCamera();
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode,
					width: { ideal: 640 },
					height: { ideal: 480 },
					frameRate: { ideal: 30, max: 30 }
				}
			});
			appState.cameraStream = stream;
			cameraActive = true;
			starting = false;
			if (videoElement) {
				videoElement.srcObject = stream;
				try { await videoElement.play(); } catch {}
			}
		} catch {
			starting = false;
			showImageFallback = true;
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
		const canvas = canvasElement;
		canvas.width = videoElement.videoWidth || 640;
		canvas.height = videoElement.videoHeight || 480;
		canvas.getContext('2d').drawImage(videoElement, 0, 0);
		canvas.toBlob((blob) => {
			if (blob) {
				if (previewUrl) URL.revokeObjectURL(previewUrl);
				appState.imageBlob = blob;
				previewUrl = URL.createObjectURL(blob);
				imageCaptured = true;
				stopCamera();
			}
		}, 'image/jpeg', 0.9);
	}
	
	function handleImageUpload(e) {
		const file = e.target.files[0];
		if (file) {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
			appState.imageBlob = file;
			previewUrl = URL.createObjectURL(file);
			imageCaptured = true;
			stopCamera();
		}
	}
	
	function retakeImage() {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		appState.imageBlob = null;
		imageCaptured = false;
		previewUrl = '';
		showImageFallback = false;
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
	
	function formatTime(s) {
		return `0:${s.toString().padStart(2, '0')}`;
	}

	onMount(() => {
		// Camera requires explicit user tap — see requestCamera()
		if (appState.audioBlob && !appState.spectrogramBlob) {
			generateSpectrogramFromBlob(appState.audioBlob);
		}
	});

	onDestroy(() => {
		stopCamera();
		if (audioRecorder?.state === 'recording') stopAudio();
		clearInterval(audioTimer);
		if (currentAudioStream) {
			currentAudioStream.getTracks().forEach(t => t.stop());
			currentAudioStream = null;
		}
		if (previewUrl) URL.revokeObjectURL(previewUrl);
	});
</script>

<div class="both-panel">
	<!-- Audio Section -->
	<div class="audio-section">
		<div class="section-label">
			<Icon name="mic" size={14} color="var(--coral)" />
			<span>Audio</span>
		</div>
		
		{#if appState.isConvertingAudio || appState.isGeneratingSpectrogram}
			<div class="audio-processing">
				<div class="processing-spin"></div>
				<span>{appState.isConvertingAudio ? 'Converting…' : 'Processing spectrogram…'}</span>
			</div>
		{:else if appState.audioBlob && !isRecordingAudio}
			<div class="audio-done animate-scale-in">
				<Icon name="check" size={20} color="var(--mint)" />
				<div class="audio-done-info">
					<span class="audio-done-label">Cry recorded</span>
					<span class="audio-done-sub">{appState.spectrogramBlob ? 'Spectrogram ready' : 'Audio ready'}</span>
				</div>
				<button class="redo-btn" onclick={resetAudio}>
					<Icon name="refresh" size={12} />
				</button>
			</div>
		{:else if showAudioFallback}
			<label class="upload-area">
				<Icon name="upload" size={24} color="var(--text-muted)" />
				<span>Upload audio</span>
				<input type="file" accept="audio/wav,audio/mpeg,audio/mp3,audio/flac,audio/ogg" onchange={handleAudioUpload} class="hidden-input" />
			</label>
		{:else}
			<div class="audio-controls">
				<button class="audio-record-btn" class:recording={isRecordingAudio} onclick={toggleAudio} type="button">
					{#if isRecordingAudio}
						<Icon name="stop" size={20} color="#fff" />
					{:else}
						<Icon name="mic" size={20} color="#fff" />
					{/if}
				</button>
				{#if isRecordingAudio}
					<div class="audio-timer">
						{formatTime(audioElapsed)}
						<div class="audio-progress">
							<div class="audio-progress-fill" style="width: {(audioElapsed / MAX_AUDIO) * 100}%"></div>
						</div>
					</div>
				{:else}
					<div class="audio-hint">
						<span>Tap to record</span>
						<span class="audio-hint-sub">10 seconds max</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>
	
	<!-- Divider -->
	<div class="panel-divider">
		<div class="divider-line"></div>
		<div class="divider-or">
			<span>+</span>
		</div>
		<div class="divider-line"></div>
	</div>
	
	<!-- Image Section -->
	<div class="image-section">
		<div class="section-label">
			<Icon name="camera" size={14} color="var(--amber)" />
			<span>Face</span>
		</div>
		
		{#if imageCaptured && appState.imageBlob}
			<div class="image-captured-wrap animate-scale-in">
				{#if previewUrl}
					<div class="image-thumb">
						<img src={previewUrl} alt="Captured face" />
					</div>
				{:else}
					<div class="image-thumb-placeholder">
						<Icon name="check" size={24} color="var(--mint)" />
					</div>
				{/if}
				<div class="captured-info">
					<span class="captured-label">Face captured</span>
				</div>
				<div class="captured-actions">
					<button class="action-btn" onclick={retakeImage}>
						<Icon name="refresh" size={12} />
						Retake
					</button>
					<label class="action-btn upload-action">
						<Icon name="upload" size={12} />
						Upload
						<input type="file" accept="image/jpeg,image/png" onchange={handleImageUpload} class="hidden-input" />
					</label>
				</div>
			</div>
		{:else if showImageFallback}
			<div class="fallback-wrap">
				<label class="upload-area upload-area-img">
					<Icon name="upload" size={24} color="var(--text-muted)" />
					<span>Upload photo</span>
					<input type="file" accept="image/jpeg,image/png" onchange={handleImageUpload} class="hidden-input" />
				</label>
				<button class="try-camera-btn" onclick={() => { showImageFallback = false; requestCamera(); }}>
					<Icon name="camera" size={14} />
					Try camera instead
				</button>
			</div>
		{:else if !cameraRequested}
			<div class="camera-prompt">
				<div class="prompt-icon">
					<Icon name="camera" size={24} color="var(--primary)" />
				</div>
				<p class="prompt-text">Enable camera for face analysis</p>
				<p class="prompt-sub">Helps ROO cross-reference facial expressions</p>
				<button class="enable-btn" onclick={requestCamera} type="button">
					<Icon name="camera" size={16} color="#fff" />
					Enable Camera
				</button>
				<label class="upload-link">
					<input type="file" accept="image/jpeg,image/png" onchange={handleImageUpload} class="hidden-input" />
					<Icon name="upload" size={12} />
					Upload instead
				</label>
			</div>
		{:else}
			<div class="camera-container">
				<video bind:this={videoElement} autoplay playsinline muted class="camera-video" class:mirror={facingMode === 'user'}></video>
				<div class="camera-guides">
					<svg viewBox="0 0 100 130" class="face-outline">
						<ellipse cx="50" cy="65" rx="38" ry="52" fill="none" stroke="rgba(255,179,71,0.3)" stroke-width="1.5" stroke-dasharray="3 3" />
					</svg>
				</div>
				<div class="camera-corners">
					<div class="cc tl"></div><div class="cc tr"></div>
					<div class="cc bl"></div><div class="cc br"></div>
				</div>
				<button class="flip-btn" onclick={flipCamera} type="button" aria-label="Switch camera">
					<Icon name="flip-camera" size={16} color="#fff" />
				</button>
				<button class="capture-btn" onclick={captureImage} type="button">
					<Icon name="camera" size={18} color="#fff" />
				</button>
			</div>
			<label class="upload-link">
				<input type="file" accept="image/jpeg,image/png" onchange={handleImageUpload} class="hidden-input" />
				<Icon name="upload" size={12} />
				Or upload photo
			</label>
		{/if}
	</div>
</div>

<canvas bind:this={canvasElement} class="hidden-canvas"></canvas>

<style>
	.both-panel {
		display: flex;
		gap: 16px;
		padding: 20px 16px;
		width: 100%;
	}

	.audio-section, .image-section {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		min-width: 0;
	}

	.section-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	/* ── Audio Controls ── */
	.audio-controls {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}

	.audio-record-btn {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: linear-gradient(145deg, var(--danger), var(--coral));
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 16px rgba(255,77,109,0.4);
		transition: all var(--transition-fast);
	}

	.audio-record-btn:hover {
		transform: scale(1.06);
	}

	.audio-record-btn.recording {
		animation: heartbeat-ring 1s ease-in-out infinite;
		background: linear-gradient(145deg, #c0392b, #e74c3c);
	}

	.audio-timer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		font-family: 'Fraunces', serif;
		font-size: 1rem;
		color: var(--coral);
		font-weight: 600;
	}

	.audio-progress {
		width: 80px;
		height: 3px;
		background: var(--border);
		border-radius: 2px;
		overflow: hidden;
	}

	.audio-progress-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--coral), var(--amber));
		border-radius: 2px;
		transition: width 1s linear;
	}

	.audio-hint {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--text-muted);
	}

	.audio-hint-sub {
		font-size: 0.68rem;
		color: var(--text-faint);
		font-weight: 500;
	}

	.audio-processing {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 16px;
	}

	.processing-spin {
		width: 28px;
		height: 28px;
		border: 3px solid var(--border);
		border-top-color: var(--coral);
		border-radius: 50%;
		animation: spin-slow 1s linear infinite;
	}

	.audio-processing span {
		font-size: 0.78rem;
		color: var(--text-muted);
		font-weight: 600;
	}

	.audio-done {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
		background: rgba(82,217,193,0.06);
		border: 1px solid rgba(82,217,193,0.15);
		border-radius: var(--radius-md);
	}

	.audio-done-info {
		display: flex;
		flex-direction: column;
	}

	.audio-done-label {
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--mint);
	}

	.audio-done-sub {
		font-size: 0.7rem;
		color: var(--text-faint);
	}

	/* ── Divider ── */
	.panel-divider {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 0 4px;
	}

	.divider-line {
		width: 1px;
		flex: 1;
		background: linear-gradient(180deg, transparent, var(--border), transparent);
	}

	.divider-or {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--surface);
		border: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--text-faint);
	}

	/* ── Camera Section ── */
	.camera-container {
		position: relative;
		width: 100%;
		aspect-ratio: 3/4;
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: var(--bg-elevated);
		box-shadow: 0 0 20px rgba(255,179,71,0.06);
	}

	.camera-video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.camera-video.mirror {
		transform: scaleX(-1);
	}

	.flip-btn {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: rgba(0,0,0,0.45);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 3;
		transition: all var(--transition-fast);
	}

	.flip-btn:hover {
		background: rgba(0,0,0,0.65);
		transform: scale(1.08);
	}

	.camera-guides {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.face-outline {
		width: 55%;
		height: 70%;
		opacity: 0.5;
	}

	.camera-corners {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.cc {
		position: absolute;
		width: 20px;
		height: 20px;
		border-color: var(--amber);
		border-style: solid;
		opacity: 0.6;
	}

	.cc.tl { top: 8px; left: 8px; border-width: 2px 0 0 2px; border-radius: 3px 0 0 0; }
	.cc.tr { top: 8px; right: 8px; border-width: 2px 2px 0 0; border-radius: 0 3px 0 0; }
	.cc.bl { bottom: 8px; left: 8px; border-width: 0 0 2px 2px; border-radius: 0 0 0 3px; }
	.cc.br { bottom: 8px; right: 8px; border-width: 0 2px 2px 0; border-radius: 0 0 3px 0; }

	.capture-btn {
		position: absolute;
		bottom: 12px;
		left: 50%;
		transform: translateX(-50%);
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--coral), var(--amber));
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 16px rgba(255,123,92,0.4);
		transition: all var(--transition-fast);
		z-index: 2;
	}

	.capture-btn:hover {
		transform: translateX(-50%) scale(1.1);
	}

	.upload-link {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.7rem;
		color: var(--text-faint);
		cursor: pointer;
		padding: 8px 14px;
		border-radius: var(--radius-full);
		border: 1px solid var(--border);
		background: var(--surface);
		transition: all var(--transition-fast);
		position: relative;
	}

	.upload-link:hover {
		color: var(--text-muted);
		border-color: var(--border-glow);
		background: var(--surface-hover);
	}

	/* ── Image captured ── */
	.image-captured-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		width: 100%;
	}

	.image-thumb {
		width: 100%;
		max-width: 240px;
		border-radius: var(--radius-md);
		overflow: hidden;
		border: 2px solid rgba(82,217,193,0.25);
		box-shadow: 0 0 16px rgba(82,217,193,0.08);
	}

	.image-thumb img {
		width: 100%;
		height: auto;
		display: block;
	}

	.image-thumb-placeholder {
		width: 100%;
		max-width: 240px;
		aspect-ratio: 4/3;
		border-radius: var(--radius-md);
		background: rgba(82,217,193,0.08);
		border: 2px solid rgba(82,217,193,0.2);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.captured-info {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.captured-label {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--mint);
	}

	.captured-actions {
		display: flex;
		gap: 8px;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 6px 12px;
		border-radius: var(--radius-full);
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--text-muted);
		background: var(--surface);
		border: 1px solid var(--border);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.action-btn:hover {
		background: var(--surface-hover);
		color: var(--text);
		border-color: var(--border-glow);
	}

	.upload-action {
		position: relative;
	}

	/* ── Camera prompt ── */
	.camera-prompt {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 12px 8px;
	}

	.prompt-icon {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		background: var(--primary-soft);
		border: 1px solid rgba(255,120,90,0.15);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 4px;
	}

	.prompt-text {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text);
	}

	.prompt-sub {
		font-size: 0.7rem;
		color: var(--text-muted);
		margin-bottom: 6px;
		text-align: center;
	}

	.enable-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 10px 22px;
		border-radius: var(--radius-full);
		font-size: 0.82rem;
		font-weight: 700;
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		color: #fff;
		box-shadow: 0 3px 14px rgba(255,120,90,0.25);
		transition: all var(--transition-fast);
	}
	.enable-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 20px rgba(255,120,90,0.35); }

	/* ── Fallback ── */
	.fallback-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		width: 100%;
	}

	.upload-area {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 24px 16px;
		border-radius: var(--radius-md);
		background: var(--surface);
		border: 2px dashed var(--border);
		cursor: pointer;
		transition: all var(--transition-fast);
		width: 100%;
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--text-muted);
		position: relative;
	}

	.upload-area:hover {
		border-color: var(--border-glow);
		background: var(--surface-hover);
	}

	.upload-area-img {
		aspect-ratio: 3/4;
	}

	.try-camera-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		border-radius: var(--radius-full);
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--text-muted);
		background: var(--surface);
		border: 1px solid var(--border);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.try-camera-btn:hover {
		background: var(--surface-hover);
		color: var(--text);
		border-color: var(--border-glow);
	}

	.redo-btn {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface);
		border: 1px solid var(--border);
		color: var(--text-muted);
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}

	.redo-btn:hover {
		background: var(--surface-hover);
		color: var(--text);
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

	@media (max-width: 440px) {
		.both-panel {
			flex-direction: column;
			gap: 12px;
		}
		.panel-divider {
			flex-direction: row;
			padding: 0;
		}
		.divider-line {
			height: 1px;
			width: auto;
			flex: 1;
		}
		.divider-or {
			width: 28px;
			height: 28px;
		}
	}
</style>