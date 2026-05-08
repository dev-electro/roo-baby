# ROO — Work Pending

## Task: Generate Spectrogram Reference Atlas

**Goal:** Run `scripts/generate_atlas.py` to produce labeled mel spectrogram reference images from baby cry datasets for few-shot visual prompting of Gemma 4 VLM.

---

### Why This Matters

The ROO app converts baby cry audio → mel spectrogram PNG, then sends it to Gemma 4 (via OpenRouter free endpoints) alongside a reference atlas of labeled examples. The VLM visually matches the user's spectrogram against known patterns (hunger, pain, tired, discomfort, burping). This few-shot visual approach targets 90%+ accuracy without any model fine-tuning.

The atlas images are **shipped as static assets** and fetched by the Pages Function at runtime to prepend as the first image in every prompt.

---

### Setup (one-time, ~450 MB download)

```bash
# 1. Clone repo
git clone https://github.com/dev-electro/roo-baby.git
cd roo-baby

# 2. Install deps
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

### Expected Output (`static/atlas/`, ~0.5-1 MB total)

```
static/atlas/
├── hunger_01.webp ... hunger_05.webp      (5 best exemplars per category)
├── pain_01.webp    ... pain_05.webp
├── tired_01.webp   ... tired_05.webp
├── discomfort_01.webp ... discomfort_05.webp
├── burping_01.webp ... burping_05.webp
├── atlas_master.webp   (composite card with labels + reading guide)
├── atlas_audio.webp    (audio-only composite card)
└── atlas_manifest.json (metadata JSON)
```

The script:
1. Scans all datasets in `data/`
2. Computes mel spectrograms for every WAV file
3. Scores each by clarity + pattern strength
4. Picks top 5 per category (best exemplars)
5. Renders with magma colormap (same as client-side spectrogram generator)
6. Creates composite `atlas_master.webp` with labeled spectrograms + reading guide
7. Outputs everything to `static/atlas/`

---

### What to Deliver Back

**Only the `static/atlas/` folder.** Delete the datasets afterwards — they are build-time only, not shipped to production.

---

### How the Atlas is Used in Production

1. User records baby cry in browser
2. Client generates mel spectrogram PNG (same colormap, same 512x256 size)
3. Cloudflare Pages Function fetches `atlas_master.webp` from `https://roo-baby.pages.dev/atlas/atlas_master.webp`
4. Function sends to OpenRouter: `[atlas_master.webp, user_spectrogram.png, user_face.jpg]` + prompt text
5. VLM compares user's spectrogram against labeled references and outputs structured JSON

The prompt instructs: *"The first image is a REFERENCE ATLAS showing labeled example spectrograms for each cry category. The second image is the USER'S spectrogram to analyze. Compare the user's spectrogram pattern against the reference atlas and the signatures…"*

---

### Alternative: Browser-Based Placeholder Generator

If you can't run the Python script, open `static/atlas-generator.html` in any browser. It generates synthetic spectrograms and lets you download all files individually. These placeholders work for development but have lower accuracy than real data.

---

## Architecture Context

```
Browser (SvelteKit/CF Pages)
  │
  ├─ Record audio → Web Audio API → mel spectrogram PNG (512x256, magma colormap)
  ├─ Capture face photo (front/back camera)
  ├─ POST /api/analyze
  │   form: { spectrogram.png, face.jpg, mode }
  │
  ▼
Cloudflare Pages Function (functions/api/analyze.js)
  │
  ├─ Fetch atlas_master.webp from static site
  ├─ Build OpenRouter chat completion:
  │   model: MODEL_SINGLE (26B A4B) or MODEL_BOTH (31B)
  │   images: [atlas_master.webp, spectrogram.png, face.jpg?]
  │   prompt: analysis prompt with spectrogram reading guide
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