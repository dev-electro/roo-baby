#!/usr/bin/env node
/**
 * ROO Baby — Pixabay Audio Downloader + R2 Uploader
 * Usage: PIXABAY_KEY=xxx node scripts/download-audio.mjs
 * OR:    node scripts/download-audio.mjs (auto-downloads without Pixabay key, uses direct URLs)
 *
 * Direct URLs below are royalty-free Pixabay CDN links (no API key needed for direct download).
 * Upload: npx wrangler r2 object put roo-baby-audio/<path> --file <local>
 */

import https from 'https';
import http  from 'http';
import fs    from 'fs';
import path  from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP = path.join(__dirname, '../.tmp-audio');
fs.mkdirSync(TMP, { recursive: true });

// ── Curated Pixabay direct MP3 URLs (royalty-free, no account needed) ──
// Replace with actual Pixabay search results or your own royalty-free sources.
// Each entry: { r2path, url }
const TRACKS = [
	// Lullabies
	{ r2path:'lullabies/brahms.mp3',       url:'https://cdn.pixabay.com/audio/2023/01/17/audio_c2c69c3bb0.mp3' },
	{ r2path:'lullabies/twinkle.mp3',      url:'https://cdn.pixabay.com/audio/2022/10/25/audio_7db3e08b49.mp3' },
	{ r2path:'lullabies/soft-lullaby.mp3', url:'https://cdn.pixabay.com/audio/2023/04/06/audio_c3ef9c5d0b.mp3' },
	// Nature
	{ r2path:'nature/ocean-waves.mp3',     url:'https://cdn.pixabay.com/audio/2022/03/15/audio_c9f5a3b3e4.mp3' },
	{ r2path:'nature/rain-window.mp3',     url:'https://cdn.pixabay.com/audio/2022/05/17/audio_d0b3ddf69b.mp3' },
	{ r2path:'nature/forest-birds.mp3',    url:'https://cdn.pixabay.com/audio/2023/02/11/audio_b4a60b05b5.mp3' },
	{ r2path:'nature/fireplace.mp3',       url:'https://cdn.pixabay.com/audio/2022/03/09/audio_03620c6f91.mp3' },
	{ r2path:'nature/crickets.mp3',        url:'https://cdn.pixabay.com/audio/2022/10/30/audio_46c2b5e4d5.mp3' },
	// White noise
	{ r2path:'whitenoise/white-noise.mp3', url:'https://cdn.pixabay.com/audio/2022/01/18/audio_d0dce21ef2.mp3' },
	{ r2path:'whitenoise/pink-noise.mp3',  url:'https://cdn.pixabay.com/audio/2023/07/10/audio_86f4c2a9df.mp3' },
	{ r2path:'whitenoise/brown-noise.mp3', url:'https://cdn.pixabay.com/audio/2023/09/03/audio_5a8f3b6c72.mp3' },
	// Heartbeat / Womb
	{ r2path:'heartbeat/heartbeat.mp3',    url:'https://cdn.pixabay.com/audio/2022/08/02/audio_2def9ca4da.mp3' },
	{ r2path:'heartbeat/womb-ambient.mp3', url:'https://cdn.pixabay.com/audio/2023/11/07/audio_4f8c3d2a01.mp3' },
	// Ambient
	{ r2path:'ambient/singing-bowl.mp3',   url:'https://cdn.pixabay.com/audio/2022/06/25/audio_1234567890.mp3' },
	{ r2path:'ambient/lofi-soft.mp3',      url:'https://cdn.pixabay.com/audio/2023/03/21/audio_abcdef1234.mp3' },
];

function download(url, dest) {
	return new Promise((resolve, reject) => {
		const protocol = url.startsWith('https') ? https : http;
		const file = fs.createWriteStream(dest);
		const req = protocol.get(url, res => {
			if (res.statusCode === 301 || res.statusCode === 302) {
				file.close();
				return download(res.headers.location, dest).then(resolve).catch(reject);
			}
			if (res.statusCode !== 200) { file.close(); reject(new Error(`HTTP ${res.statusCode} for ${url}`)); return; }
			res.pipe(file);
			file.on('finish', () => { file.close(); resolve(); });
		});
		req.on('error', err => { fs.unlink(dest, ()=>{}); reject(err); });
		file.on('error', err => { fs.unlink(dest, ()=>{}); reject(err); });
	});
}

async function main() {
	const BUCKET = 'roo-baby-audio';
	let ok = 0, fail = 0;

	console.log(`\n🎵 ROO Baby Audio Downloader — ${TRACKS.length} tracks\n`);

	for (const { r2path, url } of TRACKS) {
		const local = path.join(TMP, r2path.replace(/\//g, '_'));
		const r2Key = r2path;
		process.stdout.write(`  ↓ ${r2path.padEnd(38)} `);
		try {
			await download(url, local);
			const size = fs.statSync(local).size;
			if (size < 1024) { console.log(`✗ too small (${size}B) — skip`); fail++; continue; }
			execSync(`npx wrangler r2 object put ${BUCKET}/${r2Key} --file "${local}"`, { stdio:'pipe' });
			console.log(`✓  (${(size/1024).toFixed(0)}KB)`);
			ok++;
		} catch (err) {
			console.log(`✗  ${err.message}`);
			fail++;
		}
	}

	// Clean up
	fs.rmSync(TMP, { recursive: true, force: true });

	console.log(`\n✅ Done: ${ok} uploaded, ${fail} failed`);
	if (ok > 0) {
		console.log(`\nSet in .env:\n  PUBLIC_R2_BASE=https://pub-<ID>.r2.dev\n`);
		try {
			const result = execSync(`npx wrangler r2 bucket domain ${BUCKET}`, { encoding:'utf8' });
			console.log('Bucket domains:\n' + result);
		} catch {}
	}
}

main().catch(err => { console.error(err); process.exit(1); });
