/**
 * Soothing sound tracks configuration.
 * Add audio files to /static/audio/ and enable them here.
 *
 * file: path from /static/ (e.g. '/audio/heartbeat.m4a')
 * synth: fallback function name from soundGenerator if file missing
 * loop: whether to loop by default
 */

export const tracks = [
	{
		id: 'heartbeat',
		name: 'Heartbeat',
		desc: 'Real heartbeat rhythm — mimics the womb',
		file: '/audio/heartbeat.m4a',
		synth: 'playHeartbeat',
		icon: 'heart',
		color: 'var(--pink)',
		loop: true
	},
	{
		id: 'whitenoise',
		name: 'White Noise',
		desc: 'Gentle static — calms fussy babies',
		file: '/audio/whitenoise.m4a',
		synth: 'playWhiteNoise',
		icon: 'wind',
		color: 'var(--teal)',
		loop: true
	},
	{
		id: 'lullaby',
		name: 'Lullaby',
		desc: 'Soft classical melody — helps baby sleep',
		file: '/audio/lullaby.m4a',
		synth: 'playLullaby',
		icon: 'star',
		color: 'var(--gold)',
		loop: true
	},
	{
		id: 'shush',
		name: 'Shush',
		desc: 'Rhythmic shushing — instantly soothing',
		file: '/audio/shush.m4a',
		synth: 'playShush',
		icon: 'bandage',
		color: 'var(--purple)',
		loop: true
	},
	{
		id: 'rain',
		name: 'Gentle Rain',
		desc: 'Soft rainfall — peaceful backdrop',
		file: '/audio/rain.m4a',
		synth: 'playRain',
		icon: 'thermometer',
		color: '#7EB8DA',
		loop: true
	},
	{
		id: 'ocean',
		name: 'Ocean Waves',
		desc: 'Rolling waves — deep relaxation',
		file: '/audio/ocean.m4a',
		synth: 'playOcean',
		icon: 'moon',
		color: '#5B9BD5',
		loop: true
	},
	{
		id: 'pinknoise',
		name: 'Pink Noise',
		desc: 'Deeper than white — womb-like depth',
		file: '/audio/pinknoise.m4a',
		synth: 'playPinkNoise',
		icon: 'search',
		color: '#C4A882',
		loop: true
	},
	{
		id: 'brownnoise',
		name: 'Brown Noise',
		desc: 'Deep rumble — blocks outside noise',
		file: '/audio/brownnoise.m4a',
		synth: 'playBrownNoise',
		icon: 'bolt',
		color: '#8B6914',
		loop: true
	}
];
