<script>
	import { appState } from '$state/appState.svelte.js';
	import { convertToWav, isSupportedAudioFormat } from '$utils/audioEncoder.js';
	import Icon from './Icon.svelte';
	
	let mediaRecorder = null;
	let audioChunks = [];
	let recordingTimer = null;
	let elapsed = 0;
	let showFallback = false;
	let fileInput;
	
	const MAX_DURATION = 10;
	
	async function startRecording() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			audioChunks = [];
			mediaRecorder = new MediaRecorder(stream);
			
			mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) audioChunks.push(e.data);
			};
			
			mediaRecorder.onstop = async () => {
				const rawBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
				
				if (isSupportedAudioFormat(rawBlob.type)) {
					appState.audioBlob = rawBlob;
				} else {
					// Convert WebM/Opus to WAV
					appState.isConvertingAudio = true;
					try {
						const wavBlob = await convertToWav(rawBlob);
						appState.audioBlob = wavBlob;
					} catch (err) {
						appState.setError('Could not convert audio. Please upload a WAV file.');
						showFallback = true;
					} finally {
						appState.isConvertingAudio = false;
					}
				}
				
				stream.getTracks().forEach(t => t.stop());
			};
			
			mediaRecorder.start();
			appState.isRecording = true;
			elapsed = 0;
			
			recordingTimer = setInterval(() => {
				elapsed++;
				if (elapsed >= MAX_DURATION) {
					stopRecording();
				}
			}, 1000);
		} catch (err) {
			appState.setError('Microphone access denied. You can upload an audio file instead.');
			showFallback = true;
		}
	}
	
	function stopRecording() {
		if (mediaRecorder?.state === 'recording') {
			mediaRecorder.stop();
		}
		clearInterval(recordingTimer);
		appState.isRecording = false;
	}
	
	function toggleRecording() {
		if (appState.isRecording) {
			stopRecording();
		} else {
			startRecording();
		}
	}
	
	function handleFileUpload(e) {
		const file = e.target.files[0];
		if (file) {
			appState.audioBlob = file;
			appState.clearError();
		}
	}
	
	function formatTime(s) {
		const m = Math.floor(s / 60);
		const sec = s % 60;
		return `${m}:${sec.toString().padStart(2, '0')}`;
	}
	
	$: recordingProgress = elapsed / MAX_DURATION;
</script>

<div class="recorder">
	{#if appState.isConvertingAudio}
		<div class="converting-state">
			<div class="converting-spinner">
				<Icon name="loader" size={32} color="var(--coral)" />
			</div>
			<p class="converting-text">Optimizing audio...</p>
		</div>
	{:else if appState.audioBlob && !appState.isRecording}
		<div class="done-state animate-scale-in">
			<div class="done-icon-wrap">
				<Icon name="check" size={28} color="var(--mint)" />
			</div>
			<p class="done-text">Cry recorded</p>
			<p class="done-sub">Ready to analyze</p>
			<button class="re-record-btn" onclick={() => { appState.audioBlob = null; showFallback = false; }}>
				<Icon name="refresh" size={14} />
				Re-record
			</button>
		</div>
	{:else}
		<div class="record-wrap">
			{#if appState.isRecording}
				<div class="rings">
					<div class="ring" style="animation-delay: 0s"></div>
					<div class="ring" style="animation-delay: 0.7s"></div>
					<div class="ring" style="animation-delay: 1.4s"></div>
				</div>
			{/if}
			
			<button
				class="record-btn"
				class:recording={appState.isRecording}
				onclick={toggleRecording}
				type="button"
				aria-label={appState.isRecording ? 'Stop recording' : 'Start recording'}
			>
				{#if appState.isRecording}
					<Icon name="stop" size={28} color="#fff" />
				{:else}
					<Icon name="mic" size={28} color="#fff" />
				{/if}
			</button>
			
			{#if appState.isRecording}
				<div class="timer">{formatTime(elapsed)}</div>
				<div class="progress-ring">
					<svg viewBox="0 0 36 36">
						<path class="progress-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
						<path
							class="progress-fill"
							stroke-dasharray={`${recordingProgress * 100}, 100`}
							d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
						/>
					</svg>
				</div>
			{/if}
		</div>
		
		<p class="record-hint">
			{#if appState.isRecording}
				<span class="recording-label">Recording...</span>
				<span class="recording-sub">Auto-stops at 10 seconds</span>
			{:else}
				<span>Tap to record cry</span>
				<span class="sub">Maximum 10 seconds</span>
			{/if}
		</p>
		
		{#if appState.isRecording}
			<div class="waveform">
				{#each Array(9) as _, i}
					<div class="bar" style="animation-delay: {i * 0.08}s"></div>
				{/each}
			</div>
		{/if}
	{/if}
	
	{#if showFallback || appState.error?.includes('Microphone') || appState.error?.includes('convert')}
		<div class="fallback animate-slide-up">
			<Icon name="upload" size={18} color="var(--text-muted)" />
			<span>Upload audio file</span>
			<input
				bind:this={fileInput}
				type="file"
				accept="audio/wav,audio/mpeg,audio/mp3,audio/flac"
				onchange={handleFileUpload}
				class="hidden-input"
			/>
		</div>
	{/if}
</div>

<style>
	.recorder {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 20px;
		padding: 32px 24px;
		width: 100%;
	}

	.record-wrap {
		position: relative;
		width: 150px;
		height: 150px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.record-btn {
		width: 90px;
		height: 90px;
		border-radius: 50%;
		background: linear-gradient(145deg, var(--danger), var(--coral));
		box-shadow: 0 8px 32px rgba(255,77,109,0.45), 0 0 0 4px rgba(255,77,109,0.12);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--transition-fast);
		position: relative;
		z-index: 2;
	}

	.record-btn:hover {
		transform: scale(1.06);
		box-shadow: 0 12px 40px rgba(255,77,109,0.55), 0 0 0 6px rgba(255,77,109,0.18);
	}

	.record-btn:active {
		transform: scale(0.96);
	}

	.record-btn.recording {
		background: linear-gradient(145deg, #c0392b, #e74c3c);
		animation: heartbeat-ring 1s ease-in-out infinite;
	}

	.rings {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.ring {
		position: absolute;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		border: 2px solid rgba(255,77,109,0.4);
		animation: ring-expand 2.2s ease-out infinite;
	}

	.timer {
		position: absolute;
		bottom: -28px;
		font-family: 'Fraunces', serif;
		font-size: 1.1rem;
		color: var(--coral);
		font-weight: 600;
		letter-spacing: 0.05em;
	}

	.progress-ring {
		position: absolute;
		inset: 0;
		transform: rotate(-90deg);
	}

	.progress-ring svg {
		width: 100%;
		height: 100%;
	}

	.progress-bg {
		fill: none;
		stroke: rgba(255,255,255,0.06);
		stroke-width: 2;
	}

	.progress-fill {
		fill: none;
		stroke: var(--coral);
		stroke-width: 2;
		stroke-linecap: round;
		transition: stroke-dasharray 0.3s ease;
	}

	.record-hint {
		text-align: center;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-muted);
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.recording-label {
		color: var(--danger);
		animation: pulse-glow 1.5s ease-in-out infinite;
	}

	.sub, .recording-sub {
		font-size: 0.75rem;
		color: var(--text-faint);
		font-weight: 500;
	}

	.waveform {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		height: 40px;
	}

	.bar {
		width: 4px;
		border-radius: 100px;
		background: linear-gradient(180deg, var(--coral), var(--amber));
		animation: wave-bar 1.2s ease-in-out infinite;
		height: 6px;
	}

	.done-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 20px;
	}

	.done-icon-wrap {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: rgba(82,217,193,0.1);
		border: 1px solid rgba(82,217,193,0.2);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.done-text {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text);
	}

	.done-sub {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.re-record-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 8px;
		padding: 8px 16px;
		border-radius: var(--radius-full);
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-muted);
		background: var(--surface);
		border: 1px solid var(--border);
		transition: all var(--transition-fast);
	}

	.re-record-btn:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	.converting-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 32px;
	}

	.converting-spinner {
		animation: spin-slow 1.5s linear infinite;
	}

	.converting-text {
		font-size: 0.9rem;
		color: var(--text-muted);
		font-weight: 600;
	}

	.fallback {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 20px;
		border-radius: var(--radius-md);
		background: var(--surface);
		border: 1px dashed var(--border);
		color: var(--text-muted);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all var(--transition-fast);
		position: relative;
	}

	.fallback:hover {
		border-color: var(--border-glow);
		background: var(--surface-hover);
	}

	.hidden-input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}
</style>
