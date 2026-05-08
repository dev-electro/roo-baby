# ROO — Baby Cry Analyzer 🍼

**World's first multimodal baby cry analyzer + responder.**  
Built for the [DEV x Gemma 4 Challenge](https://dev.to/challenges/gemma4).

---

## Architecture (Dual Backend)

```
┌─────────────────────────────────────────────────────────────────┐
│                      ROO Frontend (SvelteKit PWA)                │
│                    https://roo-baby.pages.dev                    │
└──────────┬──────────────────────────────────┬───────────────────┘
           │                                  │
           ▼                                  ▼
┌──────────────────────┐         ┌──────────────────────────────┐
│  Cloud Pages Function│         │  Google Colab + ngrok        │
│  (/api/analyze)      │         │  (FastAPI on T4 GPU)         │
│                      │         │                              │
│  Gemini 2.0 Flash    │         │  Gemma 4 E4B (8B params)    │
│  ★ Fast demo         │         │  ★ True audio+vision model   │
│  ★ No GPU needed     │         │  ★ Challenge-winning accuracy│
│  ★ Always online     │         │  ★ 30s audio, multilingual   │
└──────────────────────┘         └──────────────────────────────┘
```

**One frontend, two backends.** Toggle in Settings. Cloud for instant demo. Colab for real Gemma 4 E4B.

---

## Features

- **Audio Analysis** — Record cries, WebM→WAV auto-conversion, instant AI analysis
- **Image Analysis** — Capture baby face, detect distress signals before crying starts
- **Best Mode (Both)** — Combined audio + vision, cross-referenced for highest accuracy
- **Soothing Response** — Web Audio heartbeat, white noise, lullaby, shush
- **TTS Comfort** — Gentle maternal voice speaks to baby
- **PWA** — Install on mobile, offline cache, service worker
- **Analysis History** — All results persisted in localStorage
- **Dual Backend** — Pages Function for quick demo, Colab for true Gemma 4 E4B

---

## Quick Start (Cloud Demo)

### 1. Deploy on Cloudflare Pages

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Build output | `.svelte-kit/cloudflare` |
| Env: `GEMINI_API_KEY` | From [aistudio.google.com/apikey](https://aistudio.google.com/app/apikey) |

```bash
git clone https://github.com/dev-electro/roo-baby.git
cd roo-baby
npm install
npm run build
```

Deploy via Cloudflare Dashboard → Pages → Connect Git → `dev-electro/roo-baby`.

### 2. Verify

```bash
curl https://roo-baby.pages.dev/api/health
# {"status":"ok","key_set":true,"model":"gemini-2.0-flash"}
```

---

## True Gemma 4 E4B (Colab GPU)

For the **real Gemma 4 E4B** with native audio analysis:

### 1. Open Google Colab

Copy the cells from `backend/colab_setup.sh` into a new Colab notebook with **T4 GPU** runtime.

### 2. Get ngrok URL

The Colab script auto-starts the server and prints:
```
🍼 ROO API URL: https://xxxx-xxxx.ngrok-free.app
```

### 3. Configure Frontend

1. Open https://roo-baby.pages.dev
2. Tap settings gear (bottom-right)
3. Paste the ngrok URL
4. Save → now using true Gemma 4 E4B

---

## Backend API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Status check |
| `/analyze/audio` | POST | Audio-only cry analysis |
| `/analyze/image` | POST | Image-only face analysis |
| `/analyze/both` | POST | Combined audio + image |
| `/api/analyze` | POST | Pages Function (auto-detects mode) |

### Response Format

```json
{
  "category": "HUNGER",
  "confidence": 91,
  "severity": "HIGH",
  "reasoning": "Both audio rhythm and visual rooting confirm hunger",
  "parent_action": "Baby is hungry. Feed immediately.",
  "response_sound": "heartbeat",
  "pre_cry": false,
  "pre_cry_message": null
}
```

---

## Benchmark

```bash
cd backend
python benchmark.py
```

Tests against [Donate a Cry corpus](https://github.com/gveres/donateacry-corpus) across 5 categories. Results saved to `benchmark_results.json`.

---

## Project Structure

```
roo-baby/
├── src/                    # SvelteKit frontend
│   ├── routes/             # Pages + layout
│   ├── lib/components/     # 11 Svelte 5 components
│   ├── lib/utils/          # Audio, API, TTS, sounds, history
│   └── lib/state/          # Svelte 5 runes state
├── functions/api/          # Cloudflare Pages Functions
│   ├── analyze.js          # Gemini API proxy
│   └── health.js           # Deployment health
├── backend/                # Colab Python backend
│   ├── app.py              # FastAPI server
│   ├── model.py            # Gemma 4 E4B loader
│   ├── prompts.py          # Analysis prompt templates
│   ├── benchmark.py        # Accuracy testing
│   ├── requirements.txt    # Python deps
│   └── colab_setup.sh      # One-click Colab setup
├── static/                 # PWA assets
├── svelte.config.js        # adapter-static
└── README.md
```

---

## Model Comparison

| Model | Audio | Image | Access | Best For |
|-------|-------|-------|--------|----------|
| **Gemma 4 E4B** | ✅ Native | ✅ | HuggingFace / Colab GPU | Challenge submission |
| **Gemini 2.0 Flash** | ✅ | ✅ | Gemini API / Pages | Instant demo |
| Gemma 4 26B A4B | ❌ | ✅ | Gemini API | Image-only |

> Only **E2B** and **E4B** Gemma 4 variants support native audio. We deploy E4B via Colab for the challenge.

---

*Built with love for tired parents everywhere. Powered by Gemma 4.*
