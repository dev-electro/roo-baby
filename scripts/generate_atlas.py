#!/usr/bin/env python3
"""
ROO Atlas Generator — Creates labeled mel spectrogram reference images
from baby cry datasets for few-shot visual prompting.

Datasets:
  - Donate-a-Cry: https://github.com/gveres/donateacry-corpus (457 samples)
  - baby_crying Kaggle: https://www.kaggle.com/datasets/warcoder/baby-crying-dataset (918 samples)
  - Baby Chillanto: https://www.kaggle.com/datasets/mohammadibraheim2/baby-chillanto-dataset (2268 samples)

Usage:
  1. Download datasets and place WAV files in data/ subdirectories
  2. Run this script: python scripts/generate_atlas.py
  3. Outputs go to static/atlas/

Outputs:
  - static/atlas/{category}_XX.webp — individual exemplar spectrograms
  - static/atlas/atlas_audio.webp     — composite reference card (audio)
  - static/atlas/atlas_master.webp    — full reference card with labels & arrows
"""

import os
import sys
import numpy as np
from pathlib import Path

try:
    import librosa
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Install: pip install librosa Pillow numpy")
    sys.exit(1)

# ── Config ──────────────────────────────────────────────────────────
SAMPLE_RATE = 16000
N_MELS = 128
N_FFT = 2048
HOP_LENGTH = 512
MAX_DURATION = 10  # seconds
SPEC_WIDTH = 512
SPEC_HEIGHT = 256
EXEMPLARS_PER_CATEGORY = 5
DPI = 100

# Category mapping from each dataset's labels
CATEGORY_MAP = {
    # Donate-a-Cry
    'hu': 'HUNGER', 'bu': 'BURPING', 'bp': 'PAIN', 'dc': 'DISCOMFORT',
    'ti': 'TIRED', 'lo': 'DISCOMFORT', 'ch': 'DISCOMFORT', 'sc': 'PAIN',
    # Baby Chillanto (asphyxia = pain, normal = discomfort baseline)
    'asphyxia': 'PAIN', 'normal': 'DISCOMFORT',
    # Kaggle baby_crying numeric labels
    '0': 'HUNGER', '1': 'PAIN', '2': 'DISCOMFORT', '3': 'TIRED', '4': 'BURPING',
    # Common English names
    'hungry': 'HUNGER', 'hunger': 'HUNGER',
    'pain': 'PAIN', 'belly_pain': 'PAIN',
    'tired': 'TIRED', 'sleepy': 'TIRED',
    'discomfort': 'DISCOMFORT', 'uncomfortable': 'DISCOMFORT',
    'burping': 'BURPING', 'burp': 'BURPING',
    'colic': 'PAIN',
}

# Magma colormap (simplified)
MAGMA_STOPS = [
    (0.00, (0, 0, 4)),
    (0.14, (30, 17, 101)),
    (0.29, (106, 19, 127)),
    (0.43, (164, 62, 101)),
    (0.57, (219, 122, 48)),
    (0.71, (249, 192, 24)),
    (0.86, (252, 249, 92)),
    (1.00, (252, 253, 191)),
]

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ATLAS_DIR = PROJECT_ROOT / 'static' / 'atlas'
DATA_DIR = PROJECT_ROOT / 'data'

CATEGORIES = ['HUNGER', 'PAIN', 'TIRED', 'DISCOMFORT', 'BURPING']
CATEGORY_COLORS = {
    'HUNGER': '#FF7B5C',
    'PAIN': '#FF4D6D',
    'TIRED': '#7B8CDE',
    'DISCOMFORT': '#FFB347',
    'BURPING': '#52D9C1',
}

CATEGORIES_DESCRIPTIONS = {
    'HUNGER': 'Rhythmic "neh" pattern, 400-600Hz, gradual buildup',
    'PAIN': 'Sudden sharp spikes, 600-800Hz, silence gaps',
    'TIRED': 'Whiny nasal, 300-450Hz, irregular fading',
    'DISCOMFORT': 'Sustained mid-range, 400-500Hz, grunting',
    'BURPING': 'Short isolated bursts, descending pitch',
}


def magma_colormap(t):
    if t <= 0:
        return MAGMA_STOPS[0][1]
    if t >= 1:
        return MAGMA_STOPS[-1][1]
    for i in range(len(MAGMA_STOPS) - 1):
        t0, c0 = MAGMA_STOPS[i]
        t1, c1 = MAGMA_STOPS[i + 1]
        if t0 <= t <= t1:
            f = (t - t0) / (t1 - t0) if t1 != t0 else 0
            return tuple(int(c0[j] + f * (c1[j] - c0[j])) for j in range(3))
    return MAGMA_STOPS[-1][1]


def compute_mel_spectrogram(audio_path):
    try:
        y, sr = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True, duration=MAX_DURATION)
    except Exception:
        return None
    if len(y) < SAMPLE_RATE:
        return None
    mel = librosa.feature.melspectrogram(
        y=y, sr=SAMPLE_RATE, n_mels=N_MELS, n_fft=N_FFT, hop_length=HOP_LENGTH,
        fmin=80, fmax=8000
    )
    mel_db = librosa.power_to_db(mel, ref=np.max, top_db=80)
    return mel_db


def spectrogram_to_image(mel_db):
    mel_norm = (mel_db - mel_db.min()) / (mel_db.max() - mel_db.min() + 1e-10)
    h, w = mel_norm.shape
    img = np.zeros((h, w, 3), dtype=np.uint8)
    for i in range(h):
        for j in range(w):
            img[i, j] = magma_colormap(mel_norm[i, j])
    pil_img = Image.fromarray(img)
    pil_img = pil_img.resize((SPEC_WIDTH, SPEC_HEIGHT), Image.LANCZOS)
    return pil_img


def parse_donateacry_labels(data_dir):
    samples = []
    for fname in os.listdir(data_dir):
        if not fname.endswith(('.wav', '.caf', '.3gp', '.ogg', '.m4a')):
            continue
        parts = fname.replace('.wav', '').replace('.caf', '').replace('.3gp', '').split('-')
        if len(parts) >= 5:
            label = parts[-1].split('.')[0].lower()
            category = CATEGORY_MAP.get(label)
            if category:
                samples.append((os.path.join(data_dir, fname), category))
    return samples


def parse_kaggle_baby_crying(data_dir):
    samples = []
    for root, dirs, files in os.walk(data_dir):
        for f in files:
            if not f.endswith(('.wav', '.mp3', '.ogg', '.flac')):
                continue
            path = os.path.join(root, f)
            parent = os.path.basename(root).lower()
            label = parent if parent in CATEGORY_MAP else None
            if not label:
                for key in CATEGORY_MAP:
                    if key in f.lower() or key in parent:
                        label = key
                        break
            if label:
                category = CATEGORY_MAP.get(label)
                if category:
                    samples.append((path, category))
    return samples


def parse_chillanto(data_dir):
    samples = []
    for root, dirs, files in os.walk(data_dir):
        for f in files:
            if not f.endswith(('.wav', '.mp3', '.ogg', '.flac')):
                continue
            path = os.path.join(root, f)
            parent = os.path.basename(root).lower()
            for key in ['asphyxia', 'normal', 'hungry', 'pain', 'tired', 'discomfort', 'burping']:
                if key in parent or key in f.lower():
                    category = CATEGORY_MAP.get(key)
                    if category:
                        samples.append((path, category))
                        break
    return samples


def score_spectrogram(mel_db):
    """Score a spectrogram by clarity and pattern strength. Higher = better exemplar."""
    if mel_db is None:
        return -1
    energy = np.mean(mel_db)
    dynamic_range = np.std(mel_db)
    onset_strength = np.mean(librosa.onset.onset_strength(S=mel_db, sr=SAMPLE_RATE))
    return energy * 0.3 + dynamic_range * 0.5 + onset_strength * 0.2


def load_all_samples():
    all_samples = {cat: [] for cat in CATEGORIES}

    datasets = {
        'donateacry': DATA_DIR / 'donateacry',
        'kaggle': DATA_DIR / 'kaggle_baby_crying',
        'chillanto': DATA_DIR / 'chillanto',
    }

    parser_map = {
        'donateacry': parse_donateacry_labels,
        'kaggle': parse_kaggle_baby_crying,
        'chillanto': parse_chillanto,
    }

    for name, data_dir in datasets.items():
        if not data_dir.exists():
            print(f"  Skipping {name}: directory not found")
            continue
        print(f"  Scanning {name}: {data_dir}")
        parser = parser_map[name]
        samples = parser(str(data_dir))
        for path, category in samples:
            all_samples[category].append(path)

    for cat in CATEGORIES:
        print(f"  {cat}: {len(all_samples[cat])} samples")

    return all_samples


def generate_exemplars(all_samples):
    ATLAS_DIR.mkdir(parents=True, exist_ok=True)
    exemplars = {cat: [] for cat in CATEGORIES}

    for cat in CATEGORIES:
        print(f"\nProcessing {cat}...")
        scored = []
        for path in all_samples[cat]:
            mel = compute_mel_spectrogram(path)
            if mel is None:
                continue
            score = score_spectrogram(mel)
            scored.append((score, path, mel))

        scored.sort(key=lambda x: -x[0])
        top = scored[:EXEMPLARS_PER_CATEGORY]

        for i, (score, path, mel) in enumerate(top):
            img = spectrogram_to_image(mel)
            filename = f"{cat.lower()}_{i+1:02d}.webp"
            img.save(ATLAS_DIR / filename, 'WEBP', quality=92)
            exemplars[cat].append((filename, img))
            print(f"    Saved {filename} (score={score:.2f})")

    return exemplars


def create_atlas_card(exemplars, output_path, label_prefix="AUDIO"):
    """Create a single composite atlas card with labeled spectrograms."""
    rows = len(CATEGORIES)
    cols = min(EXEMPLARS_PER_CATEGORY, max(len(v) for v in exemplars.values()) if any(exemplars.values()) else 1)

    cell_w = SPEC_WIDTH
    cell_h = SPEC_HEIGHT
    label_h = 30
    header_h = 40
    col_label_h = 28
    padding = 8

    total_w = cols * (cell_w + padding) + padding
    total_h = header_h + rows * (cell_h + label_h + padding) + padding

    canvas = Image.new('RGB', (total_w, total_h), (18, 18, 24))
    draw = ImageDraw.Draw(canvas)

    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
    except OSError:
        font = ImageFont.load_default()
        font_small = font
        font_title = font

    # Title
    draw.text((padding, 8), f"ROO {label_prefix} REFERENCE ATLAS", fill=(255, 255, 255), font=font_title)

    y = header_h

    for cat_idx, cat in enumerate(CATEGORIES):
        cat_color = CATEGORY_COLORS[cat]
        color_rgb = tuple(int(cat_color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))

        # Category label
        draw.text((padding, y), f"● {cat}", fill=color_rgb, font=font)
        draw.text((padding + 80, y), CATEGORIES_DESCRIPTIONS[cat], fill=(180, 180, 180), font=font_small)
        y += label_h

        # Spectrograms
        x = padding
        for col_idx, (filename, img) in enumerate(exemplars.get(cat, [])):
            canvas.paste(img, (x, y))
            x += cell_w + padding

        y += cell_h + padding

    canvas.save(output_path, 'WEBP', quality=95)
    print(f"  Saved atlas card: {output_path}")
    return canvas


def create_master_atlas(exemplars, output_path):
    """Create the master atlas combining audio + descriptions."""
    card_w = len(CATEGORIES) * 260 + 40
    card_h = EXEMPLARS_PER_CATEGORY * (SPEC_HEIGHT // 2 + 40) + 600

    canvas = Image.new('RGB', (1400, max(1800, card_h)), (12, 12, 18))
    draw = ImageDraw.Draw(canvas)

    try:
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
        font_cat = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15)
        font_desc = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
        font_arrow = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
    except OSError:
        font_title = font_cat = font_desc = font_arrow = ImageFont.load_default()

    # Title
    draw.text((20, 15), "ROO BABY CRY ANALYZER — REFERENCE SPECTROGRAMS", fill=(255, 255, 255), font=font_title)
    draw.text((20, 45), "Compare user's spectrogram against these labeled patterns. Frequency (Hz) on Y-axis, Time on X-axis, Brightness = Intensity.",
              fill=(160, 160, 160), font=font_desc)

    y = 80
    for cat_idx, cat in enumerate(CATEGORIES):
        cat_color = CATEGORY_COLORS[cat]
        color_rgb = tuple(int(cat_color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))

        # Category header
        draw.text((20, y), f"■ {cat}", fill=color_rgb, font=font_cat)
        draw.text((140, y), CATEGORIES_DESCRIPTIONS[cat], fill=(180, 180, 180), font=font_desc)
        y += 30

        # Place exemplars in a row
        x = 20
        thumb_h = SPEC_HEIGHT // 2
        thumb_w = SPEC_WIDTH // 2
        for col_idx, (filename, img) in enumerate(exemplars.get(cat, [])[:3]):
            thumb = img.resize((thumb_w, thumb_h), Image.LANCZOS)
            canvas.paste(thumb, (x, y))
            draw.text((x, y + thumb_h + 2), f"Ex {col_idx+1}", fill=(140, 140, 140), font=font_arrow)
            x += thumb_w + 10

        y += thumb_h + 30

    # Reading guide at bottom
    y += 20
    draw.text((20, y), "HOW TO READ THESE SPECTROGRAMS:", fill=(255, 255, 255), font=font_cat)
    y += 28
    guide_lines = [
        "• X-axis = Time (seconds), Y-axis = Frequency (Hz), Color brightness = Intensity",
        "• HUNGER: Rhythmic vertical band pattern at 400-600Hz, intensity gradually increasing",
        "• PAIN: Sudden bright tall spikes at 600-800Hz with dark silence gaps between cries",
        "• TIRED: Dim smears at low frequency (300-450Hz), fading in and out irregularly",
        "• DISCOMFORT: Steady mid-range glow around 400-500Hz, sustained without pause",
        "• BURPING: Short isolated bursts, each burst slightly lower in pitch (descending)",
    ]
    for line in guide_lines:
        draw.text((20, y), line, fill=(200, 200, 200), font=font_desc)
        y += 20

    canvas.save(output_path, 'WEBP', quality=95)
    print(f"  Saved master atlas: {output_path}")


def main():
    print("ROO Atlas Generator")
    print("=" * 50)

    ATLAS_DIR.mkdir(parents=True, exist_ok=True)

    # Load samples
    print("\n1. Loading datasets...")
    all_samples = load_all_samples()

    total = sum(len(v) for v in all_samples.values())
    if total == 0:
        print("\nNo samples found! Place datasets in:")
        print(f"  {DATA_DIR / 'donateacry'}")
        print(f"  {DATA_DIR / 'kaggle_baby_crying'}")
        print(f"  {DATA_DIR / 'chillanto'}")
        print("\nThen re-run this script.")
        # Generate placeholder atlas with synthetic data
        print("\nGenerating placeholder atlas with synthetic spectrograms...")
        generate_placeholder_atlas()
        return

    # Generate exemplars
    print("\n2. Generating exemplar spectrograms...")
    exemplars = generate_exemplars(all_samples)

    # Create atlas cards
    print("\n3. Creating atlas cards...")
    create_atlas_card(exemplars, ATLAS_DIR / 'atlas_audio.webp', label_prefix='AUDIO')
    create_master_atlas(exemplars, ATLAS_DIR / 'atlas_master.webp')

    # Generate JSON manifest for the frontend
    manifest = {
        'categories': {},
        'total_samples': total,
    }
    for cat in CATEGORIES:
        manifest['categories'][cat] = {
            'description': CATEGORIES_DESCRIPTIONS[cat],
            'color': CATEGORY_COLORS[cat],
            'exemplars': [f for f, _ in exemplars.get(cat, [])],
        }

    import json
    with open(ATLAS_DIR / 'atlas_manifest.json', 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f"\nDone! Atlas generated in {ATLAS_DIR}")
    print(f"  Individual exemplars: {sum(len(v) for v in exemplars.values())} images")
    print(f"  Atlas card: atlas_audio.webp")
    print(f"  Master atlas: atlas_master.webp")
    print(f"  Manifest: atlas_manifest.json")


def generate_placeholder_atlas():
    """Generate synthetic placeholder spectrograms for development."""
    import json

    exemplars = {cat: [] for cat in CATEGORIES}
    np.random.seed(42)

    patterns = {
        'HUNGER': lambda t, f: np.sin(2 * np.pi * 450 * t) * 0.5 * (1 + 0.3 * np.sin(2 * np.pi * 1.5 * t)),
        'PAIN': lambda t, f: np.sin(2 * np.pi * 700 * t) * np.exp(-((t % 0.8) - 0.15) ** 2 / 0.01),
        'TIRED': lambda t, f: np.sin(2 * np.pi * 380 * t) * (0.3 + 0.2 * np.sin(2 * np.pi * 0.3 * t)),
        'DISCOMFORT': lambda t, f: np.sin(2 * np.pi * 450 * t) * 0.5,
        'BURPING': lambda t, f: np.sin(2 * np.pi * (800 - 200 * t) * t) * np.exp(-((t % 1.5) - 0.1) ** 2 / 0.02),
    }

    for cat in CATEGORIES:
        for i in range(EXEMPLARS_PER_CATEGORY):
            t = np.linspace(0, MAX_DURATION, SAMPLE_RATE * MAX_DURATION)
            signal = patterns[cat](t, None) + np.random.normal(0, 0.05, len(t))
            mel = librosa.feature.melspectrogram(
                y=signal.astype(np.float32), sr=SAMPLE_RATE, n_mels=N_MELS,
                n_fft=N_FFT, hop_length=HOP_LENGTH, fmin=80, fmax=8000
            )
            mel_db = librosa.power_to_db(mel, ref=np.max, top_db=80)
            img = spectrogram_to_image(mel_db)

            filename = f"{cat.lower()}_{i+1:02d}.webp"
            img.save(ATLAS_DIR / filename, 'WEBP', quality=92)
            exemplars[cat].append((filename, img))

    create_atlas_card(exemplars, ATLAS_DIR / 'atlas_audio.webp', label_prefix='AUDIO')
    create_master_atlas(exemplars, ATLAS_DIR / 'atlas_master.webp')

    manifest = {
        'categories': {},
        'total_samples': 0,
        'placeholder': True,
    }
    for cat in CATEGORIES:
        manifest['categories'][cat] = {
            'description': CATEGORIES_DESCRIPTIONS[cat],
            'color': CATEGORY_COLORS[cat],
            'exemplars': [f for f, _ in exemplars[cat]],
        }

    with open(ATLAS_DIR / 'atlas_manifest.json', 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f"  Placeholder atlas saved to {ATLAS_DIR}")


if __name__ == '__main__':
    main()