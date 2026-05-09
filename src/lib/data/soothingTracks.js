/**
 * Audio tracks manifest — hosted on Cloudflare R2.
 *
 * Set PUBLIC_R2_BASE in Cloudflare Pages env vars or .env:
 *   PUBLIC_R2_BASE=https://pub-YOUR_BUCKET.r2.dev
 *
 * All URLs below are relative to PUBLIC_R2_BASE.
 * If R2 is not configured, the player falls back to Web Audio synthesis.
 */

/* ⚠️ Replace with your R2 bucket URL or leave empty for synth-only */
export const R2_BASE = '';

function url(path) {
	if (!R2_BASE) return '';
	return `${R2_BASE}${path}`;
}

export const categories = [
	{
		id: 'lullabies',
		name: 'Lullabies',
		desc: 'Classical melodies',
		icon: 'star',
		tracks: [
			{ name: 'Brahms Lullaby',       artist: 'Classical',    url: url('/lullabies/brahms.m4a') },
			{ name: 'Twinkle Twinkle',      artist: 'Traditional',  url: url('/lullabies/twinkle.m4a') },
			{ name: 'Mozart Lullaby',       artist: 'Classical',    url: url('/lullabies/mozart.m4a') },
			{ name: 'Hush Little Baby',     artist: 'Traditional',  url: url('/lullabies/hush.m4a') },
			{ name: 'Rock-a-Bye Baby',      artist: 'Traditional',  url: url('/lullabies/rockabye.m4a') },
			{ name: 'Clair de Lune',        artist: 'Debussy',      url: url('/lullabies/clairdelune.m4a') },
		]
	},
	{
		id: 'nature',
		name: 'Nature',
		desc: 'Rain, ocean, forest',
		icon: 'moon',
		tracks: [
			{ name: 'Gentle Rain',        artist: 'Nature', url: url('/nature/rain.m4a') },
			{ name: 'Ocean Waves',        artist: 'Nature', url: url('/nature/ocean.m4a') },
			{ name: 'Forest Stream',      artist: 'Nature', url: url('/nature/stream.m4a') },
			{ name: 'Crackling Fire',     artist: 'Nature', url: url('/nature/fire.m4a') },
			{ name: 'Summer Night',       artist: 'Nature', url: url('/nature/crickets.m4a') },
		]
	},
	{
		id: 'noise',
		name: 'White Noise',
		desc: 'Static & fans',
		icon: 'wind',
		tracks: [
			{ name: 'Pure White',         artist: 'Noise',     url: url('/noise/white.m4a') },
			{ name: 'Pink Noise',         artist: 'Noise',     url: url('/noise/pink.m4a') },
			{ name: 'Brown Noise',        artist: 'Noise',     url: url('/noise/brown.m4a') },
			{ name: 'Box Fan',            artist: 'Household', url: url('/noise/fan.m4a') },
			{ name: 'Vacuum Cleaner',     artist: 'Household', url: url('/noise/vacuum.m4a') },
			{ name: 'Hair Dryer',         artist: 'Household', url: url('/noise/hairdryer.m4a') },
		]
	},
	{
		id: 'heartbeat',
		name: 'Heartbeat',
		desc: 'Womb rhythm',
		icon: 'heart',
		tracks: [
			{ name: 'Resting Heartbeat',  artist: 'Natural', url: url('/heartbeat/resting.m4a') },
			{ name: 'Slow Heartbeat',     artist: 'Natural', url: url('/heartbeat/slow.m4a') },
			{ name: 'Womb & Heartbeat',   artist: 'Natural', url: url('/heartbeat/womb.m4a') },
		]
	},
	{
		id: 'shush',
		name: 'Shushing',
		desc: 'Parent voice',
		icon: 'bandage',
		tracks: [
			{ name: 'Gentle Shush',     artist: 'Human', url: url('/shush/gentle.m4a') },
			{ name: 'Rhythmic Shush',   artist: 'Human', url: url('/shush/rhythmic.m4a') },
			{ name: 'Long Shush',       artist: 'Human', url: url('/shush/long.m4a') },
		]
	}
];

/** Synth sounds — always available (no R2 needed) */
export const synths = [
	{ id: 'whitenoise', name: 'White Noise',   desc: 'Gentle static — mimics the womb',      icon: 'wind',    color: 'var(--teal)' },
	{ id: 'pinknoise',  name: 'Pink Noise',    desc: 'Deeper than white — more calming',      icon: 'search',  color: '#C4A882' },
	{ id: 'brownnoise', name: 'Brown Noise',   desc: 'Deepest rumble — blocks distractions',   icon: 'bolt',    color: '#8B6914' },
	{ id: 'rain',       name: 'Gentle Rain',   desc: 'Soft rainfall — peaceful backdrop',      icon: 'moon',    color: '#7EB8DA' },
	{ id: 'ocean',      name: 'Ocean Waves',   desc: 'Rolling waves — deep relaxation',        icon: 'heart',   color: '#5B9BD5' },
	{ id: 'heartbeat',  name: 'Heartbeat',     desc: 'Real heartbeat rhythm — womb comfort',   icon: 'bandage', color: 'var(--pink)' },
	{ id: 'lullaby',    name: 'Lullaby',       desc: 'Soft melody — helps baby drift off',     icon: 'star',    color: 'var(--gold)' },
	{ id: 'shush',      name: 'Shush',         desc: 'Rhythmic shushing — instantly soothes',  icon: 'arrow-right', color: 'var(--purple)' },
];
