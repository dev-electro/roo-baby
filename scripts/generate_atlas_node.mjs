#!/usr/bin/env node
// Generates high-quality synthetic spectrogram reference atlas
// Usage: node scripts/generate_atlas_node.mjs
// Outputs: static/atlas/ directory with PNG or WebP files

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'static', 'atlas');

// --- High Quality Config ---
const SPECTROGRAM_W = 1024;
const SPECTROGRAM_H = 512;
const MELS = 256;

const CATEGORIES = {
	HUNGER: { color: [255, 123, 92], desc: 'Rhythmic "neh" pattern, 400-600Hz, gradual buildup' },
	PAIN: { color: [255, 77, 109], desc: 'Sudden sharp spikes, 600-800Hz, silence gaps' },
	TIRED: { color: [123, 140, 222], desc: 'Whiny nasal, 300-450Hz, irregular fading' },
	DISCOMFORT: { color: [255, 179, 71], desc: 'Sustained mid-range, 400-500Hz, grunting' },
	BURPING: { color: [82, 217, 193], desc: 'Short isolated bursts, descending pitch' }
};

const MAGMA = [
	[0, .0, .0, .014], [.14, .117, .067, .396], [.29, .416, .075, .498],
	[.43, .643, .243, .396], [.57, .860, .478, .188], [.71, .976, .753, .094],
	[.86, .988, .976, .361], [1, .987, .991, .750]
];

function magmaColor(t) {
	if (t <= 0) return [0, 0, 4];
	if (t >= 1) return [252, 253, 191];
	for (let i = 0; i < MAGMA.length - 1; i++) {
		if (t >= MAGMA[i][0] && t <= MAGMA[i + 1][0]) {
			const f = (t - MAGMA[i][0]) / (MAGMA[i + 1][0] - MAGMA[i][0] || 1);
			return [
				Math.round((MAGMA[i][1] + f * (MAGMA[i + 1][1] - MAGMA[i][1])) * 255),
				Math.round((MAGMA[i][2] + f * (MAGMA[i + 1][2] - MAGMA[i][2])) * 255),
				Math.round((MAGMA[i][3] + f * (MAGMA[i + 1][3] - MAGMA[i][3])) * 255)
			];
		}
	}
	return [252, 253, 191];
}

function seededRNG(seed) {
	let s = seed;
	return () => {
		s = (Math.sin(s * 9301 + 49297) % 233280);
		if (s < 0) s += 233280;
		return s / 233280;
	};
}

function syntheticMel(cat, seed, isNoisy = false) {
	const rng = seededRNG(seed);
	const duration_frames = 200 + Math.floor(rng() * 100); // Higher time resolution
	const mel = [];
	
	for (let f = 0; f < duration_frames; f++) {
		const col = new Float32Array(MELS);
		for (let b = 0; b < MELS; b++) {
			const freq = 80 + (b / MELS) * 7920;
			let v = -70 + rng() * 5; // Noise floor
			
			if (isNoisy) v += rng() * 30; // Background noise layer

			// High-fidelity pattern generation (harmonics + envelopes)
			if (cat === 'HUNGER') {
				// "NEH" - Rhythmic, 400-600Hz base + harmonics
				const envelope = Math.sin(f * 0.1 + rng() * 0.2) > 0 ? 1 : 0;
				if (envelope > 0) {
					if (freq > 400 && freq < 650) v += 28 * envelope * (0.8 + 0.2 * rng());
					if (freq > 1150 && freq < 1400) v += 18 * envelope * rng();
					if (freq > 1750 && freq < 2050) v += 12 * envelope * rng();
				}
			} else if (cat === 'PAIN') {
				// "EAIR" - Sudden sharp high-energy spikes
				const is_spike = (f % 50) < 18;
				if (is_spike) {
					if (freq > 600 && freq < 1100) v += 32 * (0.9 + 0.1 * rng());
					if (freq > 2000 && freq < 4500) v += 22 * rng();
					if (freq > 5000) v += 16 * rng(); 
				}
			} else if (cat === 'TIRED') {
				// "OWH" - Fading smears, 300-500Hz
				const fade = Math.max(0, 1 - (f % 40) / 40);
				if (freq > 280 && freq < 580) v += 20 * fade * (0.7 + 0.3 * rng());
				if (freq > 80 && freq < 220) v += 12 * fade;
			} else if (cat === 'DISCOMFORT') {
				// "HEH" - Steady mid-range, 450-550Hz, constant jitter
				if (freq > 380 && freq < 620) v += 18 + 5 * rng();
				if (freq > 850 && freq < 1050) v += 10 * rng();
			} else if (cat === 'BURPING') {
				// "EH" - Short sharp bursts, 500-1000Hz, pitch drop
				const is_burst = (f % 20) < 6;
				if (is_burst) {
					const pitch_drop = 1 - (f / duration_frames) * 0.2;
					if (freq > 450 * pitch_drop && freq < 1050 * pitch_drop) v += 30 * rng();
				}
			}
			col[b] = v;
		}
		mel.push(col);
	}
	return { data: mel, frames: duration_frames };
}

function renderMelToPixels(mel, w, h) {
	const { data, frames } = mel;
	const vMin = -80, vMax = 0;
	const pixels = Buffer.alloc(w * h * 4);

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const frameIdx = Math.floor((x / w) * frames);
			const binIdx = MELS - 1 - Math.floor((y / h) * MELS);
			const val = data[frameIdx]?.[binIdx] ?? -80;
			const t = Math.max(0, Math.min(1, (val - vMin) / (vMax - vMin)));
			const [r, g, b] = magmaColor(t);
			const offset = (y * w + x) * 4;
			pixels[offset] = r;
			pixels[offset + 1] = g;
			pixels[offset + 2] = b;
			pixels[offset + 3] = 255;
		}
	}
	return pixels;
}

function encodePNG(pixels, w, h) {
	const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
	function chunk(type, data) {
		const typeB = Buffer.from(type, 'ascii');
		const len = Buffer.alloc(4);
		len.writeUInt32BE(data.length);
		const combined = Buffer.concat([typeB, data]);
		const crcB = Buffer.alloc(4);
		crcB.writeUInt32BE(crc32(combined) >>> 0);
		return Buffer.concat([len, combined, crcB]);
	}
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(w, 0);
	ihdr.writeUInt32BE(h, 4);
	ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
	const raw = Buffer.alloc(h * (1 + w * 4));
	for (let y = 0; y < h; y++) {
		raw[y * (1 + w * 4)] = 0;
		pixels.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
	}
	return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function crc32(buf) {
	let crc = 0xFFFFFFFF;
	for (let i = 0; i < buf.length; i++) {
		crc ^= buf[i];
		for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
	}
	return (crc ^ 0xFFFFFFFF) >>> 0;
}

function renderAtlasCard(allSpectrograms) {
	const cw = 1400, ch = 1800;
	const pixels = Buffer.alloc(cw * ch * 4);
	pixels.fill(18); // Dark background
	for (let i = 0; i < cw * ch; i++) pixels[i * 4 + 3] = 255;

	function setPixel(x, y, r, g, b) {
		if (x >= 0 && x < cw && y >= 0 && y < ch) {
			const o = (y * cw + x) * 4;
			pixels[o] = r; pixels[o+1] = g; pixels[o+2] = b;
		}
	}

	function drawText(x, y, text, color, size) {
		const FONT = {
			'A': [0b01110,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
			'B': [0b11110,0b10001,0b10001,0b11110,0b10001,0b10001,0b11110],
			'C': [0b01110,0b10001,0b10000,0b10000,0b10000,0b10001,0b01110],
			'D': [0b11100,0b10010,0b10001,0b10001,0b10001,0b10010,0b11100],
			'E': [0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b11111],
			'F': [0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b10000],
			'G': [0b01110,0b10001,0b10000,0b10111,0b10001,0b10001,0b01110],
			'H': [0b10001,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
			'I': [0b01110,0b00100,0b00100,0b00100,0b00100,0b00100,0b01110],
			'K': [0b10001,0b10010,0b10100,0b11000,0b10100,0b10010,0b10001],
			'L': [0b10000,0b10000,0b10000,0b10000,0b10000,0b10000,0b11111],
			'M': [0b10001,0b11011,0b10101,0b10101,0b10001,0b10001,0b10001],
			'N': [0b10001,0b10001,0b11001,0b10101,0b10011,0b10001,0b10001],
			'O': [0b01110,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
			'P': [0b11110,0b10001,0b10001,0b11110,0b10000,0b10000,0b10000],
			'R': [0b11110,0b10001,0b10001,0b11110,0b10100,0b10010,0b10001],
			'S': [0b01110,0b10001,0b10000,0b01110,0b00001,0b10001,0b01110],
			'T': [0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b00100],
			'U': [0b10001,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
			'W': [0b10001,0b10001,0b10001,0b10101,0b10101,0b11011,0b10001],
			'Y': [0b10001,0b10001,0b01010,0b00100,0b00100,0b00100,0b00100],
			'-': [0b00000,0b00000,0b00000,0b11111,0b00000,0b00000,0b00000],
			' ': [0,0,0,0,0,0,0],
			':': [0b00000,0b00100,0b00100,0b00000,0b00100,0b00100,0b00000],
			',': [0b00000,0b00000,0b00100,0b00100,0b00100,0b01000,0b10000],
			'.': [0b00000,0b00000,0b00000,0b00000,0b00000,0b00100,0b00100],
			'0': [0b01110,0b10001,0b10011,0b10101,0b11001,0b10001,0b01110],
			'1': [0b00100,0b01100,0b00100,0b00100,0b00100,0b00100,0b01110],
			'2': [0b01110,0b10001,0b00001,0b00110,0b01000,0b10000,0b11111],
			'3': [0b01110,0b10001,0b00001,0b00110,0b00001,0b10001,0b01110],
			'4': [0b00010,0b00110,0b01010,0b10010,0b11111,0b00010,0b00010],
			'5': [0b11111,0b10000,0b11110,0b00001,0b00001,0b10001,0b01110],
			'6': [0b00110,0b01000,0b10000,0b11110,0b10001,0b10001,0b01110],
			'7': [0b11111,0b00001,0b00010,0b00100,0b01000,0b01000,0b01000],
			'8': [0b01110,0b10001,0b10001,0b01110,0b10001,0b10001,0b01110],
			'9': [0b01110,0b10001,0b10001,0b01111,0b00001,0b00010,0b01100],
		};
		const scale = size || 2;
		for (let ci = 0; ci < text.length; ci++) {
			const ch = text[ci].toUpperCase();
			const glyph = FONT[ch] || FONT[' '];
			const cx = x + ci * (6 * scale);
			for (let row = 0; row < 7; row++) {
				for (let col = 0; col < 5; col++) {
					if (glyph[row] & (1 << (4 - col))) {
						for (let sy = 0; sy < scale; sy++) {
							for (let sx = 0; sx < scale; sx++) setPixel(cx + col * scale + sx, y + row * scale + sy, color[0], color[1], color[2]);
						}
					}
				}
			}
		}
	}

	drawText(20, 20, 'ROO BABY CRY ANALYZER REFERENCE ATLAS (HQ)', [255, 255, 255], 3);
	let y = 120;
	for (const [cat, info] of Object.entries(CATEGORIES)) {
		drawText(20, y, cat, info.color, 3); y += 35;
		for (let i = 0; i < 3; i++) {
			const specPixels = renderMelToPixels(allSpectrograms[cat][i], 280, 140);
			const ox = 20 + i * 295;
			for (let sy = 0; sy < 140; sy++) {
				for (let sx = 0; sx < 280; sx++) {
					const o = (sy * 280 + sx) * 4;
					setPixel(ox + sx, y + sy, specPixels[o], specPixels[o+1], specPixels[o+2]);
					if (sx === 0 || sx === 279 || sy === 0 || sy === 139) setPixel(ox + sx, y + sy, info.color[0], info.color[1], info.color[2]);
				}
			}
		}
		y += 180;
	}
	return { pixels, width: cw, height: ch };
}

async function main() {
	if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
	let sharp;
	try { sharp = (await import('sharp')).default; } catch (e) {}

	async function save(pixels, w, h, name) {
		const png = encodePNG(pixels, w, h);
		const base = name.replace('.webp', '');
		if (sharp) {
			try {
				const buf = await sharp(png).webp({ quality: 92 }).toBuffer();
				writeFileSync(join(OUT_DIR, base + '.webp'), buf);
				console.log(`  Written: ${base}.webp`); return base + '.webp';
			} catch (e) {}
		}
		writeFileSync(join(OUT_DIR, base + '.png'), png);
		console.log(`  Written: ${base}.png`); return base + '.png';
	}

	const allSpectrograms = {};
	const manifest = { categories: {}, total_samples: 0 };
	for (const [cat, info] of Object.entries(CATEGORIES)) {
		allSpectrograms[cat] = [];
		manifest.categories[cat] = { description: info.desc, color: `rgb(${info.color.join(',')})`, exemplars: [] };
		for (let i = 0; i < 5; i++) {
			const mel = syntheticMel(cat, cat.charCodeAt(0) * 100 + i);
			allSpectrograms[cat].push(mel);
			const name = await save(renderMelToPixels(mel, SPECTROGRAM_W, SPECTROGRAM_H), SPECTROGRAM_W, SPECTROGRAM_H, `${cat.toLowerCase()}_${i+1}.webp`);
			manifest.categories[cat].exemplars.push(name);
			manifest.total_samples++;
		}
		const noisy = syntheticMel(cat, 999, true);
		const nName = await save(renderMelToPixels(noisy, SPECTROGRAM_W, SPECTROGRAM_H), SPECTROGRAM_W, SPECTROGRAM_H, `${cat.toLowerCase()}_noisy.webp`);
		manifest.categories[cat].exemplars.push(nName);
	}
	const card = renderAtlasCard(allSpectrograms);
	await save(card.pixels, card.width, card.height, 'atlas_master.webp');
	writeFileSync(join(OUT_DIR, 'atlas_manifest.json'), JSON.stringify(manifest, null, 2));
	console.log('Done!');
}
main();
