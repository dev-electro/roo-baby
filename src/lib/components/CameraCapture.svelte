<script>
	import { appState } from '$state/appState.svelte.js';
	import { onDestroy } from 'svelte';
	import { capturePhoto as trackPhoto } from '$utils/analytics.js';
	import Icon from './Icon.svelte';

	let videoEl, canvasEl, preview = $state(''), fallback = $state(false), active = $state(false);
	let facing = $state('user'), busy = $state(false), asked = $state(false);

	function req() { asked = true; start(); }

	async function start() {
		if (active || busy) return;
		if (appState.imageBlob) return;
		busy = true; stopStream();
		try {
			const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } } });
			appState.cameraStream = s;
			active = true; busy = false;
			if (videoEl) { videoEl.srcObject = s; try { await videoEl.play() } catch {} }
		} catch { busy = false; fallback = true; }
	}

	async function flip() { facing = facing === 'user' ? 'environment' : 'user'; if (active) { active = false; await start() } }

	function capture() {
		if (!videoEl || !canvasEl) return;
		const rid = appState.resetId;
		canvasEl.width = videoEl.videoWidth || 640;
		canvasEl.height = videoEl.videoHeight || 480;
		canvasEl.getContext('2d').drawImage(videoEl, 0, 0);
		canvasEl.toBlob(b => {
			if (b && appState.resetId === rid) {
				if (preview) URL.revokeObjectURL(preview);
				preview = URL.createObjectURL(b);
				appState.imageBlob = b;
				stopStream();
				trackPhoto('camera');
			}
		}, 'image/jpeg', .9);
	}

	function upload(e) { const f = e.target.files[0]; if (f) { if (preview) URL.revokeObjectURL(preview); preview = URL.createObjectURL(f); appState.imageBlob = f; trackPhoto('upload'); } }

	function retake() { if (preview) URL.revokeObjectURL(preview); preview = ''; appState.imageBlob = null; fallback = false; active = false; asked = false; }

	function stopStream() { if (appState.cameraStream) { appState.cameraStream.getTracks().forEach(t => t.stop()); appState.cameraStream = null; } active = false; }

	onDestroy(() => { stopStream(); if (preview) URL.revokeObjectURL(preview); });
</script>

<div class="c">
	{#if appState.imageBlob && preview}
		<div class="c-preview animate-scale">
			<div class="c-preview-img"><img src={preview} alt="Captured" /></div>
			<div class="c-preview-label"><Icon name="check" size={18} color="var(--teal)" /> Image captured</div>
			<div class="c-row">
				<button class="c-btn" onclick={retake}><Icon name="refresh" size={14} color="currentColor" /> Retake</button>
				<label class="c-btn c-upload"><Icon name="upload" size={14} color="currentColor" /> Upload different<input type="file" accept="image/jpeg,image/png" onchange={upload} class="c-hidden" /></label>
			</div>
		</div>
	{:else if fallback}
		<div class="c-fallback">
			<label class="c-fb-label">
				<div class="c-fb-icon"><Icon name="upload" size={14} color="currentColor" /></div>
				<div class="c-fb-text">Upload a baby photo</div>
				<div class="c-fb-sub">JPG or PNG, well‑lit</div>
				<input type="file" accept="image/jpeg,image/png" onchange={upload} class="c-hidden" />
			</label>
			<button class="c-btn" onclick={() => { fallback = false; req(); }}><Icon name="camera" size={18} color="currentColor" /> Try camera instead</button>
		</div>
	{:else if !asked}
		<div class="c-ask">
			<div class="c-ask-icon"><Icon name="camera" size={18} color="currentColor" /></div>
			<div class="c-ask-text">Enable camera to capture baby's face</div>
			<div class="c-ask-sub">Helps ROO analyse expressions</div>
			<button class="c-big" onclick={req}><Icon name="camera" size={18} color="currentColor" /> Enable Camera</button>
			<label class="c-link"><Icon name="upload" size={14} color="currentColor" /> Or upload photo<input type="file" accept="image/jpeg,image/png" onchange={upload} class="c-hidden" /></label>
		</div>
	{:else}
		<div class="c-view">
			<video bind:this={videoEl} autoplay playsinline muted class="c-video" class:mirror={facing === 'user'}></video>
			<div class="c-guide">
				<svg viewBox="0 0 120 140" class="c-oval"><ellipse cx="60" cy="70" rx="45" ry="58" fill="none" stroke="var(--pink)" stroke-width="2" stroke-dasharray="5 5" opacity=".35"/></svg>
			</div>
			<button class="c-flip" onclick={flip}><Icon name="flip-camera" size={14} color="#fff" /></button>
			<button class="c-snap" onclick={capture}><Icon name="camera" size={18} color="currentColor" /></button>
		</div>
		<label class="c-link"><Icon name="upload" size={14} color="currentColor" /> Upload photo<input type="file" accept="image/jpeg,image/png" onchange={upload} class="c-hidden" /></label>
	{/if}
	<canvas bind:this={canvasEl} style="display:none"></canvas>
</div>

<style>
	.c{display:flex;flex-direction:column;align-items:center;padding:20px;gap:12px;width:100%}
	.c-view{position:relative;width:100%;max-width:340px;aspect-ratio:4/3;border-radius:var(--radius);overflow:hidden;background:var(--card-border)}
	.c-video{width:100%;height:100%;object-fit:cover}.c-video.mirror{transform:scaleX(-1)}
	.c-guide{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
	.c-oval{width:65%;height:75%}
	.c-flip{position:absolute;top:8px;right:8px;width:34px;height:34px;border-radius:50%;background:rgba(0,0,0,.4);font-size:.9rem;display:flex;align-items:center;justify-content:center;z-index:3}
	.c-snap{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,var(--pink),var(--gold));font-size:1.2rem;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 18px rgba(255,107,122,.3);z-index:2}
	.c-snap:hover{transform:translateX(-50%) scale(1.08)}

	.c-preview{display:flex;flex-direction:column;align-items:center;gap:8px;width:100%}
	.c-preview-img{max-width:300px;border-radius:var(--radius-sm);overflow:hidden;border:2px solid var(--teal)}
	.c-preview-img img{width:100%}
	.c-preview-label{font-size:.8rem;font-weight:700;color:var(--teal)}
	.c-row{display:flex;gap:8px}
	.c-btn{padding:8px 18px;border-radius:100px;font-size:.78rem;font-weight:700;color:var(--text-soft);border:1px solid var(--card-border);background:var(--card-bg);transition:all .15s;display:inline-flex;align-items:center;gap:4px;position:relative}
	.c-btn:hover{border-color:var(--pink);color:var(--text)}
	.c-ask,.c-fallback{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px}
	.c-ask-icon,.c-fb-icon{font-size:2.2rem}
	.c-ask-text{font-size:.88rem;font-weight:700;color:var(--text)}
	.c-ask-sub{font-size:.72rem;color:var(--text-soft);margin-bottom:4px}
	.c-big{padding:12px 28px;border-radius:100px;font-size:.9rem;font-weight:700;background:linear-gradient(135deg,var(--pink),var(--gold));color:#fff;box-shadow:0 4px 16px rgba(255,107,122,.25);transition:transform .15s}
	.c-big:hover{transform:translateY(-1px)}
	.c-link{font-size:.75rem;color:var(--text-soft);font-weight:600;position:relative;cursor:pointer;padding:6px 12px;border-radius:8px;transition:all .15s}
	.c-link:hover{color:var(--text);background:var(--card-bg)}
	.c-fb-label{display:flex;flex-direction:column;align-items:center;gap:4px;padding:28px 32px;border:2px dashed var(--card-border);border-radius:var(--radius);background:var(--card-bg);cursor:pointer;position:relative;transition:border-color .15s}
	.c-fb-label:hover{border-color:var(--pink)}
	.c-fb-text{font-size:.9rem;font-weight:700;color:var(--text)}
	.c-fb-sub{font-size:.7rem;color:var(--text-soft)}
	.c-hidden{position:absolute;inset:0;opacity:0;cursor:pointer}
</style>