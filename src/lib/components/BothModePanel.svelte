<script>
	import { appState } from '$state/appState.svelte.js';
	import { convertToWav, isSupportedAudioFormat } from '$utils/audioEncoder.js';
	import { generateSpectrogram } from '$utils/spectrogramGenerator.js';
	import Icon from './Icon.svelte';
	
	let audioRecorder = null;
	let audioChunks = [];
	let isRecordingAudio = false;
	let audioTimer = null;
	let audioElapsed = 0;
	
	let videoElement;
	let canvasElement;
	let imageCaptured = false;
	
	const MAX_AUDIO = 10;
	
	async function startAudio() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
			audioElapsed = 0;
			audioTimer = setInterval(() => {
				audioElapsed++;
				if (audioElapsed >= MAX_AUDIO) stopAudio();
			}, 1000);
		} catch {
			appState.setError('Microphone access denied');
		}
	}
	
	function stopAudio() {
		if (audioRecorder?.state === 'recording') audioRecorder.stop();
		clearInterval(audioTimer);
		isRecordingAudio = false;
	}
	
	function toggleAudio() {
		isRecordingAudio ? stopAudio() : startAudio();
	}
	
	async function startCamera() {
		if (!videoElement) return;
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }
			});
			appState.cameraStream = stream;
			videoElement.srcObject = stream;
		} catch {
			// Camera fallback handled by parent
		}
	}
	
	function captureImage() {
		if (!videoElement || !canvasElement) return;
		const canvas = canvasElement;
		canvas.width = videoElement.videoWidth || 320;
		canvas.height = videoElement.videoHeight || 240;
		canvas.getContext('2d').drawImage(videoElement, 0, 0);
		canvas.toBlob((blob) => {
			if (blob) {
				appState.imageBlob = blob;
				imageCaptured = true;
			}
		}, 'image/jpeg', 0.9);
	}
	
	$: if (appState.currentMode === 'both' && videoElement) {
		startCamera();
	}
	
	function formatTime(s) {
		return `0:${s.toString().padStart(2, '0')}`;
	}
</script>

<div class="both-panel">
	<div class="split">
		<!-- Audio Side -->
		<div class="side">
			<div class="side-label">
				<Icon name="mic" size={14} color="var(--text-muted)" />
				<span>Audio</span>
			</div>
			
			{#if appState.audioBlob && !isRecordingAudio}
				<div class="side-done">
					<Icon name="check" size={20} color="var(--mint)" />
					<span>Recorded</span>
				</div>
			{:else}
				<button
					class="mini-record"
					class:recording={isRecordingAudio}
					onclick={toggleAudio}
					type="button"
				>
					{#if isRecordingAudio}
						<Icon name="stop" size={18} color="#fff" />
					{:else}
						<Icon name="mic" size={18} color="#fff" />
					{/if}
				</button>
				{#if isRecordingAudio}
					<span class="mini-timer">{formatTime(audioElapsed)}</span>
				{:else}
					<span class="mini-hint">Tap to record</span>
				{/if}
			{/if}
		</div>
		
		<!-- Divider -->
		<div class="divider"></div>
		
		<!-- Image Side -->
		<div class="side">
			<div class="side-label">
				<Icon name="camera" size={14} color="var(--text-muted)" />
				<span>Image</span>
			</div>
			
			{#if imageCaptured && appState.imageBlob}
				<div class="side-done">
					<Icon name="check" size={20} color="var(--mint)" />
					<span>Captured</span>
				</div>
			{:else}
				<div class="mini-camera">
					<video bind:this={videoElement} autoplay playsinline muted class="mini-video"></video>
					<button class="mini-capture" onclick={captureImage} type="button">
						<Icon name="camera" size={16} color="#fff" />
					</button>
				</div>
			{/if}
		</div>
	</div>
	
	<canvas bind:this={canvasElement} class="hidden-canvas"></canvas>
</div>

<style>
	.both-panel {
		padding: 24px;
		width: 100%;
	}

	.split {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 16px;
		align-items: center;
	}

	.divider {
		width: 1px;
		height: 80px;
		background: linear-gradient(180deg, transparent, var(--border), transparent);
	}

	.side {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.side-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.mini-record {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: linear-gradient(145deg, var(--danger), var(--coral));
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 16px rgba(255,77,109,0.4);
		transition: all var(--transition-fast);
	}

	.mini-record:hover {
		transform: scale(1.06);
	}

	.mini-record.recording {
		animation: heartbeat-ring 1s ease-in-out infinite;
	}

	.mini-timer {
		font-family: 'Fraunces', serif;
		font-size: 0.9rem;
		color: var(--coral);
		font-weight: 600;
	}

	.mini-hint {
		font-size: 0.72rem;
		color: var(--text-faint);
		font-weight: 600;
		text-align: center;
	}

	.mini-camera {
		position: relative;
		width: 100%;
		max-width: 140px;
		aspect-ratio: 4/3;
		border-radius: var(--radius-md);
		overflow: hidden;
		background: var(--bg-elevated);
	}

	.mini-video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.mini-capture {
		position: absolute;
		bottom: 6px;
		left: 50%;
		transform: translateX(-50%);
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--coral), var(--amber));
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: var(--shadow-sm);
	}

	.side-done {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 16px;
	}

	.side-done span {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--mint);
	}

	.hidden-canvas {
		display: none;
	}

	@media (max-width: 380px) {
		.split {
			gap: 10px;
		}
		.mini-camera {
			max-width: 120px;
		}
	}
</style>
