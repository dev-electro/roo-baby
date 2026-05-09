<script>
	import { appState } from '$state/appState.svelte.js';
	import { getApiUrl, setApiUrl } from '$utils/apiClient.js';
	import Icon from './Icon.svelte';
	let url=$state(getApiUrl()), ok=$state(false);
	function save(){setApiUrl(url.trim());ok=true;setTimeout(()=>ok=false,2000)}
</script>
{#if appState.showSettings}
<div class="ov animate-fade" onclick={()=>appState.showSettings=false} role="button" tabindex="0">
	<div class="pn animate-slide" onclick={e=>e.stopPropagation()} role="presentation">
		<div class="pn-h"><h3>Settings</h3><button class="pn-x" onclick={()=>appState.showSettings=false}><Icon name="close" size={14} color="currentColor" /></button></div>
		<div class="pn-b">
			<div class="sec"><h4>Playback</h4>
				<div class="toggle-row">
					<div><span class="t-label">Auto-play soothing sounds</span><p class="t-sub">Play sounds and voice automatically after analysis</p></div>
					<button class="toggle" class:on={appState.autoPlaySounds} onclick={()=>{appState.autoPlaySounds=!appState.autoPlaySounds;try{localStorage.setItem('roo-autoplay',appState.autoPlaySounds)}catch{}}} role="switch" aria-checked={appState.autoPlaySounds}>
						<div class="toggle-thumb"></div>
					</button>
				</div>
			</div>
			<div class="hr"></div>
			<div class="sec"><h4>Backend URL</h4><p>Leave empty for Cloudflare Pages default.</p>
				<input type="url" placeholder="Custom URL (optional)" bind:value={url}/>
				<button class="save" onclick={save}>{#if ok}<Icon name="check" size={18} color="var(--teal)" /> Saved{:else}Save{/if}</button>
			</div>
			<div class="hr"></div>
			<div class="sec"><h4>About</h4>
				<div class="row"><span>Provider</span><span>Gemini / OpenRouter</span></div>
				<div class="row"><span>Analysis</span><span>Mel Spectrogram + VLM</span></div>
			</div>
		</div>
	</div>
</div>
{/if}
<style>
	.ov{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}
	.pn{width:100%;max-width:380px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-xl);overflow:hidden;max-height:85vh;overflow-y:auto}
	.pn-h{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--card-border);position:sticky;top:0;background:var(--card-bg)}
	.pn-h h3{font-size:.95rem;font-weight:800;color:var(--text)}
	.pn-x{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--text-soft);font-size:.8rem}
	.pn-x:hover{background:rgba(128,128,128,.1)}
	.pn-b{padding:14px 18px 18px;display:flex;flex-direction:column;gap:14px}
	.sec{display:flex;flex-direction:column;gap:8px}.sec h4{font-size:.68rem;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.08em}
	.sec p{font-size:.72rem;color:var(--text-dim)}
	.sec input{padding:10px 12px;border-radius:var(--radius-sm);background:var(--bg);border:1px solid var(--card-border);color:var(--text);font-size:.82rem;width:100%}
	.sec input:focus{outline:none;border-color:var(--pink)}
	.save{padding:8px 16px;border-radius:var(--radius-sm);font-size:.78rem;font-weight:700;background:linear-gradient(135deg,var(--pink),var(--gold));color:#fff;align-self:flex-end}
	.hr{height:1px;background:var(--card-border)}
	.row{display:flex;justify-content:space-between;font-size:.75rem}.row span:first-child{color:var(--text-soft)}.row span:last-child{color:var(--text);font-weight:700}
	.toggle-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
	.t-label{font-size:.78rem;font-weight:700;color:var(--text)}
	.t-sub{font-size:.65rem;color:var(--text-dim);margin-top:2px}
	.toggle{width:44px;height:24px;border-radius:12px;background:var(--card-border);border:none;cursor:pointer;position:relative;transition:background .2s;padding:0;flex-shrink:0}
	.toggle.on{background:var(--teal)}
	.toggle-thumb{width:20px;height:20px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
	.toggle.on .toggle-thumb{transform:translateX(20px)}
</style>