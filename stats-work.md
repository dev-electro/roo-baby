# ROO — Audio Statistics & Dataset Coverage

## Status: Atlas Statistics Pending

We are moving from a 25-exemplar "Visual Atlas" to a 3000-sample "Statistical Atlas". This will reduce VLM token usage by ~80% (removing the heavy composite image) while significantly improving classification accuracy by providing the model with real distribution data.

---

## Goal: Dataset-Wide Statistical Summary

Compute per-category audio statistics from ALL 3,643+ available samples across our 3 datasets. These stats will be injected into the LLM prompt, allowing the model to compare the user's recording against the "Center of Gravity" for each cry type.

### Datasets to Process (~3,643 samples)
1. **Donate-a-Cry:** 457 samples (`data/donateacry`)
2. **Kaggle Baby Crying:** 918 samples (`data/kaggle_baby_crying`)
3. **Baby Chillanto:** 2,268 samples (`data/chillanto`)

---

## Task 1: Python Extraction Script (`scripts/generate_stats.py`)

Create a new script that performs a batch extraction. It must use the same logic as our client-side extractor (`src/lib/utils/audioFeatures.js`) to ensure "apples-to-apples" comparison.

### Features to Extract (Per Sample)
- **Dominant Frequency (Hz):** Main pitch via autocorrelation.
- **RMS Energy:** Average loudness.
- **Zero-Crossing Rate:** Number of times signal crosses zero (pitch proxy).
- **Silence Ratio:** Percentage of 20ms frames below threshold (0.01).
- **Onset Ratio:** Ratio of energy in first 50% vs total.
- **Autocorrelation Strength:** How "pitched" or "clean" the signal is (0.0 to 1.0).
- **Spectral Centroid (Hz):** "Brightness" of the sound.
- **Cry-Peak Ratio:** Percentage of spectral peaks in the 200–1000Hz range.

### Statistical Aggregation (Per Category)
For each of the 5 categories (HUNGER, PAIN, TIRED, DISCOMFORT, BURPING), calculate:
- `mean`, `std_dev`
- `min`, `max`
- `p25` (25th percentile), `p50` (median), `p75` (75th percentile)
- `count` (number of valid samples processed)

---

## Task 2: Output Format

The script must output two files to `static/atlas/`:

### 1. `atlas_stats.json` (For system/debug use)
```json
{
  "HUNGER": {
    "dominantFreqHz": { "mean": 452.1, "std": 45.2, "p25": 410, "p50": 450, "p75": 490 },
    "rmsEnergy": { "mean": 0.045, "std": 0.012, "p25": 0.035, "p50": 0.044, "p75": 0.052 },
    ...
    "count": 1240
  },
  "PAIN": { ... }
}
```

### 2. `atlas_stats_prompt.txt` (The "Statistical Atlas")
A compressed, human-readable text block designed for LLM consumption:
```text
CATEGORICAL DISTRIBUTIONS (Based on 3,643 samples):
- HUNGER (n=1240): Freq 410-490Hz (med 450), RMS 0.03-0.05, Silence <15%, High Onset (0.65)
- PAIN (n=850): Freq 650-850Hz (med 720), RMS 0.08-0.12, Silence >30% (bursty), Low Onset (0.45)
...
```

---

## Task 3: Integration (`functions/api/analyze.js`)

1. **Fetch Stats:** Update the Cloudflare Pages Function to fetch `atlas_stats_prompt.txt` (cached similarly to the image atlas).
2. **Inject Prompt:** Replace the visual reference instructions with a new section using `{{AUDIO_STATS}}`.
3. **Logic Update:** Tell the model to:
   - "Compare the USER'S AUDIO MEASUREMENTS against the CATEGORICAL DISTRIBUTIONS provided below."
   - "A match within the p25-p75 range for Dominant Frequency and Silence Ratio is a strong indicator."

---

## Architecture Context

```
Extraction Phase (Build-time)
  │
  ├─ scripts/generate_stats.py
  ├─ Reads 3000+ WAVs from data/
  ├─ Computes librosa features (matching JS implementation)
  └─ Writes static/atlas/atlas_stats.json & atlas_stats_prompt.txt
  
Inference Phase (Runtime)
  │
  ├─ Browser extracts user features → POST /api/analyze
  ├─ CF Function fetches atlas_stats_prompt.txt
  ├─ CF Function injects {{AUDIO_STATS}} and {{AUDIO_FEATURES}}
  └─ LLM performs numeric reasoning + visual spectrogram check
```

## Why this is better:
1. **Coverage:** 3,000+ samples represented vs 25 individual images.
2. **Efficiency:** `atlas_stats_prompt.txt` is ~1KB. `atlas_master.webp` is ~400KB.
3. **Accuracy:** Models like Gemini/Gemma are excellent at numeric range comparison ("Is 450Hz between 410Hz and 490Hz?").
4. **Resilience:** Numeric stats are immune to "noise" in the way images are not.

## How to Deliver
1. Implement `scripts/generate_stats.py`.
2. Generate and commit the files in `static/atlas/`.
3. Update `functions/api/analyze.js` to use the new stats.
4. Update prompt templates to leverage the numeric distributions.
