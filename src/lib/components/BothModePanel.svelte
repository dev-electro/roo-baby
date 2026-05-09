<script>
	import { appState } from '$state/appState.svelte.js';
	import { convertToWav, isSupportedAudioFormat } from '$utils/audioEncoder.js';
	import { generateSpectrogram } from '$utils/spectrogramGenerator.js';
	import { onDestroy } from 'svelte';
	import Icon from './Icon.svelte';

	/* ── Audio state ── */
	let aChunks=[], aStream=null, aRec=null, aTimer=null;
	let aElapsed=$state(0), aRecOn=$state(false);
	const MAX=10;

	/* ── Camera state ── */
	let vEl, cEl;
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
				if(isSupportedAudioFormat(raw.type)){appState.audioBlob=raw}
				else{
					appState.isConvertingAudio=true;
					try{ const wav=await convertToWav(raw); if(appState.resetId!==rid)return; appState.audioBlob=wav; }
					catch{ appState.setError('Conversion failed') }
					finally{ appState.isConvertingAudio=false }
				}
				aStream.getTracks().forEach(t=>t.stop()); aStream=null;
				if(appState.audioBlob && appState.resetId===rid){
					appState.isGeneratingSpectrogram=true;
					try{ const sg=await generateSpectrogram(appState.audioBlob); if(appState.resetId!==rid)return; appState.spectrogramBlob=sg; appState.setSpectrogramFailed(false); }
					catch{ appState.spectrogramBlob=null; appState.setSpectrogramFailed(true); }
					finally{ appState.isGeneratingSpectrogram=false }
				}
			};
			aRec.start(); aRecOn=true; appState.isRecording=true; aElapsed=0;
			aTimer=setInterval(()=>{aElapsed++;if(aElapsed>=MAX)aStop()},1000);
		} catch{ appState.setError('Microphone needed') }
	}
	function aStop(){ if(aRec?.state==='recording')aRec.stop(); clearInterval(aTimer); aRecOn=false; appState.isRecording=false; }
	function aTog(){ aRecOn?aStop():aStart(); }
	function aReset(){ appState.audioBlob=null; appState.spectrogramBlob=null; appState.setSpectrogramFailed(false); }

	/* ──────────── Camera ──────────── */
	function cReq(){ camAsk=true; cStart(); }
	async function cStart(){
		if(camOn||camBusy)return; if(imgOk||appState.imageBlob)return;
		camBusy=true; camDenied=false; cStop();
		try{
			const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:640},height:{ideal:480}}});
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
		cEl.width=vEl.videoWidth||640; cEl.height=vEl.videoHeight||480;
		cEl.getContext('2d').drawImage(vEl,0,0);
		cEl.toBlob(b=>{
			if(b&&appState.resetId===rid){
				if(preview)URL.revokeObjectURL(preview);
				preview=URL.createObjectURL(b); appState.imageBlob=b; imgOk=true; cStop();
			}
		},'image/jpeg',.9)
	}
	function cUpload(e){
		const f=e.target.files[0];
		if(f){
			if(preview)URL.revokeObjectURL(preview);
			preview=URL.createObjectURL(f); appState.imageBlob=f; imgOk=true;
			imgFall=false; camDenied=false; // Bug fix: reset states
			cStop();
		}
	}
	function cRetake(){ if(preview)URL.revokeObjectURL(preview); preview=''; appState.imageBlob=null; imgOk=false; camAsk=false; imgFall=false; camOn=false; camDenied=false; }
	function cStop(){ if(appState.cameraStream){appState.cameraStream.getTracks().forEach(t=>t.stop());appState.cameraStream=null} camOn=false; }

	onDestroy(()=>{
		cStop(); clearInterval(aTimer);
		if(aRec?.state==='recording')aRec.stop();
		if(aStream)aStream.getTracks().forEach(t=>t.stop());
		if(preview)URL.revokeObjectURL(preview);
	});

	let aBarCount=12;
</script>

<div class="both">
	<!-- Step indicator -->
	{#if !appState.audioBlob || !appState.imageBlob}
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
	{/if}

	<!-- Dual panels -->
	<div class="panels">
		<!-- Audio panel -->
		<div class="panel">
			<div class="p-label"><Icon name="mic" size={14} color="var(--lavender)" /> Audio</div>
			{#if appState.audioBlob && !aRecOn}
				<div class="done animate-in">
					<div class="done-check"><Icon name="check" size={16} color="var(--mint)" /></div>
					<div class="done-t">Recorded</div>
					{#if appState.isGeneratingSpectrogram}
						<div class="done-s">Processing…</div>
					{:else if appState.spectrogramFailed}
						<div class="done-s warn">⚠️ Spectrogram skipped</div>
					{/if}
					<button class="btn-xs" onclick={aReset}><Icon name="refresh" size={12} color="currentColor" /> Redo</button>
				</div>
			{:else}
				<div class="a-wrap">
					<button class="a-btn" class:rec={aRecOn} onclick={aTog}>
						<Icon name={aRecOn?'stop':'mic'} size={20} color="#fff" />
					</button>
					{#if aRecOn}
						<div class="a-timer">0:{aElapsed.toString().padStart(2,'0')}</div>
						<div class="a-prog"><div class="a-prog-f" style="width:{(aElapsed/MAX)*100}%"></div></div>
						<div class="a-wave">
							{#each Array(aBarCount) as _,i}<div class="a-bar" style="animation-delay:{i*.07}s"></div>{/each}
						</div>
					{:else}
						<div class="a-hint">Tap to record</div>
					{/if}
				</div>
			{/if}
		</div>

		<div class="divider"></div>

		<!-- Camera panel -->
		<div class="panel">
			<div class="p-label"><Icon name="camera" size={14} color="var(--mint)" /> Face</div>

			{#if imgOk && appState.imageBlob}
				<div class="done animate-in">
					{#if preview}<div class="thumb"><img src={preview} alt="" /></div>{/if}
					<div class="done-t">Captured</div>
					<div class="act-row">
						<button class="btn-xs" onclick={cRetake}><Icon name="refresh" size={12} color="currentColor" /></button>
						<label class="btn-xs"><Icon name="upload" size={12} color="currentColor" /><input type="file" accept="image/*" onchange={cUpload} class="c-hidden"/></label>
					</div>
				</div>

			{:else if camDenied}
				<div class="cam-denied animate-up">
					<div class="denied-icon">📷</div>
					<p class="denied-t">Camera blocked</p>
					<label class="btn-xs btn-lav">
						<Icon name="upload" size={12} color="currentColor" /> Upload
						<input type="file" accept="image/*" onchange={cUpload} class="c-hidden"/>
					</label>
				</div>

			{:else if imgFall}
				<div class="fall">
					<label class="fall-label">
						<Icon name="upload" size={16} color="var(--lavender)" />
						<span>Upload photo</span>
						<input type="file" accept="image/*" onchange={cUpload} class="c-hidden"/>
					</label>
					<button class="btn-xs" onclick={()=>{imgFall=false;cReq()}}><Icon name="camera" size={12} color="currentColor" /> Try camera</button>
				</div>

			{:else if !camAsk}
				<div class="c-ask">
					<div class="c-ask-icon"><Icon name="camera" size={20} color="var(--mint)" /></div>
					<button class="btn-big" onclick={cReq}>Enable Camera</button>
					<label class="lk"><Icon name="upload" size={12} color="currentColor" /> Upload<input type="file" accept="image/*" onchange={cUpload} class="c-hidden"/></label>
				</div>

			{:else}
				<div class="c-view">
					{#if camBusy}<div class="c-skeleton shimmer-bg"></div>{/if}
					<video bind:this={vEl} autoplay playsinline muted class="c-video" class:mirror={facing==='user'}></video>
					<svg viewBox="0 0 120 140" class="c-oval" aria-hidden="true">
						<ellipse cx="60" cy="70" rx="42" ry="54" fill="rgba(110,231,183,.06)" stroke="var(--mint)" stroke-width="1.5" stroke-dasharray="5 4"/>
					</svg>
					<button class="c-flip" onclick={cFlip}><Icon name="flip-camera" size={14} color="#fff" /></button>
					<button class="c-snap" onclick={cCapture}></button>
				</div>
				<label class="lk"><Icon name="upload" size={12} color="currentColor" /> Upload instead<input type="file" accept="image/*" onchange={cUpload} class="c-hidden"/></label>
			{/if}
		</div>
	</div>
</div>
<canvas bind:this={cEl} style="display:none"></canvas>

<style>
	.both { display:flex; flex-direction:column; gap:12px; padding:16px 14px; width:100%; }

	/* Flow stepper */
	.flow { display:flex; align-items:center; justify-content:center; gap:0; padding:4px 0; }
	.flow-step { display:flex; align-items:center; gap:6px; font-size:.72rem; font-weight:700; color:var(--text-dim); transition:color .2s; }
	.flow-step.active { color:var(--lavender); }
	.flow-step.done   { color:var(--mint); }
	.flow-num {
		width:24px; height:24px; border-radius:50%;
		display:flex; align-items:center; justify-content:center;
		font-size:.6rem; font-weight:800; background:var(--border);
		transition:background .2s, color .2s;
	}
	.flow-step.active .flow-num { background:var(--lav-soft); color:var(--lavender); }
	.flow-step.done   .flow-num { background:var(--mint-soft); color:var(--mint); }
	.flow-line { flex:1; max-width:40px; height:1px; background:var(--border); margin:0 10px; transition:background .3s; }
	.flow-line.done { background:var(--mint); }

	/* Panels */
	.panels { display:flex; gap:12px; align-items:stretch; }
	.panel  { flex:1; display:flex; flex-direction:column; align-items:center; gap:10px; min-width:0; }
	.p-label { font-size:.65rem; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:var(--text-soft); display:flex; align-items:center; gap:4px; }
	.divider { width:1px; background:var(--border); flex-shrink:0; }

	/* Audio */
	.a-wrap  { display:flex; flex-direction:column; align-items:center; gap:8px; }
	.a-btn   {
		width:64px; height:64px; border-radius:50%;
		background:linear-gradient(145deg,var(--lavender),var(--indigo));
		box-shadow:0 4px 20px var(--lav-glow);
		display:flex; align-items:center; justify-content:center;
		transition:transform .15s;
	}
	.a-btn:hover { transform:scale(1.06); }
	.a-btn:active { transform:scale(.94); }
	.a-btn.rec {
		background:linear-gradient(145deg,var(--blush),#D03050);
		box-shadow:0 4px 20px var(--blush-glow);
		animation:breathe 1.1s ease-in-out infinite;
	}
	.a-timer { font-family:'Fraunces',serif; font-size:1rem; color:var(--blush); font-weight:700; }
	.a-prog  { width:56px; height:2px; background:var(--border); border-radius:1px; overflow:hidden; }
	.a-prog-f { height:100%; background:var(--blush); border-radius:1px; transition:width .3s linear; }
	.a-hint  { font-size:.7rem; color:var(--text-soft); font-weight:700; text-align:center; }
	.a-wave  { display:flex; align-items:flex-end; gap:2px; height:36px; }
	.a-bar   { width:3px; border-radius:100px; background:linear-gradient(180deg,var(--lavender),var(--mint)); animation:wave .8s ease-in-out infinite; transform-origin:bottom; min-height:3px; }

	/* Done */
	.done { display:flex; flex-direction:column; align-items:center; gap:5px; }
	.done-check { width:36px; height:36px; border-radius:50%; background:var(--mint-soft); border:1.5px solid var(--mint); display:flex; align-items:center; justify-content:center; }
	.done-t { font-size:.78rem; font-weight:800; color:var(--text); }
	.done-s { font-size:.65rem; color:var(--text-soft); }
	.done-s.warn { color:var(--amber); }
	.act-row { display:flex; gap:4px; }
	.thumb { width:80px; border-radius:var(--r-sm); overflow:hidden; border:1.5px solid var(--mint); }
	.thumb img { width:100%; display:block; }

	/* Buttons */
	.btn-xs {
		padding:5px 12px; border-radius:var(--r-pill); font-size:.65rem; font-weight:700;
		color:var(--text-soft); border:1px solid var(--border); background:var(--surface);
		display:inline-flex; align-items:center; gap:3px; cursor:pointer; position:relative; transition:all .15s;
	}
	.btn-xs:hover { border-color:var(--lavender); color:var(--text); }
	.btn-lav { border-color:var(--lavender); color:var(--lavender); background:var(--lav-soft); }
	.btn-big {
		padding:9px 20px; border-radius:var(--r-pill); font-size:.8rem; font-weight:800;
		background:linear-gradient(135deg,var(--lavender),var(--indigo)); color:#fff;
		box-shadow:0 3px 14px var(--lav-glow); transition:transform .15s;
	}
	.btn-big:hover { transform:translateY(-1px); }
	.lk { font-size:.65rem; color:var(--text-soft); cursor:pointer; position:relative; transition:color .15s; display:flex; align-items:center; gap:3px; }
	.lk:hover { color:var(--text); }

	/* Camera */
	.c-ask { display:flex; flex-direction:column; align-items:center; gap:6px; text-align:center; }
	.c-ask-icon { width:40px; height:40px; border-radius:var(--r-sm); background:var(--mint-soft); display:flex; align-items:center; justify-content:center; margin-bottom:2px; }
	.c-view { position:relative; width:100%; aspect-ratio:4/3; max-height:42vh; border-radius:var(--r-md); overflow:hidden; background:var(--border); }
	.c-skeleton { position:absolute; inset:0; z-index:2; }
	.c-video { width:100%; height:100%; object-fit:cover; }
	.c-video.mirror { transform:scaleX(-1); }
	.c-oval { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
	.c-flip { position:absolute; top:8px; right:8px; z-index:3; width:32px; height:32px; border-radius:50%; background:rgba(0,0,0,.5); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; }
	.c-snap { position:absolute; bottom:10px; left:50%; transform:translateX(-50%); z-index:3; width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg,var(--mint),var(--lavender)); box-shadow:0 3px 16px var(--mint-glow); border:2px solid rgba(255,255,255,.25); transition:transform .12s; }
	.c-snap:active { transform:translateX(-50%) scale(.9); }

	/* Fall / denied */
	.fall { display:flex; flex-direction:column; align-items:center; gap:8px; width:100%; }
	.fall-label {
		display:flex; flex-direction:column; align-items:center; gap:4px;
		padding:18px; border:1.5px dashed var(--border); border-radius:var(--r-md);
		cursor:pointer; font-size:.72rem; color:var(--text-soft); position:relative;
		transition:border-color .15s, background .15s; width:100%; text-align:center;
	}
	.fall-label:hover { border-color:var(--lavender); background:var(--lav-soft); }
	.cam-denied { display:flex; flex-direction:column; align-items:center; gap:6px; text-align:center; }
	.denied-icon { font-size:1.8rem; }
	.denied-t { font-size:.72rem; color:var(--blush); font-weight:700; }

	.c-hidden { position:absolute; inset:0; opacity:0; cursor:pointer; }

	@media(max-width:400px){
		.panels { flex-direction:column; }
		.divider { width:100%; height:1px; }
	}
</style>
