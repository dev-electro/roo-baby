#!/usr/bin/env node
// Generates synthetic spectrogram reference atlas for development
// Usage: node scripts/generate_atlas_node.mjs
// Outputs: static/atlas/ directory with WebP files

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'static', 'atlas');

const SPECTROGRAM_W = 512;
const SPECTROGRAM_H = 256;
const MELS = 128;

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
	const frames = 80 + Math.floor(rng() * 40);
	const mel = [];
	for (let f = 0; f < frames; f++) {
		const col = new Float32Array(MELS);
		for (let b = 0; b < MELS; b++) {
			const freq = 80 + (b / MELS) * 7920;
			let v = -60 + rng() * 10;
			if (isNoisy) {
				// Inject stronger uniform background noise across all frequencies
				v += rng() * 25;
			}
			if (cat === 'HUNGER' && freq > 400 && freq < 600) v += 20 * Math.sin(f * 0.15 + rng() * 2) * (1 + f / frames);
			else if (cat === 'PAIN' && freq > 600 && freq < 800) v += rng() > 0.6 ? 25 * (1 + (rng() - 0.5) * 0.3) : 0;
			else if (cat === 'TIRED' && freq > 300 && freq < 450) v += 12 * (0.5 + 0.5 * Math.sin(f * 0.07)) * (1 + 0.3 * rng());
			else if (cat === 'DISCOMFORT' && freq > 400 && freq < 500) v += 14 + 3 * rng();
			else if (cat === 'BURPING' && freq > 500 && freq < 900) v += rng() > 0.75 ? 20 * (1 - ((f % 20) / 20) * 0.4) : 0;
			col[b] = v;
		}
		mel.push(col);
	}
	return { data: mel, frames };
}

function renderMelToPixels(mel, w, h) {
	const { data, frames } = mel;
	const vMin = -80, vMax = 0;
	const pixels = Buffer.alloc(w * h * 4); // RGBA

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
	// PNG encoder: raw pixels + zlib deflate
	const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

	function chunk(type, data) {
		const typeB = Buffer.from(type, 'ascii');
		const len = Buffer.alloc(4);
		len.writeUInt32BE(data.length);
		const combined = Buffer.concat([typeB, data]);
		const crc = crc32(combined);
		const crcB = Buffer.alloc(4);
		crcB.writeUInt32BE(crc >>> 0);
		return Buffer.concat([len, combined, crcB]);
	}

	// IHDR
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(w, 0);
	ihdr.writeUInt32BE(h, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 6; // RGBA
	ihdr[10] = 0; // compression
	ihdr[11] = 0; // filter
	ihdr[12] = 0; // interlace

	// IDAT — add filter byte (0 = None) per row
	const raw = Buffer.alloc(h * (1 + w * 4));
	for (let y = 0; y < h; y++) {
		raw[y * (1 + w * 4)] = 0; // filter: None
		pixels.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
	}
	const compressed = zlib.deflateSync(raw);

	// IEND
	const iend = Buffer.alloc(0);

	return Buffer.concat([
		signature,
		chunk('IHDR', ihdr),
		chunk('IDAT', compressed),
		chunk('IEND', iend)
	]);
}

function crc32(buf) {
	let crc = 0xFFFFFFFF;
	for (let i = 0; i < buf.length; i++) {
		crc ^= buf[i];
		for (let j = 0; j < 8; j++) {
			crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
		}
	}
	return (crc ^ 0xFFFFFFFF) >>> 0;
}

function renderAtlasCard(allSpectrograms) {
	const cw = 1400, ch = 1800;
	const pixels = Buffer.alloc(cw * ch * 4);

	// Fill background
	for (let i = 0; i < cw * ch; i++) {
		pixels[i * 4] = 0x12;
		pixels[i * 4 + 1] = 0x12;
		pixels[i * 4 + 2] = 0x18;
		pixels[i * 4 + 3] = 255;
	}

	function setPixel(x, y, r, g, b) {
		if (x >= 0 && x < cw && y >= 0 && y < ch) {
			const o = (y * cw + x) * 4;
			pixels[o] = r; pixels[o + 1] = g; pixels[o + 2] = b; pixels[o + 3] = 255;
		}
	}

	function drawText(x, y, text, color, size) {
		// Simple bitmap font rendering (5x7 pixel chars)
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
			if (!glyph) continue;
			const cx = x + ci * (6 * scale);
			for (let row = 0; row < 7; row++) {
				for (let col = 0; col < 5; col++) {
					if (glyph[row] & (1 << (4 - col))) {
						for (let sy = 0; sy < scale; sy++) {
							for (let sx = 0; sx < scale; sx++) {
								setPixel(cx + col * scale + sx, y + row * scale + sy, color[0], color[1], color[2]);
							}
						}
					}
				}
			}
		}
	}

	// Title
	drawText(20, 20, 'ROO BABY CRY ANALYZER REFERENCE SPECTROGRAMS', [255, 255, 255], 3);

	// Subtitle
	drawText(20, 55, 'COMPARE USER SPECTROGRAM AGAINST THESE PATTERNS', [170, 170, 170], 2);

	// Frequency / Time labels
	drawText(20, 80, 'FREQUENCY HZ ON Y, TIME ON X, BRIGHTNESS = INTENSITY', [170, 170, 170], 2);

	let y = 120;
	for (const [cat, info] of Object.entries(CATEGORIES)) {
		drawText(20, y, cat, info.color, 3);
		drawText(200, y, info.desc.map ? info.desc : '', [200, 200, 200], 2);
		y += 35;

		// Render 3 exemplar spectrograms side by side
		for (let i = 0; i < 3 && i < allSpectrograms[cat].length; i++) {
			const melData = allSpectrograms[cat][i];
			const tw = 280, th = 140;
			const specPixels = renderMelToPixels(melData, tw, th);
			const ox = 20 + i * (tw + 15);

			for (let sy = 0; sy < th; sy++) {
				for (let sx = 0; sx < tw; sx++) {
					const srcIdx = (sy * tw + sx) * 4;
					// Border color
					const isBorder = sx === 0 || sx === tw - 1 || sy === 0 || sy === th - 1;
					if (isBorder) {
						setPixel(ox + sx, y + sy, info.color[0], info.color[1], info.color[2]);
					} else {
						setPixel(ox + sx, y + sy, specPixels[srcIdx], specPixels[srcIdx + 1], specPixels[srcIdx + 2]);
					}
				}
			}
		}
		y += 160;

		// Category label with Hz range
		const ranges = { HUNGER: '400-600HZ', PAIN: '600-800HZ', TIRED: '300-450HZ', DISCOMFORT: '400-500HZ', BURPING: '500-900HZ' };
		drawText(20, y, ranges[cat] || '', info.color, 2);
		y += 40;
	}

	// Reading guide at bottom
	drawText(20, y + 10, 'HOW TO READ:', [255, 255, 255], 3);
	y += 45;
	drawText(20, y, 'X-AXIS = TIME, Y-AXIS = FREQUENCY, BRIGHTNESS = INTENSITY', [200, 200, 200], 2);
	y += 25;
	drawText(20, y, 'HUNGER: RHYTHMIC VERTICAL BANDS 400-600HZ, GRADUAL BUILDUP', [255, 123, 92], 2);
	y += 25;
	drawText(20, y, 'PAIN: SUDDEN BRIGHT SPIKES 600-800HZ, DARK GAPS BETWEEN', [255, 77, 109], 2);
	y += 25;
	drawText(20, y, 'TIRED: DIM LOW-FREQUENCY SMEARS 300-450HZ, FADING IN AND OUT', [123, 140, 222], 2);
	y += 25;
	drawText(20, y, 'DISCOMFORT: STEADY MID-RANGE GLOW 400-500HZ, SUSTAINED', [255, 179, 71], 2);
	y += 25;
	drawText(20, y, 'BURPING: SHORT ISOLATED BURSTS, EACH SLIGHTLY LOWER', [82, 217, 193], 2);

	return { pixels, width: cw, height: ch };
}

// Main
console.log('ROO Atlas Generator (Node.js, synthetic placeholders)');
console.log('Output directory:', OUT_DIR);

if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
}

const allSpectrograms = {};
const manifest = { categories: {}, total_samples: 0, placeholder: true };

for (const [cat, info] of Object.entries(CATEGORIES)) {
	allSpectrograms[cat] = [];
	manifest.categories[cat] = {
		description: info.desc,
		color: `rgb(${info.color.join(',')})`,
		exemplars: []
	};

	for (let i = 0; i < 5; i++) {
		const mel = syntheticMel(cat, cat.charCodeAt(0) * 100 + i * 7 + 42);
		allSpectrograms[cat].push(mel);

		const pngFilename = `${cat.toLowerCase()}_${String(i + 1).padStart(2, '0')}.png`;
		const webpFilename = `${cat.toLowerCase()}_${String(i + 1).padStart(2, '0')}.webp`;
		manifest.categories[cat].exemplars.push(webpFilename);
		manifest.total_samples++;

		const pixels = renderMelToPixels(mel, SPECTROGRAM_W, SPECTROGRAM_H);
		const pngBuf = encodePNG(pixels, SPECTROGRAM_W, SPECTROGRAM_H);
		const webpBuf = await sharp(pngBuf).webp({ quality: 92 }).toBuffer();
		writeFileSync(join(OUT_DIR, webpFilename), webpBuf);
		console.log(`  Written: ${webpFilename} (${(webpBuf.length / 1024).toFixed(1)} KB)`);
	}

	// Add 1 noisy reference per category
	const noisyMel = syntheticMel(cat, cat.charCodeAt(0) * 100 + 5 * 7 + 42, true);
	allSpectrograms[cat].push(noisyMel);

	const noisyWebpFilename = `${cat.toLowerCase()}_noisy_1.webp`;
	manifest.categories[cat].exemplars.push(noisyWebpFilename);
	manifest.total_samples++;

	const noisyPixels = renderMelToPixels(noisyMel, SPECTROGRAM_W, SPECTROGRAM_H);
	const noisyPngBuf = encodePNG(noisyPixels, SPECTROGRAM_W, SPECTROGRAM_H);
	const noisyWebpBuf = await sharp(noisyPngBuf).webp({ quality: 92 }).toBuffer();
	writeFileSync(join(OUT_DIR, noisyWebpFilename), noisyWebpBuf);
	console.log(`  Written: ${noisyWebpFilename} (${(noisyWebpBuf.length / 1024).toFixed(1)} KB)`);
}

// Write atlas master card
console.log('Creating atlas master card...');
const card = renderAtlasCard(allSpectrograms);
const atlasPng = encodePNG(card.pixels, card.width, card.height);
const atlasWebp = await sharp(atlasPng).webp({ quality: 95 }).toBuffer();
writeFileSync(join(OUT_DIR, 'atlas_master.webp'), atlasWebp);
console.log(`  Written: atlas_master.webp (${(atlasWebp.length / 1024).toFixed(1)} KB)`);

// Write manifest
writeFileSync(join(OUT_DIR, 'atlas_manifest.json'), JSON.stringify(manifest, null, 2));
console.log('  Written: atlas_manifest.json');

console.log('\nDone! Files written to static/atlas/');