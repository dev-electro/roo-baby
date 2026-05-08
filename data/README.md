# ROO Baby Cry Reference Atlas

This directory holds baby cry audio datasets used to generate the reference spectrogram atlas.

## Datasets

### 1. Donate-a-Cry (457 samples)
```bash
git clone https://github.com/gveres/donateacry-corpus.git donateacry
```
Labels encoded in filenames: `hu` (hunger), `bu` (burping), `bp` (belly pain), `dc` (discomfort), `ti` (tired), `lo` (lonely), `ch` (cold/hot), `sc` (scared)

### 2. Kaggle Baby Crying (918 samples)
Download from: https://www.kaggle.com/datasets/warcoder/baby-crying-dataset
Unzip to `kaggle_baby_crying/`
Labels: directory-based (0=hunger, 1=pain, 2=discomfort, 3=tired, 4=burping)

### 3. Baby Chillanto (2,268 samples)
Download from: https://www.kaggle.com/datasets/mohammadibraheim2/baby-chillanto-dataset
Unzip to `chillanto/`
Labels: asphyxia (pain), normal (discomfort baseline)

## Generating the Atlas

```bash
pip install librosa Pillow numpy soundfile
python scripts/generate_atlas.py
```

Output goes to `static/atlas/`:
- `hunger_01.webp` through `burping_05.webp` — individual exemplar spectrograms
- `atlas_audio.webp` — composite reference card
- `atlas_master.webp` — full atlas with reading guide
- `atlas_manifest.json` — metadata for frontend

The atlas is sent as few-shot context with every audio/both analysis request to OpenRouter, helping the VLM visually match patterns.