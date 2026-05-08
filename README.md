# ROO — Baby Cry Analyzer

**Multimodal baby cry analyzer + responder. Built for the DEV x Gemma 4 Challenge.**

---

## Architecture

```
Browser (SvelteKit SPA)
    │
    │ POST /api/analyze  (multipart: audio + image)
    ▼
Cloudflare Pages Function (functions/api/analyze.js)
    │
    │ Gemini API HTTPS call
    ▼
Google Gemini API (gemma-4-26b-a4b-it or gemini-2.0-flash)
    │
    ▼ JSON result
Browser (displays category, confidence, plays soothing sound)
```

**Single deployment on Cloudflare Pages.** The `functions/` directory is auto-detected and deployed as Pages Functions (runs on Workers runtime).

---

## Features

- **Audio + Image + Combined** analysis modes
- **Client-side WebM→WAV** conversion via Web Audio API
- **Web Audio soothing sounds** (heartbeat, white noise, lullaby, shush)
- **TTS** with gentle voice selection
- **PWA** — installable on mobile, offline cache
- **Analysis history** — persisted in localStorage
- **Zero CORS** — same-origin API

---

## Deploy to Cloudflare Pages

### 1. Set environment variables in Pages dashboard

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | ✅ | — | From aistudio.google.com/apikey |
| `GEMINI_MODEL_NAME` | ❌ | `gemini-2.0-flash` | Model (audio needs gemini-2.0-flash) |

### 2. Connect Git repo

1. Cloudflare Dashboard → Workers & Pages → **Pages** tab → Create Project
2. Connect GitHub → select `dev-electro/roo-baby`
3. **Build command:** `npm run build`
4. **Build output directory:** `build`
5. Set environment variables (step 1)
6. Deploy

### 3. Verify

```
curl https://roo-baby.pages.dev/api/health
```
Should return `{"status":"ok","config":{"api_key_set":true,...}}`

---

## Local Development

```bash
npm install
npm run dev          # SvelteKit SPA on :5173
npx wrangler pages dev build -- npm run dev   # Full Pages + Functions
```

---

## Model Options

| Model | Audio | Image | Notes |
|-------|-------|-------|-------|
| `gemini-2.0-flash` | ✅ | ✅ | Default — fast, cheap, reliable |
| `gemma-4-26b-a4b-it` | ❌ | ✅ | Gemma 4 26B via API, image only |
| `gemma-4-e4b-it` | ✅ | ✅ | True E4B — requires local GPU (Hugging Face) |

Change via `GEMINI_MODEL_NAME` in Pages env vars. No code deploy needed.

> Only E2B/E4B Gemma 4 variants support native audio. The 26B/31B on Gemini API are text+image only. Use `gemini-2.0-flash` for cloud-based audio analysis.

---

## API

**POST /api/analyze** — Multipart form with `audio` (WAV/MP3/FLAC) and/or `image` (JPEG)

Response:
```json
{
  "category": "HUNGER",
  "confidence": 89,
  "severity": "MEDIUM",
  "reasoning": "Rhythmic pattern with gradual buildup",
  "parent_action": "Feed baby now.",
  "response_sound": "heartbeat",
  "pre_cry": false,
  "_meta": { "mode": "both", "model": "gemma-4-26b-a4b-it", "timestamp": "..." }
}
```

**GET /api/health** — Config status check

---

## Gemma 4 E4B (Real-Time Audio)

For true native Gemma 4 E4B audio (Hugging Face, local GPU), use the Colab setup in `/colab/` (coming soon). Cloud version uses Gemini API.
