<script>
	import { appState } from '$state/appState.svelte.js';
	import { convertToWav, isSupportedAudioFormat } from '$utils/audioEncoder.js';
	import { generateSpectrogram } from '$utils/spectrogramGenerator.js';
	import { onDestroy } from 'svelte';
	import Icon from './Icon.svelte';

	let aChunks=[], aStream=null; let aRec=null, aTimer=null, aElapsed=$state(0), aRecOn=$state(false);
	let vEl, cEl; let imgOk=$state(false), camOn=$state(false), imgFall=$state(false);
	let facing=$state('user'), camBusy=$state(false), camAsk=$state(false);
	let preview=$state('');
	const MAX=10;

	/* ── audio ── */
	async function aStart(){
		try{
			aStream=await navigator.mediaDevices.getUserMedia({audio:true});
			aChunks=[]; aRec=new MediaRecorder(aStream);
			aRec.ondataavailable=e=>{if(e.data.size)aChunks.push(e.data)};
			aRec.onstop=async()=>{
				const raw=new Blob(aChunks,{type:aRec.mimeType});
				if(isSupportedAudioFormat(raw.type)){appState.audioBlob=raw}else{
					appState.isConvertingAudio=true;
					try{appState.audioBlob=await convertToWav(raw)}catch{appState.setError('Conversion failed')}finally{appState.isConvertingAudio=false}
				}
				aStream.getTracks().forEach(t=>t.stop());aStream=null;
				if(appState.audioBlob){appState.isGeneratingSpectrogram=true;
					try{appState.spectrogramBlob=await generateSpectrogram(appState.audioBlob)}catch{appState.spectrogramBlob=null}finally{appState.isGeneratingSpectrogram=false}}
			};
			aRec.start();aRecOn=true;appState.isRecording=true;aElapsed=0;
			aTimer=setInterval(()=>{aElapsed++;if(aElapsed>=MAX)aStop()},1000);
		}catch{appState.setError('Microphone needed')}
	}
	function aStop(){if(aRec?.state==='recording')aRec.stop();clearInterval(aTimer);aRecOn=false;appState.isRecording=false}
	function aTog(){aRecOn?aStop():aStart()}
	function aReset(){appState.audioBlob=null;appState.spectrogramBlob=null}

	/* ── camera ── */
	function cReq(){camAsk=true;cStart()}
	async function cStart(){
		if(camOn||camBusy)return;if(imgOk||appState.imageBlob)return;camBusy=true;cStop();
		try{
			const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:640},height:{ideal:480}}});
			appState.cameraStream=s;camOn=true;camBusy=false;
			if(vEl){vEl.srcObject=s;try{await vEl.play()}catch{}}
		}catch{camBusy=false;imgFall=true}
	}
	async function cFlip(){facing=facing==='user'?'environment':'user';if(camOn){camOn=false;await cStart()}}
	function cCapture(){
		if(!vEl||!cEl)return;cEl.width=vEl.videoWidth||640;cEl.height=vEl.videoHeight||480;
		cEl.getContext('2d').drawImage(vEl,0,0);
		cEl.toBlob(b=>{if(b){if(preview)URL.revokeObjectURL(preview);preview=URL.createObjectURL(b);appState.imageBlob=b;imgOk=true;cStop()}},'image/jpeg',.9)
	}
	function cUpload(e){const f=e.target.files[0];if(f){if(preview)URL.revokeObjectURL(preview);preview=URL.createObjectURL(f);appState.imageBlob=f;imgOk=true;cStop()}}
	function cRetake(){if(preview)URL.revokeObjectURL(preview);preview='';appState.imageBlob=null;imgOk=false;camAsk=false;imgFall=false;camOn=false}
	function cStop(){if(appState.cameraStream){appState.cameraStream.getTracks().forEach(t=>t.stop());appState.cameraStream=null}camOn=false}

	onDestroy(()=>{cStop();clearInterval(aTimer);if(aRec?.state==='recording')aRec.stop();if(aStream){aStream.getTracks().forEach(t=>t.stop())}if(preview)URL.revokeObjectURL(preview)});
</script>

<div class="both">
	<div class="panel audio-panel">
		<div class="p-label"><Icon name="mic" size={18} color="currentColor" /> Audio</div>
		{#if appState.isConvertingAudio || appState.isGeneratingSpectrogram}
			<div class="spin-wrap"><div class="spin"></div><span>Processing…</span></div>
		{:else if appState.audioBlob && !aRecOn}
			<div class="done animate-scale"><Icon name="check" size={18} color="var(--teal)" /><div class="done-t">Recorded</div><button class="btn-xs" onclick={aReset}><Icon name="refresh" size={14} color="currentColor" /></button></div>
		{:else}
			<div class="a-wrap">
				<button class="a-btn" class:rec={aRecOn} onclick={aTog}>
				{#if aRecOn}
					<Icon name="stop" size={18} color="#fff" />
				{:else}
					<Icon name="mic" size={18} color="#fff" />
				{/if}
			</button>
				{#if aRecOn}
					<div class="a-timer">0:{aElapsed.toString().padStart(2,'0')}</div>
					<div class="a-prog"><div class="a-prog-fill" style="width:{(aElapsed/MAX)*100}%"></div></div>
				{:else}
					<div class="a-hint">Tap to record</div>
				{/if}
			</div>
		{/if}
	</div>
	<div class="divider"></div>
	<div class="panel img-panel">
		<div class="p-label"><Icon name="camera" size={18} color="currentColor" /> Face</div>
		{#if imgOk && appState.imageBlob}
			<div class="done animate-scale">
				{#if preview}<div class="thumb"><img src={preview} alt=""/></div>{:else}<div class="thumb-place"><Icon name="check" size={18} color="var(--teal)" /></div>{/if}
				<div class="done-t">Captured</div>
				<div class="act-row">
					<button class="btn-xs" onclick={cRetake}><Icon name="refresh" size={14} color="currentColor" /></button>
					<label class="btn-xs up"><Icon name="upload" size={14} color="currentColor" /><input type="file" accept="image/*" onchange={cUpload} class="c-hidden"/></label>
				</div>
			</div>
		{:else if imgFall}
			<div class="fall">
				<label class="fall-label"><Icon name="upload" size={14} color="currentColor" /> Upload photo<input type="file" accept="image/*" onchange={cUpload} class="c-hidden"/></label>
				<button class="btn-xs" onclick={()=>{imgFall=false;cReq()}}><Icon name="camera" size={18} color="currentColor" /> Try camera</button>
			</div>
		{:else if !camAsk}
			<div class="c-ask">
				<div class="c-ask-icon"><Icon name="camera" size={18} color="currentColor" /></div>
				<button class="btn-big" onclick={cReq}>Enable Camera</button>
				<label class="lk"><Icon name="upload" size={14} color="currentColor" /> Upload<input type="file" accept="image/*" onchange={cUpload} class="c-hidden"/></label>
			</div>
		{:else}
			<div class="c-view">
				<video bind:this={vEl} autoplay playsinline muted class="c-video" class:mirror={facing==='user'}></video>
				<button class="c-flip" onclick={cFlip}><Icon name="flip-camera" size={14} color="#fff" /></button>
				<button class="c-snap" onclick={cCapture}><Icon name="camera" size={18} color="currentColor" /></button>
			</div>
			<label class="lk"><Icon name="upload" size={14} color="currentColor" /> Upload<input type="file" accept="image/*" onchange={cUpload} class="c-hidden"/></label>
		{/if}
	</div>
</div>
<canvas bind:this={cEl} style="display:none"></canvas>

<style>
	.both{display:flex;gap:10px;padding:16px 12px;width:100%;align-items:stretch}
	.panel{flex:1;display:flex;flex-direction:column;align-items:center;gap:10px;min-width:0}
	.p-label{font-size:.68rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-soft)}
	.divider{width:1px;background:var(--card-border);flex-shrink:0}

	.a-wrap{display:flex;flex-direction:column;align-items:center;gap:8px}
	.a-btn{width:60px;height:60px;border-radius:50%;background:linear-gradient(145deg,var(--pink),#E04060);font-size:1.5rem;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(255,107,122,.3);transition:transform .15s}
	.a-btn:hover{transform:scale(1.06)}.a-btn:active{transform:scale(.95)}.a-btn.rec{animation:dot 1s infinite;background:linear-gradient(145deg,#C03040,#E05060)}
	.a-timer{font-family:'Fraunces',serif;font-size:.95rem;color:var(--pink);font-weight:700}
	.a-prog{width:60px;height:2px;background:var(--card-border);border-radius:1px;overflow:hidden}
	.a-prog-fill{height:100%;background:var(--pink);border-radius:1px}
	.a-hint{font-size:.72rem;color:var(--text-soft);font-weight:600}

	.c-ask{display:flex;flex-direction:column;align-items:center;gap:4px;padding:4px}
	.c-ask-icon{font-size:1.6rem}
	.btn-big{padding:8px 20px;border-radius:100px;font-size:.78rem;font-weight:700;background:linear-gradient(135deg,var(--pink),var(--gold));color:#fff;box-shadow:0 3px 12px rgba(255,107,122,.2);transition:transform .15s}
	.btn-big:hover{transform:translateY(-1px)}

	.c-view{position:relative;width:100%;aspect-ratio:3/4;border-radius:var(--radius-sm);overflow:hidden;background:var(--card-border)}
	.c-video{width:100%;height:100%;object-fit:cover}.c-video.mirror{transform:scaleX(-1)}
	.c-flip{position:absolute;top:6px;right:6px;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.4);font-size:.7rem;display:flex;align-items:center;justify-content:center;z-index:3}
	.c-snap{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--pink),var(--gold));font-size:.85rem;display:flex;align-items:center;justify-content:center;z-index:2}

	.done{display:flex;flex-direction:column;align-items:center;gap:4px}.done-t{font-size:.75rem;font-weight:700;color:var(--text)}
	.thumb{max-width:120px;border-radius:8px;overflow:hidden;border:2px solid var(--teal)}.thumb img{width:100%}.thumb-place{width:80px;height:60px;background:var(--teal-soft);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;border:2px solid var(--teal)}
	.act-row{display:flex;gap:4px}

	.btn-xs{padding:4px 10px;border-radius:100px;font-size:.65rem;font-weight:700;color:var(--text-soft);border:1px solid var(--card-border);background:var(--card-bg);display:inline-flex;align-items:center;gap:3px;position:relative;transition:all .15s}
	.btn-xs:hover{border-color:var(--pink);color:var(--text)}
	.lk{font-size:.65rem;color:var(--text-soft);cursor:pointer;position:relative;transition:color .15s}.lk:hover{color:var(--text)}

	.fall{display:flex;flex-direction:column;align-items:center;gap:6px}.fall-label{display:flex;flex-direction:column;align-items:center;gap:4px;padding:18px 20px;border:1px dashed var(--card-border);border-radius:var(--radius-sm);cursor:pointer;font-size:.7rem;color:var(--text-soft);position:relative;transition:border-color .15s}.fall-label:hover{border-color:var(--pink)}

	.spin-wrap{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:.7rem;color:var(--text-soft)}
	.spin{width:22px;height:22px;border:2px solid var(--card-border);border-top-color:var(--pink);border-radius:50%;animation:spin .8s linear infinite}

	.c-hidden{position:absolute;inset:0;opacity:0;cursor:pointer}

	@media(max-width:420px){.both{flex-direction:column}.divider{width:100%;height:1px}}
</style>