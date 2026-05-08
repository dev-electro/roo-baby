# ROO — Work Pending

## Status: Synthethic Atlas Complete, Real-Data Atlas Pending

The synthetic placeholder atlas is now generated and deployed. The remaining task is to replace it with a real-data atlas for higher accuracy.

---

## Completed: Synthetic Atlas (current)

- **Script:** `scripts/generate_atlas_node.mjs` — zero-dep Node.js atlas generator (uses sharp for WebP output)
- **Output:** `static/atlas/` — 25 WebP exemplars + composite `atlas_master.webp` (404 KB) + `atlas_manifest.json`
- **Format:** WebP (30-50% smaller than PNG, VLM-compatible, no distortion)
- **Status:** Generated and deployed to `roo-baby.pages.dev/atlas/atlas_master.webp`

Run with:
```bash
node scripts/generate_atlas_node.mjs
```

---

## Pending: Real-Data Atlas (higher accuracy)

**Goal:** Replace synthetic placeholders with real spectrograms from baby cry datasets. This requires Python + librosa.

### Setup (one-time, ~450 MB download)

```bash
# 1. Clone repo
git clone https://github.com/dev-electro/roo-baby.git
cd roo-baby

# 2. Install deps (requires Python + pip)
pip install librosa Pillow numpy soundfile

# 3. Download 3 datasets into data/

# Dataset 1: Donate-a-Cry (457 samples)
git clone https://github.com/gveres/donateacry-corpus.git data/donateacry

# Dataset 2: Kaggle Baby Crying (918 samples)
#    https://www.kaggle.com/datasets/warcoder/baby-crying-dataset
#    Download and unzip into data/kaggle_baby_crying/

# Dataset 3: Baby Chillanto (2,268 samples)
#    https://www.kaggle.com/datasets/mohammadibraheim2/baby-chillanto-dataset
#    Download and unzip into data/chillanto/
```

### Run

```bash
python scripts/generate_atlas.py
```

If no datasets are found, it auto-generates synthetic placeholders (for development).

---

### Label Mappings

| Dataset label | Maps to |
|---|---|
| `hu` (Donate-a-Cry) | HUNGER |
| `bu` | BURPING |
| `bp` | PAIN |
| `dc`, `lo`, `ch` | DISCOMFORT |
| `ti` | TIRED |
| `sc` | PAIN |
| `0` (Kaggle) | HUNGER |
| `1` | PAIN |
| `2` | DISCOMFORT |
| `3` | TIRED |
| `4` | BURPING |
| `asphyxia` (Chillanto) | PAIN |
| `normal` | DISCOMFORT |

---

### Expected Output (`static/atlas/`, ~1.5 MB total)

```
static/atlas/
├── hunger_01.webp ... hunger_05.webp      (5 best exemplars per category)
├── pain_01.webp    ... pain_05.webp
├── tired_01.webp   ... tired_05.webp
├── discomfort_01.webp ... discomfort_05.webp
├── burping_01.webp ... burping_05.webp
├── atlas_master.webp   (composite card with labels + reading guide)
└── atlas_manifest.json (metadata JSON)
```

The real-data script:
1. Scans all datasets in `data/`
2. Computes mel spectrograms for every WAV file
3. Scores each by clarity + pattern strength
4. Picks top 5 per category (best exemplars)
5. Renders with magma colormap (must match client-side spectrogram generator)
6. Creates composite `atlas_master.webp` with labeled spectrograms + reading guide
7. Outputs everything to `static/atlas/`

---

### What to Deliver Back

**Only the `static/atlas/` folder.** Delete the datasets afterwards — they are build-time only, not shipped to production.

---

### How the Atlas is Used in Production

1. User records baby cry in browser
2. Client generates mel spectrogram (WebP, 512x256, magma colormap, Hz/time axis labels)
3. Client extracts audio features (dominant freq, RMS, ZCR, silence/onset ratios)
4. Cloudflare Pages Function fetches `atlas_master.webp` from `https://roo-baby.pages.dev/atlas/atlas_master.webp`
5. Function sends to OpenRouter: `[atlas_master.webp, user_spectrogram.webp, face.jpg?]` + prompt text with `{{AUDIO_FEATURES}}` injected
6. VLM compares user's spectrogram against labeled references + audio measurements, outputs structured JSON

---

### Alternative: Browser-Based Placeholder Generator

If you can't run Node or Python, open `static/atlas-generator.html` in any browser. It generates synthetic spectrograms and lets you download all files individually. These placeholders work for development but have lower accuracy than real data.

---

## Architecture Context

```
Browser (SvelteKit/CF Pages)
  │
  ├─ Record audio → Web Audio API → mel spectrogram WebP (512x256, magma colormap, axis labels)
  ├─ Extract numeric audio features (dominant freq, peak freqs, RMS, ZCR, silence/onset ratios)
  ├─ Capture face photo (front/back camera)
  ├─ POST /api/analyze
  │   form: { spectrogram.webp, face.jpg, mode, audio_features }
  │
  ▼
Cloudflare Pages Function (functions/api/analyze.js)
  │
  ├─ Fetch atlas_master.webp from static site
  ├─ Parse audio_features JSON, inject into prompt text via {{AUDIO_FEATURES}}
  ├─ Build OpenRouter chat completion:
  │   model: MODEL_SINGLE (26B A4B) or MODEL_BOTH (31B)
  │   images: [atlas_master.webp, spectrogram.webp, face.jpg?]
  │   prompt: analysis prompt with audio measurements + spectrogram reading guide
  │   response_format: json_object (enforced)
  │
  ├─ On 429 rate-limit → retry with MODEL_FALLBACK
  ├─ Parse JSON response → return to frontend
  │
  ▼
Result: { category, confidence, severity, reasoning, parent_action, response_sound, pre_cry }
```

**Environment Variables (set in Cloudflare Pages dashboard):**
- `OPENROUTER_API_KEY` — your key from https://openrouter.ai/settings/keys
- `MODEL_SINGLE` — default: `google/gemma-4-26b-a4b-it:free`
- `MODEL_BOTH` — default: `google/gemma-4-31b-it:free`
- `MODEL_FALLBACK` — default: `google/gemma-4-31b-it:free`
- `SITE_URL` — default: `https://roo-baby.pages.dev`

---

## Bug Fixes Applied (not yet deployed)

- `analyze.js` line ~243: was sending raw `PROMPTS[mode]` instead of `promptText` with `{{AUDIO_FEATURES}}` injected — **fixed**
- Atlas fetch URL updated from `.webp` → `.png` → back to `.webp` (now generating WebP directly)
- `generate_atlas_node.mjs` now outputs WebP via sharp (was PNG-only)