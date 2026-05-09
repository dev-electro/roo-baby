<script>
	/** Unified icon system — all 24×24 viewBox, 2px stroke, round caps/joins */
	let { name = '', size = 20, color = 'currentColor', style = '' } = $props();

	const icons = {
		mic: `<path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10a7 7 0 0 1-14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>`,

		stop: `<rect x="5" y="5" width="14" height="14" rx="2"/>`,

		play: `<polygon points="6,4 20,12 6,20"/>`,

		pause: `<line x1="8" y1="5" x2="8" y2="19"/><line x1="16" y1="5" x2="16" y2="19"/>`,

		camera: `<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>`,

		upload: `<polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>`,

		download: `<polyline points="8,17 12,21 16,17"/><line x1="12" y1="21" x2="12" y2="9"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/>`,

		refresh: `<polyline points="23,4 23,11 16,11"/><polyline points="1,20 1,13 8,13"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 11M1 13l4.64 5.36A9 9 0 0 0 20.49 15"/>`,

		check: `<polyline points="20,6 9,17 4,12"/>`,

		close: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,

		info: `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,

		warning: `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,

		search: `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,

		settings: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,

		moon: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`,

		sun: `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`,

		star: `<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>`,

		heart: `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`,

		bolt: `<polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>`,

		wind: `<path d="M9.59 4.59A2 2 0 1 1 11 8H2"/><path d="M12.59 19.41A2 2 0 1 0 14 16H2"/><path d="M6.59 11.41A2 2 0 1 1 8 15H2"/>`,

		music: `<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>`,

		volume: `<polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>`,

		'volume-off': `<polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>`,

		'skip-back': `<polygon points="19,20 9,12 19,4"/><line x1="5" y1="19" x2="5" y2="5"/>`,

		'skip-forward': `<polygon points="5,4 15,12 5,20"/><line x1="19" y1="5" x2="19" y2="19"/>`,

		repeat: `<polyline points="17,1 21,5 17,9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7,23 3,19 7,15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>`,

		shuffle: `<polyline points="16,3 21,3 21,8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21,16 21,21 16,21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>`,

		'arrow-left': `<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/>`,

		'arrow-right': `<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>`,

		'flip-camera': `<path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/><path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><polyline points="9,2 12,5 15,2"/>`,

		sparkles: `<path d="M12 3L13.09 8.26L18 9L13.09 9.74L12 15L10.91 9.74L6 9L10.91 8.26L12 3Z"/><path d="M5 3L5.5 5.5L8 6L5.5 6.5L5 9L4.5 6.5L2 6L4.5 5.5L5 3Z"/><path d="M19 13L19.5 15.5L22 16L19.5 16.5L19 19L18.5 16.5L16 16L18.5 15.5L19 13Z"/>`,

		loader: `<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>`,

		baby: `<circle cx="12" cy="7" r="4"/><path d="M12 11c-4.42 0-8 1.79-8 4v1h16v-1c0-2.21-3.58-4-8-4z"/>`,

		wave: `<path d="M2 12c1.5-3 3-4.5 4.5-4.5S9 9 10.5 9 13 7.5 14.5 7.5 17 9 18.5 9 21 7.5 22 6"/>`,

		drop: `<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>`,

		kangaroo: `<ellipse cx="12" cy="16" rx="4.5" ry="5"/><ellipse cx="12" cy="8" rx="3" ry="3.5"/><path d="M8.5 13.5 Q6 15 6 18"/><path d="M15.5 13.5 Q18 17 17 20"/><ellipse cx="9" cy="7.5" rx="1.5" ry="2" transform="rotate(-20 9 7.5)"/><ellipse cx="15" cy="7.5" rx="1.5" ry="2" transform="rotate(20 15 7.5)"/><circle cx="10.5" cy="7.5" r=".4" fill="currentColor" stroke="none"/><circle cx="13.5" cy="7.5" r=".4" fill="currentColor" stroke="none"/>`,

		bottle: `<path d="M9 2h6v3.5a2 2 0 0 1-.59 1.41L13 8.5v1h-2v-1L9.59 6.91A2 2 0 0 1 9 5.5V2z"/><path d="M7 9h10v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9z"/><line x1="7" y1="13" x2="17" y2="13"/>`,

		bandage: `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" opacity=".3"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,

		thermometer: `<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>`,

		'info-circle': `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,
	};
</script>

{#if icons[name]}
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
		{style}
	>
		{@html icons[name]}
	</svg>
{:else}
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {style}>
		<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
	</svg>
{/if}
