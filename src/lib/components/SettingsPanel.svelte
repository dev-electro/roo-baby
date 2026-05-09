<script>
	import { appState } from '$state/appState.svelte.js';
	import { getApiUrl, setApiUrl } from '$utils/apiClient.js';
	import Icon from './Icon.svelte';

	let url = $state(getApiUrl());
	let ok  = $state(false);
	let okTimer = null;

	function save() {
		setApiUrl(url.trim());
		ok = true;
		clearTimeout(okTimer);
		okTimer = setTimeout(() => ok = false, 2500);
	}

	function close() { appState.showSettings = false; }
</script>

{#if appState.showSettings}
<div class="ov animate-fade" onclick={close} role="button" tabindex="0" onkeydown={e => e.key==='Escape' && close()}>
	<div class="pn animate-up" onclick={e => e.stopPropagation()} role="dialog" aria-modal="true">
		<div class="pn-h">
			<div class="pn-h-brand">
				<Icon name="settings" size={16} color="var(--lavender)" />
				<h2>Settings</h2>
			</div>
			<button class="pn-x" onclick={close} aria-label="Close"><Icon name="close" size={16} color="currentColor" /></button>
		</div>

		<div class="pn-b">
			<!-- Playback -->
			<section class="sec">
				<h3>Playback</h3>
				<div class="toggle-row">
					<div>
						<span class="t-label">Auto-play soothing sounds</span>
						<p class="t-sub">Play sounds and voice automatically after each analysis</p>
					</div>
					<button
						class="toggle"
						class:on={appState.autoPlaySounds}
						onclick={() => { appState.autoPlaySounds = !appState.autoPlaySounds; try{localStorage.setItem('roo-autoplay',appState.autoPlaySounds)}catch{} }}
						role="switch"
						aria-checked={appState.autoPlaySounds}
					>
						<div class="toggle-thumb"></div>
					</button>
				</div>
			</section>

			<div class="hr"></div>

			<!-- Backend URL -->
			<section class="sec">
				<h3>Backend URL</h3>
				<p class="sec-desc">Leave empty for Cloudflare Pages default.</p>
				<input type="url" placeholder="Custom backend URL (optional)" bind:value={url} />
				<button class="save-btn" onclick={save}>
					{#if ok}<Icon name="check" size={16} color="var(--mint)" /> Saved!{:else}Save URL{/if}
				</button>
			</section>

			<div class="hr"></div>

			<!-- About -->
			<section class="sec">
				<h3>About ROO</h3>
				<div class="rows">
					<div class="row"><span>AI Provider</span><span>Gemini / OpenRouter</span></div>
					<div class="row"><span>Analysis</span><span>Mel Spectrogram + VLM</span></div>
					<div class="row"><span>Model</span><span>Gemma 4</span></div>
					<div class="row"><span>Version</span><span>2.0</span></div>
				</div>
			</section>
		</div>
	</div>
</div>
{/if}

<style>
	.ov {
		position:fixed; inset:0; z-index:100;
		background:rgba(10,9,20,.7); backdrop-filter:blur(16px) saturate(140%);
		display:flex; align-items:flex-end; justify-content:center; padding:0;
	}
	@media(min-width:540px){ .ov { align-items:center; padding:20px; } }

	.pn {
		width:100%; max-width:420px;
		background:var(--surface); border:1px solid var(--border);
		border-radius:var(--r-xl) var(--r-xl) 0 0;
		max-height:90vh; overflow-y:auto;
		box-shadow:0 -16px 48px rgba(0,0,0,.5);
	}
	@media(min-width:540px){ .pn { border-radius:var(--r-xl); box-shadow:0 20px 60px rgba(0,0,0,.5); } }

	.pn-h {
		display:flex; align-items:center; justify-content:space-between;
		padding:16px 20px; border-bottom:1px solid var(--border);
		position:sticky; top:0; background:var(--surface); z-index:2;
	}
	.pn-h-brand { display:flex; align-items:center; gap:8px; }
	.pn-h h2 { font-size:1rem; font-weight:800; color:var(--text); margin:0; }
	.pn-x {
		width:32px; height:32px; border-radius:50%;
		display:flex; align-items:center; justify-content:center;
		color:var(--text-soft); transition:background .15s;
	}
	.pn-x:hover { background:var(--surface-2); }

	.pn-b { padding:16px 20px 28px; display:flex; flex-direction:column; gap:16px; }

	.sec { display:flex; flex-direction:column; gap:10px; }
	.sec h3 { font-size:.62rem; font-weight:800; color:var(--text-dim); text-transform:uppercase; letter-spacing:.1em; }
	.sec-desc { font-size:.72rem; color:var(--text-dim); }
	.sec input {
		padding:11px 14px; border-radius:var(--r-md);
		background:var(--surface-2); border:1px solid var(--border); color:var(--text);
		font-size:.84rem; width:100%; font-family:inherit;
	}
	.sec input:focus { outline:none; border-color:var(--lavender); box-shadow:0 0 0 3px var(--lav-glow); }
	.sec input::placeholder { color:var(--text-dim); }

	.save-btn {
		align-self:flex-start; padding:9px 18px; border-radius:var(--r-pill);
		font-size:.8rem; font-weight:800;
		background:linear-gradient(135deg, var(--lavender), var(--indigo));
		color:#fff; transition:opacity .15s; display:flex; align-items:center; gap:6px;
	}
	.save-btn:hover { opacity:.9; }

	.hr { height:1px; background:var(--border); }

	.rows { display:flex; flex-direction:column; gap:6px; }
	.row {
		display:flex; justify-content:space-between; align-items:center;
		font-size:.78rem; padding:4px 0;
	}
	.row span:first-child { color:var(--text-soft); }
	.row span:last-child  { color:var(--text); font-weight:700; }

	/* Toggle */
	.toggle-row { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
	.t-label { font-size:.82rem; font-weight:700; color:var(--text); }
	.t-sub   { font-size:.68rem; color:var(--text-dim); margin-top:3px; line-height:1.4; }
	.toggle {
		width:48px; height:26px; border-radius:13px;
		background:var(--border); position:relative; flex-shrink:0;
		transition:background .2s; padding:0;
	}
	.toggle.on { background:var(--lavender); }
	.toggle-thumb {
		width:22px; height:22px; border-radius:50%; background:#fff;
		position:absolute; top:2px; left:2px;
		transition:transform .2s cubic-bezier(.34,1.56,.64,1);
		box-shadow:0 1px 4px rgba(0,0,0,.3);
	}
	.toggle.on .toggle-thumb { transform:translateX(22px); }
</style>