<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';
	import { onDestroy } from 'svelte';

	let isRec = $state(false);
	let duration = $state(0);
	let error = $state(null);
	
	/** @type {MediaRecorder|null} */
	let recorder = null;
	/** @type {BlobPart[]} */
	let chunks = [];
	let timer = null;
	/** @type {MediaStream|null} */
	let stream = null;

	const MAX = 10;
	let progress = $derived((duration / MAX) * 100);

	async function start() {
		error = null;
		try {
			stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			recorder = new MediaRecorder(stream);
			chunks = [];

			recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
			recorder.onstop = () => {
				appState.audioBlob = new Blob(chunks, { type: 'audio/webm' });
				cleanup();
			};

			recorder.start(200);
			isRec = true;
			duration = 0;
			
			timer = setInterval(() => {
				duration++;
				if (duration >= MAX) stop();
			}, 1000);
		} catch (err) {
			/** @type {Error} */
			const e = err;
			error = e.name === 'NotAllowedError' 
				? 'Microphone access denied. Check browser permissions.'
				: 'Could not start recording. Ensure microphone is connected.';
			cleanup();
		}
	}

	function stop() {
		if (recorder && recorder.state !== 'inactive') {
			recorder.stop();
		}
	}

	function reset() {
		appState.audioBlob = null;
		error = null;
		cleanup();
	}

	function cleanup() {
		isRec = false;
		clearInterval(timer);
		if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
	}

	function upload(e) {
		const f = e.target.files[0];
		if (!f) return;
		appState.audioBlob = f;
		error = null;
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
	{:else if appState.audioBlob}
		<div class="state-block success">
			<div class="icon-circle success-bg">
				<Icon name="check" size={24} color="var(--primary)" />
			</div>
			<p>Audio recorded successfully</p>
			<button class="btn btn-outline" onclick={reset}>Record Again</button>
		</div>
	{:else}
		<div class="rec-block">
			<button class="rec-btn" class:recording={isRec} onclick={isRec ? stop : start}>
				<div class="rec-btn-inner">
					{#if isRec}
						<Icon name="stop" size={28} color="#fff" />
					{:else}
						<Icon name="mic" size={28} color="#fff" />
					{/if}
				</div>
			</button>
			<p class="rec-hint">{isRec ? `Recording... 0:${duration.toString().padStart(2,'0')}` : 'Tap to record baby\'s cry'}</p>
			
			{#if isRec}
				<div class="progress-wrap">
					<div class="progress-bar" style="width: {progress}%"></div>
				</div>
			{:else}
				<div class="or-divider"><span>or</span></div>
				<label class="upload-btn">
					<Icon name="upload" size={16} color="currentColor" />
					Upload audio file
					<input type="file" accept="audio/*" onchange={upload} hidden />
				</label>
			{/if}
		</div>
	{/if}
</div>

<style>
	.card-inner { padding:32px 24px; width:100%; display:flex; flex-direction:column; align-items:center; }

	.state-block { display:flex; flex-direction:column; align-items:center; gap:16px; text-align:center; }
	.state-block p { font-size:0.95rem; font-weight:500; color:var(--text); }
	
	.error { color:var(--blush); }

	.icon-circle {
		width:64px; height:64px; border-radius:50%;
		display:flex; align-items:center; justify-content:center;
	}
	.success-bg { background:var(--primary-soft); border:1px solid var(--primary-glow); }

	.btn {
		padding:10px 20px; border-radius:var(--r-sm); font-size:0.85rem; font-weight:600;
		transition:all 0.2s;
	}
	.btn-outline { border:1px solid var(--border); color:var(--text); }
	.btn-outline:hover { background:var(--surface-2); border-color:var(--text-dim); }

	.rec-block { display:flex; flex-direction:column; align-items:center; gap:16px; width:100%; max-width:320px; }
	
	.rec-btn {
		width:88px; height:88px; border-radius:50%;
		background:var(--surface-2); border:1px solid var(--border);
		display:flex; align-items:center; justify-content:center;
		transition:all 0.2s; position:relative;
	}
	.rec-btn-inner {
		width:72px; height:72px; border-radius:50%;
		background:var(--text);
		display:flex; align-items:center; justify-content:center;
		transition:all 0.2s;
	}
	.rec-btn:hover .rec-btn-inner { transform:scale(1.05); }
	
	.rec-btn.recording .rec-btn-inner { background:var(--red); border-radius:var(--r-md); }
	.rec-btn.recording::before {
		content:''; position:absolute; inset:-8px; border-radius:50%;
		border:2px solid var(--red); animation:pulse-ring 1.5s infinite;
	}

	.rec-hint { font-size:0.9rem; color:var(--text-soft); font-weight:500; }

	.progress-wrap { width:100%; height:4px; background:var(--border); border-radius:2px; overflow:hidden; }
	.progress-bar { height:100%; background:var(--red); transition:width 1s linear; }

	.or-divider {
		width:100%; text-align:center; position:relative; margin:8px 0;
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