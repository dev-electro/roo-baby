# ROO — Baby Cry Analyzer

**World's first multimodal baby cry analyzer + responder.**

Powered by Gemma 4 E4B (audio + vision natively). Built for the DEV x Gemma 4 Challenge.

---

## Architecture (Unified Cloudflare Pages)

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                         │
│  ┌─────────────────────┐    ┌───────────────────────────┐  │
│  │   Static Assets     │    │   Pages Function          │  │
│  │   (SvelteKit SPA)   │    │   src/routes/api/analyze  │  │
│  │                     │    │                           │  │
│  │  • index.html       │───>│  Receives audio/image     │  │
│  │  • JS/CSS bundles   │    │  Calls Gemini API         │  │
│  │  • PWA manifest     │    │  Returns JSON analysis    │  │
│  └─────────────────────┘    └───────────────────────────┘  │
│                              │                              │
│                              ▼                              │
│                    ┌─────────────────┐                      │
│                    │   Gemini API    │                      │
│                    │  (Gemma 4 E4B)  │                      │
│                    └─────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

Everything deploys as **one project** on Cloudflare Pages. No separate Worker needed.

---

## Features

- **Audio Analysis** — Record baby cries, get instant AI analysis
- **Image Analysis** — Capture baby face, detect distress signals
- **Best Mode (Both)** — Combined audio + vision for highest accuracy
- **Soothing Response** — Auto-plays heartbeat, white noise, lullaby, or shush via Web Audio API
- **TTS Comfort** — Gentle spoken words to calm baby
- **PWA** — Install on mobile home screen, works offline
- **WebM → WAV** — Silent client-side audio conversion for browser compatibility
- **Zero CORS** — Frontend and backend are same-origin

---

## Prerequisites

- Node.js 18+
- Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# 3. Start dev server
npm run dev
```

Open `http://localhost:5173`

---

## Deploy to Cloudflare Pages

### Option A: Git Integration (Recommended)

1. Push this repo to GitHub
2. In [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages → Create Project
3. Connect your GitHub repo
4. **Build command:** `npm run build`
5. **Build output:** `.svelte-kit/cloudflare`
6. Add environment variables in Dashboard → Settings → Environment Variables:
   - `GEMINI_API_KEY` = your key (encrypt it!)
   - `GEMINI_MODEL_NAME` = `gemma-4-e4b-it` (optional)
7. Deploy

### Option B: Wrangler CLI

```bash
# Build
npm run build

# Deploy (requires Wrangler login)
npx wrangler pages deploy .svelte-kit/cloudflare
```

Then set secrets in the dashboard:
- `GEMINI_API_KEY` — required
- `GEMINI_MODEL_NAME` — optional (defaults to `gemini-1.5-flash-latest`)

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ | — | Google Gemini API key |
| `GEMINI_MODEL_NAME` | ❌ | `gemini-1.5-flash-latest` | Model to use for analysis |

---

## Audio Format Compatibility

| Browser | Records As | Handled By |
|---------|-----------|------------|
| Chrome/Android | WebM/Opus | **Auto-converts to WAV** via Web Audio API |
| Safari/iOS | MP4/AAC | Accepted natively |
| Firefox | WebM/Opus | **Auto-converts to WAV** |

If conversion fails, a file upload fallback appears automatically.

---

## API Response Format

```json
{
  "category": "HUNGER",
  "confidence": 89,
  "severity": "MEDIUM",
  "reasoning": "Rhythmic pattern with gradual buildup",
  "parent_action": "Feed baby now. Try breastfeeding or bottle.",
  "response_sound": "heartbeat",
  "pre_cry": false,
  "pre_cry_message": null
}
```

Categories: `HUNGER`, `PAIN`, `TIRED`, `DISCOMFORT`, `BURPING`, `UNKNOWN`  
Severity: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`  
Sounds: `heartbeat`, `whitenoise`, `lullaby`, `shush`

---

## Project Structure

```
roo-baby/
├── src/
│   ├── app.html                    # HTML shell with PWA meta tags
│   ├── app.css                     # Global design tokens & animations
│   ├── service-worker.js           # PWA cache strategy
│   ├── routes/
│   │   ├── +layout.svelte          # App shell (background orbs)
│   │   ├── +page.svelte            # Main page with all components
│   │   └── api/
│   │       └── analyze/
│   │           └── +server.js      # Backend API (Pages Function)
│   └── lib/
│       ├── state/
│       │   └── appState.svelte.js  # Global reactive state (Svelte 5 runes)
│       ├── utils/
│       │   ├── audioEncoder.js     # WebM → WAV converter
│       │   ├── apiClient.js        # Fetch wrapper to /api/analyze
│       │   ├── ttsEngine.js        # Web Speech API wrapper
│       │   └── soundGenerator.js   # Web Audio sound generation
│       └── components/
│           ├── Icon.svelte         # SVG icon library
│           ├── Header.svelte
│           ├── ModeTabs.svelte
│           ├── AudioRecorder.svelte
│           ├── CameraCapture.svelte
│           ├── BothModePanel.svelte
│           ├── AnalyzeButton.svelte
│           ├── LoadingState.svelte
│           ├── ResultCard.svelte
│           ├── ResponsePlayer.svelte
│           ├── SettingsPanel.svelte
│           └── ErrorToast.svelte
├── static/
│   ├── manifest.json               # PWA manifest
│   └── favicon.svg                 # App icon
├── .env.example                    # Environment variable template
├── package.json
├── svelte.config.js                # Uses @sveltejs/adapter-cloudflare
└── vite.config.js
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit 2 + Svelte 5 Runes |
| Adapter | `@sveltejs/adapter-cloudflare` |
| Styling | Scoped CSS + CSS Custom Properties |
| Icons | Custom SVG (no emoji) |
| Audio | Web Audio API + MediaRecorder |
| Backend | SvelteKit API Routes → Pages Functions |
| AI Model | Gemini API (Gemma 4 E4B or fallback) |
| Hosting | Cloudflare Pages |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Gemini API error: 404" | Model name invalid. Set `GEMINI_MODEL_NAME` to `gemini-1.5-flash-latest` in Pages env vars. |
| "Unsupported audio format" | Browser recorded WebM. Should auto-convert. If not, upload a WAV file. |
| Camera not working | Use file upload fallback, or ensure HTTPS + camera permissions. |
| No sound on iOS | Tap the page once first (iOS requires user interaction to unlock AudioContext). |
| Build fails with Miniflare error | This only happens in limited environments. Deploy via Pages CI works fine. |

---

*Built with love for tired parents everywhere.*
