<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';
	import { fade, slide } from 'svelte/transition';

	function close() { appState.showSettings = false; }
</script>

{#if appState.showSettings}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="backdrop" transition:fade={{duration:200}} onclick={close}></div>

	<div class="panel" transition:slide={{duration:250, axis:'y'}}>
		<div class="p-head">
			<h3 class="p-title">Settings</h3>
			<button class="p-close" onclick={close} aria-label="Close settings"><Icon name="x" size={20} color="currentColor"/></button>
		</div>

		<div class="p-body">
			<label class="s-row">
				<div class="s-info">
					<span class="s-lbl">Auto-play Sounds</span>
					<span class="s-desc">Play recommended sound automatically</span>
				</div>
				<input type="checkbox" bind:checked={appState.autoPlaySounds} class="s-toggle" />
			</label>
			
			<div class="s-divider"></div>

			<div class="s-col">
				<label for="apiUrl" class="s-lbl">Custom API URL (Optional)</label>
				<input type="url" id="apiUrl" class="s-input" placeholder="e.g. https://api.roo.com" bind:value={appState.customApiUrl} />
				<span class="s-desc">Leave blank to use default Edge worker</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:100;
		backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);
	}
	.panel {
		position:fixed; bottom:0; left:0; right:0; z-index:110;
		background:var(--surface); border-top:1px solid var(--border);
		border-radius:var(--r-xl) var(--r-xl) 0 0;
		display:flex; flex-direction:column; padding-bottom:env(safe-area-inset-bottom);
		box-shadow:var(--shadow-elevated); max-height:85vh; overflow-y:auto;
	}
	@media(min-width:640px) {
		.panel {
			top:50%; left:50%; right:auto; bottom:auto;
			transform:translate(-50%,-50%); width:100%; max-width:400px;
			border-radius:var(--r-md); border:1px solid var(--border);
		}
	}

	.p-head {
		display:flex; justify-content:space-between; align-items:center;
		padding:20px 24px; border-bottom:1px solid var(--border);
	}
	.p-title { font-size:1.1rem; font-weight:700; color:var(--text); margin:0; }
	.p-close { opacity:0.6; transition:opacity .2s; display:flex; align-items:center; }
	.p-close:hover { opacity:1; }

	.p-body { padding:24px; display:flex; flex-direction:column; gap:20px; }

	.s-row { display:flex; justify-content:space-between; align-items:center; cursor:pointer; gap:16px; }
	.s-info { display:flex; flex-direction:column; gap:2px; }
	.s-lbl { font-size:0.95rem; font-weight:600; color:var(--text); }
	.s-desc { font-size:0.8rem; color:var(--text-soft); }

	.s-divider { width:100%; height:1px; background:var(--border); }

	.s-col { display:flex; flex-direction:column; gap:8px; }
	.s-input {
		width:100%; padding:12px; border-radius:var(--r-sm);
		background:var(--surface-2); border:1px solid var(--border);
		color:var(--text); font-size:0.9rem; transition:border-color .2s;
	}
	.s-input:focus { border-color:var(--primary); outline:none; }

	/* Custom Toggle */
	.s-toggle {
		appearance:none; width:44px; height:24px; background:var(--surface-2); border:1px solid var(--border);
		border-radius:12px; position:relative; cursor:pointer; transition:all .2s; flex-shrink:0;
	}
	.s-toggle::after {
		content:''; position:absolute; top:2px; left:2px; width:18px; height:18px;
		background:var(--text-soft); border-radius:50%; transition:all .2s;
	}
	.s-toggle:checked { background:var(--primary); border-color:var(--primary); }
	.s-toggle:checked::after { left:22px; background:var(--surface); }
</style>