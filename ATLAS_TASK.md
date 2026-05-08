# ROO Atlas Generator — Async Coder Handoff

## Task
Generate labeled mel spectrogram reference images from baby cry datasets for use as few-shot visual prompts in a VLM (Vision Language Model).

## Output Required
Place these files in `static/atlas/` of the project:

```
static/atlas/
├── hunger_01.webp ... hunger_05.webp    (5 best exemplars per category)
├── pain_01.webp    ... pain_05.webp
├── tired_01.webp   ... tired_05.webp
├── discomfort_01.webp ... discomfort_05.webp
├── burping_01.webp ... burping_05.webp
├── atlas_master.webp                  (composite reference card ~100-200KB)
├── atlas_audio.webp                   (audio-only reference card)
└── atlas_manifest.json                (metadata JSON)
```

Total expected output size: **~0.5-1 MB**

## Datasets (~450 MB total download)

### 1. Donate-a-Cry (457 samples, ~35 MB)
```bash
git clone https://github.com/gveres/donateacry-corpus.git data/donateacry
```
Labels encoded in filenames:
- `hu` = HUNGER, `bu` = BURPING, `bp` = PAIN, `dc` = DISCOMFORT
- `ti` = TIRED, `lo` = DISCOMFORT, `ch` = DISCOMFORT, `sc` = PAIN

### 2. Kaggle Baby Crying (918 samples, ~140 MB)
https://www.kaggle.com/datasets/warcoder/baby-crying-dataset
Download and extract to `data/kaggle_baby_crying/`
Labels: `0`=HUNGER, `1`=PAIN, `2`=DISCOMFORT, `3`=TIRED, `4`=BURPING

### 3. Baby Chillanto (2,268 samples, ~170 MB)
https://www.kaggle.com/datasets/mohammadibraheim2/baby-chillanto-dataset
Download and extract to `data/chillanto/`
Labels: `asphyxia` = PAIN, `normal` = DISCOMFORT

## How to Run

```bash
pip install librosa Pillow numpy soundfile
python scripts/generate_atlas.py
```

The script in `scripts/generate_atlas.py` will:
1. Scan all datasets in `data/`
2. Compute mel spectrograms for every file
3. Score each by clarity/pattern strength
4. Pick top 5 per category
5. Render with magma colormap
6. Create composite atlas cards with labels + reading guide
7. Output everything to `static/atlas/`

## What the Atlas Looks Like

The `atlas_master.webp` is a composite image (~1400x1800px) containing:
- Title: "ROO BABY CRY ANALYZER — REFERENCE SPECTROGRAMS"
- 5 rows (one per category) with 3 exemplar spectrograms each
- Category labels in color with descriptions
- Reading guide at bottom explaining axes and pattern signatures

This image is sent as the FIRST image in every VLM prompt so the model can visually compare the user's spectrogram against labeled examples.

## If No Datasets Available

You can generate synthetic placeholders:
```bash
python scripts/generate_atlas.py  # auto-generates placeholders if no data found
```

Or open `static/atlas-generator.html` in a browser to generate and download placeholders manually.