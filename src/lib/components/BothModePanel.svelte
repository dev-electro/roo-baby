<script>
	import { appState } from '$state/appState.svelte.js';
	import { convertToWav, isSupportedAudioFormat } from '$utils/audioEncoder.js';
	import { downscaleImage } from '$utils/imageUtils.js';
	import { onDestroy } from 'svelte';
	import Icon from './Icon.svelte';

	/* ── Audio state ── */
	let aChunks=[], aStream=null, aRec=null, aTimer=null;
	let aElapsed=$state(0), aRecOn=$state(false);
	const MAX=10;

	/* ── Camera state ── */
	let vEl = $state(/** @type {HTMLVideoElement|undefined} */(undefined)), cEl = $state(/** @type {HTMLCanvasElement|undefined} */(undefined));
	let imgOk=$state(false), camOn=$state(false), imgFall=$state(false);
	let facing=$state('user'), camBusy=$state(false), camAsk=$state(false);
	let preview=$state(''), camDenied=$state(false);

	/* ──────────── Audio ──────────── */
	async function aStart(){
		try {
			aStream = await navigator.mediaDevices.getUserMedia({audio:true});
			aChunks=[]; aRec=new MediaRecorder(aStream);
			aRec.ondataavailable = e=>{if(e.data.size)aChunks.push(e.data)};
			aRec.onstop = async()=>{
				const rid=appState.resetId;
				const raw=new Blob(aChunks,{type:aRec.mimeType});
				await handleAudioInput(raw, rid);
			};
			aRec.start(); aRecOn=true; appState.isRecording=true; aElapsed=0;
			aTimer=setInterval(()=>{aElapsed++;if(aElapsed>=MAX)aStop()},1000);
		} catch{ appState.setError('Microphone needed') }
	}

	async function handleAudioInput(blob, rid) {
		let finalBlob = blob;
		if (!isSupportedAudioFormat(blob.type)) {
			appState.isConvertingAudio = true;
			try { finalBlob = await convertToWav(blob); } catch { /* keep original */ }
			finally { appState.isConvertingAudio = false; }
		}
		if (appState.resetId !== rid) return;
		appState.audioBlob = finalBlob;
		// processAudio handles spectrogram generation + spectrogramFailed flag
		if (aStream) { aStream.getTracks().forEach(t => t.stop()); aStream = null; }
		if (appState.resetId === rid) await appState.processAudio(finalBlob);
	}

	/** @type {HTMLInputElement|undefined} */ let aFileEl = $state(undefined);
	/** @type {HTMLInputElement|undefined} */ let cFileEl = $state(undefined);
	function pickAudio() { aFileEl?.click(); }
	function pickImage() { cFileEl?.click(); }

	function aUpload(e) {
		const f = e.target.files?.[0];
		if (f) {
			handleAudioInput(f, appState.resetId);
			if (aFileEl) aFileEl.value = '';
		}
	}

	function aStop(){ if(aRec?.state==='recording')aRec.stop(); clearInterval(aTimer); aRecOn=false; appState.isRecording=false; }
	function aTog(){ aRecOn?aStop():aStart(); }
	function aReset(){ appState.bumpReset(); appState.audioBlob=null; appState.spectrogramBlob=null; appState.setSpectrogramFailed(false); aElapsed=0; }

	/* ──────────── Camera ──────────── */
	function cReq(){ camAsk=true; cStart(); }
	async function cStart(){
		if(camOn||camBusy)return; if(imgOk||appState.imageBlob)return;
		camBusy=true; camDenied=false; cStop();
		try{
			const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:1280},height:{ideal:960}}});
			appState.cameraStream=s; camOn=true; camBusy=false;
			if(vEl){vEl.srcObject=s;try{await vEl.play()}catch{}}
		}catch(err){
			camBusy=false;
			if(err?.name==='NotAllowedError') camDenied=true;
			else imgFall=true;
		}
	}
	async function cFlip(){ facing=facing==='user'?'environment':'user'; if(camOn){camOn=false;await cStart()} }
	function cCapture(){
		if(!vEl||!cEl)return;
		const rid=appState.resetId;
		cEl.width=vEl.videoWidth||1280; cEl.height=vEl.videoHeight||960;
		cEl.getContext('2d').drawImage(vEl,0,0);
		cEl.toBlob(async b=>{
			if(b&&appState.resetId===rid){
				const scaled = await downscaleImage(b);
				if(appState.resetId!==rid) return;
				if(preview)URL.revokeObjectURL(preview);
				preview=URL.createObjectURL(scaled); appState.imageBlob=scaled; imgOk=true; cStop();
			}
		},'image/jpeg',.9)
	}
	async function cUpload(e){
		const f=e.target.files?.[0];
		if(f){
			const rid=appState.resetId;
			const scaled = await downscaleImage(f);
			if(appState.resetId!==rid) return;
			if(preview)URL.revokeObjectURL(preview);
			preview=URL.createObjectURL(scaled); appState.imageBlob=scaled; imgOk=true;
			imgFall=false; camDenied=false;
			cStop();
			if (cFileEl) cFileEl.value = '';
		}
	}
	function cRetake(){ appState.bumpReset(); if(preview)URL.revokeObjectURL(preview); preview=''; appState.imageBlob=null; imgOk=false; camAsk=false; imgFall=false; camOn=false; camDenied=false; }
	function cStop(){ if(appState.cameraStream){appState.cameraStream.getTracks().forEach(t=>t.stop());appState.cameraStream=null} camOn=false; }

	onDestroy(()=>{
		cStop(); clearInterval(aTimer);
		if(aRec?.state==='recording')aRec.stop();
		if(aStream)aStream.getTracks().forEach(t=>t.stop());
		if(preview)URL.revokeObjectURL(preview);
	});

	let aBarCount=16;
</script>

<div class="both">
	<!-- Step indicator -->
	<div class="flow">
		<div class="flow-step" class:done={!!appState.audioBlob} class:active={!appState.audioBlob}>
			<div class="flow-num">{appState.audioBlob ? '✓' : '1'}</div>
			<span>Record cry</span>
		</div>
		<div class="flow-line" class:done={!!appState.audioBlob}></div>
		<div class="flow-step" class:done={!!appState.imageBlob} class:active={!!appState.audioBlob && !appState.imageBlob}>
			<div class="flow-num">{appState.imageBlob ? '✓' : '2'}</div>
			<span>Capture face</span>
		</div>
	</div>

	<!-- Dual panels - Sequential flow -->
	<div class="panels">
		{#if !appState.audioBlob || aRecOn}
			<!-- Step 1: Audio -->
			<div class="panel animate-in">
				<div class="p-header">
					<div class="p-label"><Icon name="mic" size={16} color="var(--lavender)" /> Step 1: Audio Input</div>
					<p class="p-desc">Record or upload the baby's cry for spectrogram analysis</p>
				</div>
				
				<div class="a-wrap">
					<button class="a-btn" class:rec={aRecOn} onclick={aTog}>
						<Icon name={aRecOn?'stop':'mic'} size={32} color="#fff" />
					</button>
					
					{#if aRecOn}
						<div class="a-status">
							<div class="a-timer">0:{aElapsed.toString().padStart(2,'0')}</div>
							<div class="a-prog"><div class="a-prog-f" style="width:{(aElapsed/MAX)*100}%"></div></div>
						</div>
						<div class="a-wave">
							{#each Array(aBarCount) as _,i}<div class="a-bar" style="animation-delay:{i*.07}s"></div>{/each}
						</div>
					{:else}
						<div class="a-actions">
							<p class="a-hint">Tap to record live cry</p>
							<div class="a-or"><span>OR</span></div>
							<button class="btn-secondary" onclick={pickAudio}>
								<Icon name="upload" size={16} color="currentColor" />
								Upload audio file
							</button>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<!-- Step 2: Photo -->
			<div class="panel animate-in">
				<div class="p-header">
					<div class="p-label"><Icon name="camera" size={16} color="var(--mint)" /> Step 2: Visual Input</div>
					<p class="p-desc">Capture or upload a photo of the baby's face for emotional cues</p>
				</div>

				{#if imgOk && appState.imageBlob}
					<div class="done-preview">
						{#if preview}<img src={preview} alt="Captured face" class="thumb-lg" />{/if}
						<div class="done-info">
							<div class="done-badge"><Icon name="check" size={14} color="var(--mint)" /> Captured</div>
							<div class="act-row">
								<button class="btn-xs" onclick={cRetake}><Icon name="refresh" size={12} color="currentColor" /> Retake</button>
								<button class="btn-xs" onclick={pickImage}>
									<Icon name="upload" size={12} color="currentColor" /> Replace
								</button>
							</div>
						</div>
					</div>
				{:else if camDenied}
					<div class="cam-denied">
						<div class="denied-icon"><Icon name="warning" size={32} color="var(--error)" /></div>
						<p class="denied-t">Camera access blocked</p>
						<p class="denied-sub">Please allow camera or upload a photo</p>
						<div class="act-row">
							<button class="btn-secondary" onclick={() => { camDenied = false; cReq(); }}>Try again</button>
							<button class="btn-primary" onclick={pickImage}>
								<Icon name="upload" size={16} color="currentColor" /> Upload photo
							</button>
						</div>
					</div>
				{:else if imgFall}
					<div class="fall">
						<div class="fall-label" role="button" tabindex="0" onclick={pickImage} onkeydown={e=>e.key==='Enter'&&pickImage()}>
							<Icon name="upload" size={32} color="var(--lavender)" />
							<span class="fall-t">Upload baby's photo</span>
							<span class="fall-s">Clear, well-lit photo of the face</span>
						</div>
						<button class="btn-ghost" onclick={()=>{imgFall=false;cReq()}}>
							<Icon name="camera" size={14} color="currentColor" /> Use camera instead
						</button>
					</div>
				{:else if !camAsk}
					<div class="c-ask">
						<div class="c-ask-icon"><Icon name="camera" size={32} color="var(--mint)" /></div>
						<button class="btn-big" onclick={cReq}>Open Camera</button>
						<div class="a-or"><span>OR</span></div>
						<button class="btn-secondary" onclick={pickImage}>
							<Icon name="upload" size={16} color="currentColor" />
							Upload photo
						</button>
					</div>
				{:else}
					<div class="c-view-container">
						<div class="c-view">
							{#if camBusy}<div class="c-skeleton shimmer-bg"></div>{/if}
							<video bind:this={vEl} autoplay playsinline muted class="c-video" class:mirror={facing==='user'}></video>
							<div class="c-overlay">
								<svg viewBox="0 0 120 140" class="c-oval" aria-hidden="true">
									<ellipse cx="60" cy="70" rx="42" ry="54" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-dasharray="5 4"/>
								</svg>
								<p class="c-guide-t">Center baby's face</p>
							</div>
							<button class="c-flip" onclick={cFlip} aria-label="Flip camera"><Icon name="flip-camera" size={18} color="#fff" /></button>
							<button class="c-snap" onclick={cCapture} aria-label="Take photo">
								<div class="c-snap-i"></div>
							</button>
						</div>
						<button class="lk-upload" onclick={pickImage}>
							<Icon name="upload" size={14} color="currentColor" /> Upload instead
						</button>
					</div>
				{/if}
				
				<button class="btn-back" onclick={aReset}>
					<Icon name="arrow-left" size={14} color="currentColor" />
					Back to Step 1 (Audio)
				</button>
			</div>
		{/if}
	</div>
</div>
<!-- Persistent hidden file inputs — NEVER inside #if blocks.
     Prevents browser focus-restoration from auto-opening the dialog on tab switch. -->
<input bind:this={aFileEl} type="file" accept="audio/*" onchange={aUpload}
	style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;top:0;left:0"
	tabindex="-1" aria-hidden="true" />
<input bind:this={cFileEl} type="file" accept="image/*" onchange={cUpload}
	style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;top:0;left:0"
	tabindex="-1" aria-hidden="true" />
<canvas bind:this={cEl} style="display:none"></canvas>


<style>
	.both { display:flex; flex-direction:column; gap:20px; padding:20px; width:100%; max-width:500px; margin:0 auto; }

	/* Flow stepper */
	.flow { display:flex; align-items:center; justify-content:center; padding:10px 0; }
	.flow-step { display:flex; flex-direction:column; align-items:center; gap:8px; font-size:.75rem; font-weight:700; color:var(--text-dim); transition:all .3s; }
	.flow-step.active { color:var(--lavender); transform: scale(1.05); }
	.flow-step.done   { color:var(--mint); }
	.flow-num {
		width:32px; height:32px; border-radius:50%;
		display:flex; align-items:center; justify-content:center;
		font-size:.85rem; font-weight:800; background:var(--surface-3);
		border: 1px solid var(--border);
		transition:all .3s;
	}
	.flow-step.active .flow-num { background:var(--lavender); color:#fff; border-color:var(--lavender); box-shadow:0 0 15px var(--lav-glow); }
	.flow-step.done   .flow-num { background:var(--mint); color:#fff; border-color:var(--mint); }
	.flow-line { flex:1; max-width:60px; height:2px; background:var(--border); margin:0 15px; margin-top: -20px; border-radius:1px; }
	.flow-line.done { background:var(--mint); }

	/* Panels */
	.panels { width:100%; min-height:380px; display:flex; flex-direction:column; }
	.panel { 
		width:100%; display:flex; flex-direction:column; gap:24px; 
		background:var(--surface-2); padding:24px; border-radius:var(--r-xl);
		border: 1px solid var(--border); box-shadow: var(--shadow-sm);
	}
	.p-header { display:flex; flex-direction:column; gap:6px; }
	.p-label { font-size:.9rem; font-weight:800; color:var(--text); display:flex; align-items:center; gap:8px; }
	.p-desc { font-size:.8rem; color:var(--text-2); line-height:1.4; }

	/* Audio */
	.a-wrap { display:flex; flex-direction:column; align-items:center; gap:20px; padding:10px 0; }
	.a-btn {
		width:88px; height:88px; border-radius:50%;
		background:linear-gradient(135deg, var(--lavender), var(--indigo));
		box-shadow:0 10px 30px var(--lav-glow);
		display:flex; align-items:center; justify-content:center;
		transition:all .2s; border:none; cursor:pointer;
	}
	.a-btn:hover { transform:scale(1.08); filter:brightness(1.1); }
	.a-btn:active { transform:scale(.92); }
	.a-btn.rec {
		background:linear-gradient(135deg, #FF4B6E, #D03050);
		box-shadow:0 10px 30px var(--blush-glow);
		animation:pulse-red 1.5s infinite;
	}
	@keyframes pulse-red { 
		0% { box-shadow: 0 0 0 0 rgba(255,75,110,0.4); }
		70% { box-shadow: 0 0 0 20px rgba(255,75,110,0); }
		100% { box-shadow: 0 0 0 0 rgba(255,75,110,0); }
	}

	.a-status { display:flex; flex-direction:column; align-items:center; gap:8px; width:100%; }
	.a-timer { font-family:'Fraunces',serif; font-size:1.4rem; color:var(--error); font-weight:800; letter-spacing:1px; }
	.a-prog { width:120px; height:4px; background:var(--border); border-radius:2px; overflow:hidden; }
	.a-prog-f { height:100%; background:var(--error); transition:width .3s linear; }
	.a-actions { display:flex; flex-direction:column; align-items:center; gap:16px; width:100%; }
	.a-hint { font-size:.85rem; color:var(--text-2); font-weight:600; }
	.a-or { display:flex; align-items:center; width:100%; gap:12px; }
	.a-or::before, .a-or::after { content:''; flex:1; height:1px; background:var(--border); }
	.a-or span { font-size:.65rem; font-weight:800; color:var(--text-3); letter-spacing:.05em; }

	.a-wave { display:flex; align-items:center; gap:3px; height:40px; }
	.a-bar { width:4px; border-radius:2px; background:var(--lavender); animation:wave-anim .8s ease-in-out infinite; transform-origin:center; min-height:4px; }
	@keyframes wave-anim { 0%, 100% { height:4px; } 50% { height:36px; } }

	/* Photo */
	.done-preview { display:flex; flex-direction:column; gap:16px; align-items:center; width:100%; }
	.thumb-lg { width:100%; max-height:240px; object-fit:cover; border-radius:var(--r-lg); border:2px solid var(--mint); }
	.done-info { display:flex; flex-direction:column; align-items:center; gap:12px; width:100%; }
	.done-badge { display:flex; align-items:center; gap:6px; font-size:.85rem; font-weight:800; color:var(--mint); }
	.act-row { display:flex; gap:10px; flex-wrap:wrap; justify-content:center; }

	.c-ask { display:flex; flex-direction:column; align-items:center; gap:16px; padding:10px 0; }
	.c-ask-icon { width:72px; height:72px; border-radius:var(--r-xl); background:var(--mint-soft); display:flex; align-items:center; justify-content:center; }
	.btn-big {
		padding:14px 32px; border-radius:var(--r-pill); font-size:.95rem; font-weight:800;
		background:linear-gradient(135deg, var(--mint), var(--lavender)); color:#fff;
		box-shadow:0 8px 24px var(--mint-glow); border:none; cursor:pointer; transition:transform .2s;
	}
	.btn-big:hover { transform:translateY(-2px); filter:brightness(1.05); }

	.c-view-container { display:flex; flex-direction:column; gap:12px; width:100%; }
	.c-view { position:relative; width:100%; aspect-ratio:3/4; max-height:78vw; border-radius:var(--r-lg); overflow:hidden; background:#000; box-shadow:var(--shadow-md); }
	@media(min-width: 480px) { .c-view { max-height: 420px; } }
	.c-video { width:100%; height:100%; object-fit:cover; }
	.c-video.mirror { transform:scaleX(-1); }
	.c-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; }
	.c-oval { width:70%; opacity:.5; }
	.c-guide-t { color:rgba(255,255,255,0.6); font-size:.7rem; font-weight:700; margin-top:10px; }
	.c-flip { position:absolute; top:12px; right:12px; width:44px; height:44px; border-radius:50%; background:rgba(0,0,0,0.5); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; border:none; cursor:pointer; }
	.c-snap { position:absolute; bottom:20px; left:50%; transform:translateX(-50%); width:68px; height:68px; border-radius:50%; background:rgba(255,255,255,0.2); backdrop-filter:blur(5px); border:4px solid #fff; display:flex; align-items:center; justify-content:center; cursor:pointer; }
	.c-snap-i { width:52px; height:52px; border-radius:50%; background:#fff; transition:transform .1s; }
	.c-snap:active .c-snap-i { transform:scale(0.85); }

	.lk-upload { font-size:.8rem; color:var(--text-2); cursor:pointer; display:flex; align-items:center; gap:6px; justify-content:center; font-weight:700; margin-top:4px; }
	.lk-upload:hover { color:var(--lavender); }

	/* General components */
	.btn-secondary {
		padding:12px 24px; border-radius:var(--r-pill); font-size:.85rem; font-weight:700;
		background:var(--surface-3); color:var(--text-2); border:1px solid var(--border);
		cursor:pointer; transition:all .2s; display:inline-flex; align-items:center; gap:8px;
	}
	.btn-secondary:hover { background:var(--surface-4); border-color:var(--lavender); color:var(--text); }
	
	.btn-primary {
		padding:12px 24px; border-radius:var(--r-pill); font-size:.85rem; font-weight:700;
		background:var(--lavender); color:#fff; border:none;
		cursor:pointer; transition:all .2s; display:inline-flex; align-items:center; gap:8px;
	}

	.btn-xs {
		padding:6px 14px; border-radius:var(--r-md); font-size:.75rem; font-weight:700;
		color:var(--text-2); border:1px solid var(--border); background:var(--surface-3);
		cursor:pointer; display:inline-flex; align-items:center; gap:6px;
	}
	
	.btn-ghost {
		background:none; border:none; padding:8px; font-size:.75rem; font-weight:700;
		color:var(--text-3); cursor:pointer; text-decoration:underline;
	}

	.btn-back {
		margin-top:auto; padding:12px; border:none; background:none;
		font-size:.8rem; font-weight:700; color:var(--text-3);
		display:flex; align-items:center; justify-content:center; gap:8px;
		cursor:pointer; transition:color .2s;
	}
	.btn-back:hover { color:var(--lavender); }


	
	.fall { display:flex; flex-direction:column; align-items:center; gap:16px; width:100%; }
	.fall-label {
		width:100%; padding:40px 20px; border:2px dashed var(--border); border-radius:var(--r-xl);
		display:flex; flex-direction:column; align-items:center; gap:12px; cursor:pointer;
		transition:all .2s;
	}
	.fall-label:hover { border-color:var(--lavender); background:var(--lav-soft); }
	.fall-t { font-size:1rem; font-weight:800; color:var(--text); }
	.fall-s { font-size:.75rem; color:var(--text-2); }

	.cam-denied { display:flex; flex-direction:column; align-items:center; gap:12px; text-align:center; padding:20px; }
	.denied-t { font-size:1.1rem; font-weight:800; color:var(--text); }
	.denied-sub { font-size:.85rem; color:var(--text-2); }

	.shimmer-bg { background:linear-gradient(90deg, #111 25%, #222 50%, #111 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; }
	@keyframes shimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
</style>
