<script>
	import { appState } from '$state/appState.svelte.js';
	import { convertToWav, isSupportedAudioFormat } from '$utils/audioEncoder.js';
	import { downscaleImage } from '$utils/imageUtils.js';
	import { trackInputCapture, trackPermissionDenied } from '$utils/analytics.js';
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
				trackInputCapture('audio', 'record');
				await handleAudioInput(raw, rid);
			};
			aRec.start(); aRecOn=true; appState.isRecording=true; aElapsed=0;
			aTimer=setInterval(()=>{aElapsed++;if(aElapsed>=MAX)aStop()},1000);
		} catch{ appState.setError('Microphone needed'); trackPermissionDenied('audio'); }
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
			trackInputCapture('audio', 'upload');
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
			if(err?.name==='NotAllowedError') { camDenied=true; trackPermissionDenied('camera'); }
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
				trackInputCapture('image', 'camera');
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
			trackInputCapture('image', 'upload');
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
	<!-- Step progress bar -->
	<div class="flow">
		<div class="flow-step" class:done={!!appState.audioBlob} class:active={!appState.audioBlob}>
			<div class="flow-num">{appState.audioBlob ? '✓' : '1'}</div>
			<span>Record cry</span>
		</div>
		<div class="flow-line" class:done={!!appState.audioBlob && !!appState.imageBlob}></div>
		<div class="flow-step" class:done={!!appState.imageBlob} class:active={!appState.imageBlob}>
			<div class="flow-num">{appState.imageBlob ? '✓' : '2'}</div>
			<span>Baby's face</span>
		</div>
	</div>

	<!-- ── Step 1: Audio — always visible ──────────────────────── -->
	<div class="block block-audio" class:block-done={!!appState.audioBlob}>
		<div class="block-head">
			<div class="block-head-left">
				<div class="step-dot emerald">{appState.audioBlob ? '✓' : '1'}</div>
				<p class="block-title">Record the Cry</p>
			</div>
			{#if appState.audioBlob}
				<span class="badge badge-success">✓ Captured</span>
			{:else}
				<span class="badge badge-emerald">Tap mic</span>
			{/if}
		</div>

		{#if appState.audioBlob}
			<!-- Captured: show spectrogram thumbnail + redo -->
			<div class="captured-row">
				{#if appState.spectrogramBlob}
					<img src={URL.createObjectURL(appState.spectrogramBlob)} alt="Spectrogram" class="a-spec-thumb" />
				{:else}
					<div class="a-spec-placeholder"><Icon name="mic" size={22} color="var(--success)" /></div>
				{/if}
				<div class="captured-info">
					<p class="captured-title">{appState.isGeneratingSpectrogram ? 'Generating spectrogram…' : 'Cry captured'}</p>
					<p class="captured-sub">Mel spectrogram ready for AI</p>
				</div>
				<button class="redo-btn" onclick={aReset} title="Record again">
					<Icon name="refresh" size={15} color="currentColor" />
				</button>
			</div>
		{:else if aRecOn}
			<!-- Recording in progress -->
			<div class="a-rec">
				<button class="a-stop-btn" onclick={aStop}>
					<Icon name="stop" size={22} color="#fff" />
					Stop Recording
				</button>
				<div class="a-timer-row">
					<div class="rec-dot"></div>
					<span class="a-timer">0:{aElapsed.toString().padStart(2,'0')}</span>
					<span class="a-timer-max">/ 0:10</span>
					<div class="a-prog"><div class="a-prog-f" style="width:{(aElapsed/MAX)*100}%"></div></div>
				</div>
				<div class="a-wave">
					{#each Array(aBarCount) as _,i}<div class="a-bar" style="animation-delay:{i*.07}s"></div>{/each}
				</div>
			</div>
		{:else}
			<!-- Idle: big mic button -->
			<div class="a-idle">
				<button class="a-mic-btn" onclick={aStart}>
					<div class="a-ping"></div>
					<div class="a-ping" style="animation-delay:.8s"></div>
					<Icon name="mic" size={32} color="#fff" />
				</button>
				<p class="a-idle-cta">Tap to Record Cry</p>
				<p class="a-idle-sub">Up to 10 seconds · Stays on device</p>
				<div class="or-divider"><span>or</span></div>
				<button class="btn-upload" onclick={pickAudio}>
					<Icon name="upload" size={15} color="currentColor" />
					Upload audio file
				</button>
				<p class="upload-hint">MP3, WAV, M4A, WebM</p>
			</div>
		{/if}
	</div>

	<!-- ── Step 2: Photo — always visible ──────────────────────── -->
	<div class="block block-camera" class:block-done={!!appState.imageBlob}>
		<div class="block-head">
			<div class="block-head-left">
				<div class="step-dot sky">{appState.imageBlob ? '✓' : '2'}</div>
				<p class="block-title">Baby's Face</p>
			</div>
			{#if appState.imageBlob}
				<span class="badge badge-success">✓ Captured</span>
			{:else}
				<span class="badge badge-sky">Camera or upload</span>
			{/if}
		</div>

		{#if imgOk && appState.imageBlob}
			<div class="captured-row cam">
				{#if preview}<img src={preview} alt="Captured face" class="face-thumb" />{/if}
				<div class="captured-info">
					<p class="captured-title">Photo captured</p>
					<p class="captured-sub">Face analysis ready</p>
				</div>
				<div class="cam-acts">
					<button class="redo-btn" onclick={cRetake} title="Retake"><Icon name="refresh" size={15} color="currentColor" /></button>
					<button class="redo-btn" onclick={pickImage} title="Replace photo"><Icon name="upload" size={15} color="currentColor" /></button>
				</div>
			</div>
		{:else if camDenied}
			<div class="cam-denied">
				<div class="denied-icon"><Icon name="warning" size={28} color="var(--error)" /></div>
				<p class="denied-t">Camera access blocked</p>
				<p class="denied-sub">Allow camera in browser settings, or upload a photo instead.</p>
				<div class="act-row">
					<button class="btn-xs" onclick={() => { camDenied = false; cReq(); }}><Icon name="refresh" size={12} color="currentColor" /> Try again</button>
					<button class="btn-xs accent" onclick={pickImage}><Icon name="upload" size={12} color="currentColor" /> Upload photo</button>
				</div>
			</div>
		{:else if imgFall}
			<div class="fall">
				<div class="fall-label" role="button" tabindex="0" onclick={pickImage} onkeydown={e=>e.key==='Enter'&&pickImage()}>
					<Icon name="upload" size={30} color="var(--sky)" />
					<span class="fall-t">Upload baby's photo</span>
					<span class="fall-s">Clear, well-lit photo of the face · JPG, PNG, WebP</span>
					<span class="fall-cta">Choose photo</span>
				</div>
				<button class="btn-ghost" onclick={()=>{imgFall=false;cReq()}}>
					<Icon name="camera" size={13} color="currentColor" /> Try camera instead
				</button>
			</div>
		{:else if !camAsk}
			<!-- Camera idle: matches old premium look -->
			<div class="c-idle">
				<div class="c-idle-icon">
					<Icon name="camera" size={32} color="var(--sky)" />
				</div>
				<p class="c-idle-cta">Capture Baby's Face</p>
				<p class="c-idle-sub">Point camera at baby for emotional cues — works best in good light</p>
				<button class="c-open-btn" onclick={cReq}>
					<Icon name="camera" size={20} color="#fff" />
					Open Camera
				</button>
				<div class="or-divider"><span>or</span></div>
				<button class="btn-upload" onclick={pickImage}>
					<Icon name="upload" size={15} color="currentColor" />
					Upload a photo instead
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
					<button class="c-snap" onclick={cCapture} aria-label="Take photo"><div class="c-snap-i"></div></button>
				</div>
				<button class="lk-upload" onclick={pickImage}>
					<Icon name="upload" size={13} color="currentColor" /> Upload instead
				</button>
			</div>
		{/if}
	</div>
</div>
<!-- Persistent hidden file inputs — NEVER inside #if blocks -->
<input bind:this={aFileEl} type="file" accept="audio/*" onchange={aUpload}
	style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;top:0;left:0"
	tabindex="-1" aria-hidden="true" />
<input bind:this={cFileEl} type="file" accept="image/*" onchange={cUpload}
	style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;top:0;left:0"
	tabindex="-1" aria-hidden="true" />
<canvas bind:this={cEl} style="display:none"></canvas>

<style>
	.both { display:flex; flex-direction:column; gap:20px; width:100%; }

	/* Flow stepper */
	.flow { display:flex; align-items:center; justify-content:center; padding:0 0 10px 0; }
	.flow-step { display:flex; flex-direction:column; align-items:center; gap:6px; font-size:.78rem; font-weight:800; color:var(--text-2); transition:all .3s; }
	.flow-step.active { color:var(--text); transform:scale(1.05); }
	.flow-step.done   { color:var(--success); }
	.flow-num {
		width:32px; height:32px; border-radius:50%;
		display:flex; align-items:center; justify-content:center;
		font-size:.85rem; font-weight:800; background:var(--surface-2);
		border: 2px solid var(--border); transition:all .3s;
	}
	.flow-step.active .flow-num { background:var(--accent); color:#fff; border-color:var(--accent); box-shadow:0 0 12px var(--accent-glow); }
	.flow-step.done   .flow-num { background:var(--success); color:#fff; border-color:var(--success); }
	.flow-line { flex:1; max-width:80px; height:2px; background:var(--border); margin:0 16px; margin-top:-16px; border-radius:1px; }
	.flow-line.done { background:var(--success); }

	/* Panels — use the same .block system as the main page */
	.block {
		background:var(--surface); border:1px solid var(--border);
		border-radius:var(--r-xl); overflow:hidden;
		transition:border-color .25s;
	}
	.block-audio  { border-left:3px solid var(--emerald); }
	.block-camera { border-left:3px solid var(--sky); }
	.block.block-done.block-audio  { border-left-color:var(--success); }
	.block.block-done.block-camera { border-left-color:var(--success); }

	.block-head {
		display:flex; align-items:center; justify-content:space-between;
		padding:13px 16px; border-bottom:1px solid var(--border);
	}
	.block-head-left { display:flex; align-items:center; gap:10px; }
	.block-title { font-size:.88rem; font-weight:800; color:var(--text); }

	.step-dot {
		width:24px; height:24px; border-radius:50%; flex-shrink:0;
		font-size:.62rem; font-weight:800;
		display:flex; align-items:center; justify-content:center;
	}
	.step-dot.emerald { background:var(--emerald-bg); border:1px solid var(--emerald-border); color:var(--emerald); }
	.step-dot.sky     { background:var(--sky-bg);     border:1px solid var(--sky-border);     color:var(--sky); }

	/* Badges */
	.badge {
		display:inline-flex; align-items:center; gap:4px;
		padding:3px 10px; border-radius:var(--r-pill);
		font-size:.62rem; font-weight:800; letter-spacing:.03em;
		border:1px solid;
	}
	.badge-success { background:var(--success-bg); color:var(--success); border-color:var(--success-border); }
	.badge-emerald { background:var(--emerald-bg); color:var(--emerald); border-color:var(--emerald-border); }
	.badge-sky     { background:var(--sky-bg);     color:var(--sky);     border-color:var(--sky-border); }

	/* ── Audio idle: BIG centered mic ── */
	.a-idle {
		display:flex; flex-direction:column; align-items:center; gap:12px;
		padding:28px 20px 20px;
	}
	.a-mic-btn {
		width:96px; height:96px; border-radius:50%;
		background:var(--accent); position:relative;
		display:flex; align-items:center; justify-content:center;
		transition:transform .15s, box-shadow .15s;
		box-shadow:0 8px 28px var(--accent-glow);
	}
	.a-mic-btn:hover  { transform:scale(1.06); }
	.a-mic-btn:active { transform:scale(.95); }
	.a-ping {
		position:absolute; inset:-8px; border-radius:50%;
		border:2px solid var(--accent-border);
		animation:ping 2.2s ease-out infinite;
	}
	.a-idle-cta { font-size:1.05rem; font-weight:800; color:var(--text); }
	.a-idle-sub { font-size:.72rem; color:var(--text-3); }

	/* or divider */
	.or-divider {
		display:flex; align-items:center; width:100%; gap:10px; margin:2px 0;
	}
	.or-divider::before,.or-divider::after { content:''; flex:1; height:1px; background:var(--border); }
	.or-divider span { font-size:.65rem; font-weight:800; color:var(--text-3); letter-spacing:.06em; }

	/* Upload button */
	.btn-upload {
		display:inline-flex; align-items:center; gap:8px;
		padding:10px 22px; border-radius:var(--r-pill);
		font-size:.84rem; font-weight:700;
		background:var(--surface-2); color:var(--text-2);
		border:1px solid var(--border); cursor:pointer; transition:all .15s;
	}
	.btn-upload:hover { background:var(--surface-3); border-color:var(--accent-border); color:var(--text); }
	.upload-hint { font-size:.62rem; color:var(--text-3); }

	/* ── Recording state ── */
	.a-rec { display:flex; flex-direction:column; gap:14px; padding:20px; }
	.a-stop-btn {
		display:flex; align-items:center; justify-content:center; gap:8px;
		width:100%; height:56px; border-radius:var(--r-lg);
		font-size:1rem; font-weight:800;
		background:var(--error-bg); color:var(--error);
		border:1px solid var(--error-border); transition:background .12s;
	}
	.a-stop-btn:hover { background:rgba(239,68,68,.18); }
	.a-timer-row { display:flex; align-items:center; gap:10px; }
	.rec-dot { width:10px; height:10px; border-radius:50%; background:var(--error); animation:pulse 1s ease-in-out infinite; flex-shrink:0; }

	/* ── Captured row (audio + camera) ── */
	.captured-row {
		display:flex; align-items:center; gap:12px; padding:14px 16px;
	}
	.a-spec-thumb { width:80px; height:44px; object-fit:contain; border-radius:var(--r-md); border:1px solid var(--border); background:#000; flex-shrink:0; }
	.a-spec-placeholder { width:80px; height:44px; border-radius:var(--r-md); background:var(--success-bg); border:1px solid var(--success-border); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
	.captured-info { flex:1; }
	.captured-title { font-size:.88rem; font-weight:800; color:var(--text); }
	.captured-sub   { font-size:.72rem; color:var(--text-2); margin-top:2px; }
	.redo-btn {
		width:36px; height:36px; border-radius:var(--r-md); flex-shrink:0;
		display:flex; align-items:center; justify-content:center;
		color:var(--text-3); transition:all .12s;
	}
	.redo-btn:hover { background:var(--surface-2); color:var(--text); }
	.cam-acts { display:flex; flex-direction:column; gap:4px; }
	.face-thumb { width:60px; height:60px; object-fit:cover; border-radius:var(--r-lg); border:2px solid var(--border); flex-shrink:0; }

	/* ── Camera idle: premium centered layout ── */
	.c-idle {
		display:flex; flex-direction:column; align-items:center; gap:14px;
		padding:28px 20px 20px; text-align:center;
	}
	.c-idle-icon {
		width:80px; height:80px; border-radius:var(--r-2xl);
		background:var(--sky-bg); border:1px solid var(--sky-border);
		display:flex; align-items:center; justify-content:center;
	}
	.c-idle-cta { font-size:1.1rem; font-weight:800; color:var(--text); }
	.c-idle-sub { font-size:.8rem; color:var(--text-2); line-height:1.5; max-width:280px; }
	.c-open-btn {
		display:flex; align-items:center; gap:10px;
		padding:16px 40px; border-radius:var(--r-xl); min-height:56px;
		font-size:1.05rem; font-weight:800;
		background:var(--accent); color:#fff;
		box-shadow:var(--shadow-glow); transition:transform .12s, box-shadow .15s;
	}
	.c-open-btn:hover  { transform:scale(1.03); }
	.c-open-btn:active { transform:scale(.97); }

	.a-spec-thumb { width:80px; height:40px; object-fit:contain; border-radius:var(--r-md); border:1px solid var(--border); background:#000; }
	.a-spec-placeholder { width:80px; height:40px; border-radius:var(--r-md); background:var(--success-bg); border:1px solid var(--success-border); display:flex; align-items:center; justify-content:center; }
	.a-timer-max { font-size:.7rem; color:var(--text-3); font-weight:400; }

	.a-timer { font-family:'Fraunces',serif; font-size:1.4rem; color:var(--error); font-weight:800; letter-spacing:1px; }
	.a-prog { width:120px; height:4px; background:var(--border); border-radius:2px; overflow:hidden; }
	.a-prog-f { height:100%; background:var(--error); transition:width .3s linear; }

	.a-wave { display:flex; align-items:center; gap:3px; height:40px; }
	.a-bar { width:4px; border-radius:2px; background:var(--lavender); animation:wave-anim .8s ease-in-out infinite; transform-origin:center; min-height:4px; }
	@keyframes wave-anim { 0%, 100% { height:4px; } 50% { height:36px; } }

	/* Photo */
	.act-row { display:flex; gap:10px; flex-wrap:wrap; justify-content:center; }

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

	.btn-xs {
		padding:6px 14px; border-radius:var(--r-md); font-size:.75rem; font-weight:700;
		color:var(--text-2); border:1px solid var(--border); background:var(--surface-3);
		cursor:pointer; display:inline-flex; align-items:center; gap:6px;
	}
	
	.btn-ghost {
		background:none; border:none; padding:8px; font-size:.75rem; font-weight:700;
		color:var(--text-3); cursor:pointer; text-decoration:underline;
	}

	
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

	.shimmer-bg { background:linear-gradient(90deg, #111 25%, #222 50%, #111 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; }
	@keyframes shimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
</style>
