<script>
	import { onDestroy } from 'svelte';
	import { ensureAudioResumed, stopAllSounds, setVolume, getVolume, isPlaying, getActiveSoundType, playByName } from '$utils/soundGenerator.js';
	import { tracks } from '$lib/data/soothingTracks.js';
	import Icon from './Icon.svelte';

	let { autoplay = false } = $props();

	let currentTrack = $state(null);
	let audioEl = $state(null);
	let playing = $state(false);
	let loop = $state(true);
	let vol = $state(typeof localStorage !== 'undefined' ? parseFloat(localStorage.getItem('roo-vol')) || 0.6 : 0.6);
	let progress = $state(0);
	let duration = $state(0);
	let currentTime = $state(0);
	let updateId = null;
	let errorTracks = $state(new Set()); // tracks whose files failed to load

	function formatTime(s) {
		const m = Math.floor(s / 60), sec = Math.floor(s % 60);
		return `${m}:${sec.toString().padStart(2, '0')}`;
	}

	function handleVolume(v) {
		vol = v;
		setVolume(v);
		if (audioEl) audioEl.volume = v;
		try { localStorage.setItem('roo-vol', v); } catch {}
	}

	function stopAll() {
		stopAllSounds();
		if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; }
		playing = false;
		progress = 0;
		currentTime = 0;
		if (updateId) { clearInterval(updateId); updateId = null; }
	}

	function playTrack(track) {
		ensureAudioResumed();
		stopAll();

		// Try audio file first if not previously errored
		if (track.file && !errorTracks.has(track.id)) {
			const a = new Audio();
			a.src = track.file;
			a.loop = loop;
			a.volume = vol;
			a.preload = 'auto';

			a.onloadedmetadata = () => {
				duration = a.duration;
				a.play().catch(() => {});
			};

			a.onerror = () => {
				errorTracks.add(track.id);
				playTrack(track); // retry with synth fallback
			};

			a.onplay = () => { playing = true; currentTrack = track; };
			a.onpause = () => { playing = false; };
			a.onended = () => { if (!a.loop) { playing = false; progress = 0; } };
			a.ontimeupdate = () => {
				currentTime = a.currentTime;
				progress = a.duration ? (a.currentTime / a.duration) * 100 : 0;
			};

			// Update progress via interval for smoother animation
			updateId = setInterval(() => {
				if (!a.paused) {
					currentTime = a.currentTime;
					progress = a.duration ? (a.currentTime / a.duration) * 100 : 0;
				}
			}, 200);

			audioEl = a;
			a.play().catch(() => {
				// File failed silently, fallback to synth
				errorTracks.add(track.id);
				playTrack(track);
			});
			return;
		}

		// Fallback to synthesized sound
		if (track.synth) {
			playByName(track.id, loop);
			playing = true;
			currentTrack = track;
			duration = 0;

			updateId = setInterval(() => {
				if (isPlaying()) {
					currentTime += 0.2;
					progress = Math.min((currentTime % 60) / 60 * 100, 99);
				} else {
					playing = false;
					progress = 0;
					currentTime = 0;
					clearInterval(updateId);
					updateId = null;
				}
			}, 200);
		}
	}

	function togglePlay(track) {
		if (currentTrack?.id === track.id && playing) {
			stopAll();
			currentTrack = null;
		} else {
			playTrack(track);
		}
	}

	function toggleLoop() {
		loop = !loop;
		if (audioEl) audioEl.loop = loop;
		if (!audioEl && isPlaying()) {
			// Restart with loop toggle for synth sounds
			const t = currentTrack;
			stopAll();
			if (t) playTrack(t);
		}
	}

	$effect(() => {
		if (autoplay && tracks.length > 0 && !currentTrack) {
			playTrack(tracks[0]);
		}
	});

	onDestroy(() => {
		stopAll();
		if (updateId) clearInterval(updateId);
	});
</script>

<div class="player">
	<div class="player-tracks">
		{#each tracks as track}
			<button
				class="track"
				class:active={currentTrack?.id === track.id && playing}
				class:selected={currentTrack?.id === track.id}
				onclick={() => togglePlay(track)}
			>
				<div class="track-icon" style="color:{track.color}">
					<Icon name={track.icon} size={22} color="currentColor" />
					{#if currentTrack?.id === track.id && playing}
						<div class="track-pulse"></div>
					{/if}
				</div>
				<div class="track-body">
					<div class="track-name">{track.name}</div>
					<div class="track-desc">{track.desc}</div>
				</div>
				<div class="track-state">
					{#if currentTrack?.id === track.id && playing}
						<div class="eq">
							{#each Array(4) as _, i}<div class="eq-bar" style="animation-delay:{i*0.15}s"></div>{/each}
						</div>
					{:else}
						<Icon name="play" size={16} color="var(--text-soft)" />
					{/if}
				</div>
			</button>
		{/each}
	</div>

	{#if currentTrack && playing}
		<div class="controls animate-slide">
			<div class="controls-top">
				<div class="now-playing">
					<span class="np-label">Now playing</span>
					<span class="np-name">{currentTrack.name}</span>
				</div>
				<div class="time">{formatTime(currentTime)}{duration > 0 ? ' / ' + formatTime(duration) : ''}</div>
			</div>

			<div class="progress-bar" onclick={(e) => {
				if (!audioEl) return;
				const rect = e.currentTarget.getBoundingClientRect();
				const pct = (e.clientX - rect.left) / rect.width;
				audioEl.currentTime = pct * audioEl.duration;
			}} role="slider" tabindex="0">
				<div class="progress-fill" style="width:{progress}%"></div>
				<div class="progress-thumb" style="left:{progress}%"></div>
			</div>

			<div class="controls-row">
				<div class="controls-left">
					<button class="ctrl-btn" class:on={loop} onclick={toggleLoop} aria-label="Loop">
						<Icon name="refresh" size={14} color={loop ? 'var(--teal)' : 'var(--text-dim)'} />
						<span class="ctrl-label">Loop</span>
					</button>
				</div>
				<div class="controls-center">
					<button class="ctrl-btn stop-btn" onclick={stopAll} aria-label="Stop">
						<Icon name="stop" size={18} color="var(--red)" />
					</button>
				</div>
				<div class="controls-right">
					<div class="volume">
						<Icon name="mic" size={12} color="var(--text-dim)" />
						<input
							type="range"
							min="0"
							max="100"
							value={vol * 100}
							oninput={(e) => handleVolume(e.target.value / 100)}
							class="vol-slider"
							aria-label="Volume"
						/>
						<Icon name="mic" size={14} color="var(--text-soft)" />
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.player{display:flex;flex-direction:column;gap:12px}
	.player-tracks{display:flex;flex-direction:column;gap:8px}

	.track{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius);padding:14px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all .15s;text-align:left;width:100%}
	.track:hover{border-color:var(--pink);transform:translateY(-1px)}
	.track.active{border-color:var(--teal);background:var(--teal-soft)}
	.track.selected:not(.active){border-color:var(--text-dim)}
	.track-icon{width:44px;height:44px;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:rgba(128,128,128,.04);position:relative}
	.track-pulse{position:absolute;inset:-2px;border-radius:var(--radius-sm);border:2px solid var(--teal);animation:ring 2.2s ease-out infinite}
	.track-body{flex:1;min-width:0}
	.track-name{font-size:.88rem;font-weight:700;color:var(--text)}
	.track-desc{font-size:.68rem;color:var(--text-dim);margin-top:1px}
	.track-state{flex-shrink:0}

	.eq{display:flex;align-items:flex-end;gap:2px;height:18px}
	.eq-bar{width:3px;border-radius:1px;background:var(--teal);animation:eq 1s ease-in-out infinite}
	@keyframes eq{0%,100%{height:4px}50%{height:16px}}

	.controls{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-xl);padding:16px;display:flex;flex-direction:column;gap:12px}
	.controls-top{display:flex;align-items:center;justify-content:space-between}
	.now-playing{display:flex;flex-direction:column}
	.np-label{font-size:.58rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim)}
	.np-name{font-size:.82rem;font-weight:700;color:var(--text)}
	.time{font-size:.62rem;color:var(--text-dim);font-family:'Fraunces',serif}

	.progress-bar{height:4px;background:var(--card-border);border-radius:2px;position:relative;cursor:pointer;overflow:visible}
	.progress-fill{height:100%;background:linear-gradient(90deg,var(--pink),var(--gold));border-radius:2px;transition:width .2s linear}
	.progress-thumb{position:absolute;top:-3px;width:10px;height:10px;border-radius:50%;background:var(--pink);transform:translateX(-50%);opacity:0;transition:opacity .15s}
	.progress-bar:hover .progress-thumb{opacity:1}

	.controls-row{display:flex;align-items:center;justify-content:space-between}
	.controls-left,.controls-center,.controls-right{display:flex;align-items:center}
	.ctrl-btn{display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:100px;font-size:.68rem;font-weight:700;color:var(--text-soft);border:1px solid var(--card-border);background:var(--card-bg);cursor:pointer;transition:all .15s}
	.ctrl-btn:hover{border-color:var(--pink)}
	.ctrl-btn.on{border-color:var(--teal);color:var(--teal);background:var(--teal-soft)}
	.ctrl-label{font-size:.65rem}
	.stop-btn{border-color:rgba(248,113,113,.15);background:rgba(248,113,113,.05)}
	.stop-btn:hover{border-color:var(--red);background:rgba(248,113,113,.1)}

	.volume{display:flex;align-items:center;gap:6px}
	.vol-slider{width:72px;height:4px;-webkit-appearance:none;appearance:none;background:var(--card-border);border-radius:2px;outline:none;cursor:pointer}
	.vol-slider::-webkit-slider-thumb{width:14px;height:14px;border-radius:50%;background:var(--text-soft);-webkit-appearance:none;appearance:none;cursor:pointer}
</style>
