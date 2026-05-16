# ROO — The Multimodal Baby Cry Analyzer 🍼

*This is a submission for the [Gemma 4 Challenge: Build with Gemma 4](https://dev.to/challenges/google-gemma-2026-05-06).*

**Live Demo:** [roo.risingranks.in](https://roo.risingranks.in) · [roo-baby.pages.dev](https://roo-baby.pages.dev)  
*(Works on any modern mobile browser — try it with mic and camera enabled)*

---

## 🍼 The Problem

Every parent faces this at 3 AM: *your baby is crying and you have no idea why.*

Existing apps (CryAnalyzer, ChatterBaby, AYA) rely on outdated CNN classifiers from 2019-2022. They frequently fail parents because they can *hear* a cry, but they cannot truly *understand* it. 

**ROO does two things no existing app does:**
1. **Analyzes** baby cries using both acoustic (audio) AND visual (face) signals together.
2. **Responds back** to the baby with scientifically-matched soothing sounds and a maternal voice.

## 🧠 How I Used Gemma 4

### The Core Technical Insight: "Audio as Vision"

Because public web-inference providers for Gemma 4's native-audio models aren't widely available yet, I took a different approach: **I made the model *see* the cry instead of hear it.**

ROO uses the Web Audio API to convert the raw audio of a baby's cry into a **mel spectrogram** entirely on the client-side. A spectrogram is a 2D image where X = time, Y = frequency, and brightness = energy. 

Every cry type has a visually distinct pattern:
- **Hunger:** Regular repeating bands with gaps (rhythmic).
- **Pain:** Sudden bright explosion across all frequencies.
- **Tired:** Fading, irregular, concentrated in the lower frequency range.

This image is then securely sent to **Gemma 4's Vision Model**. This isn't just a workaround—spectrogram-based audio classification is an industry-standard approach in audio ML research.

**Result: Gemma 4's advanced visual reasoning applied to sound.**

### Three Input Modes
1. **🎙️ Audio Only:** Record cry → spectrogram → Gemma 4 vision → classification. *(Best for dark rooms at night).*
2. **📸 Image Only:** Baby face photo → Gemma 4 vision → expression analysis. *(The surprise feature: **pre-cry detection**. Detects rooting reflex or lip-smacking before crying begins).*
3. **⚡ Audio + Image (Best Mode):** Both inputs → Gemma 4 cross-references both signals. *(When acoustic patterns AND facial expressions agree, confidence jumps significantly).*

### 🎶 ROO Responds Back

After classifying the cry, ROO actively responds to the baby:

| Cry Type | Sound Response | Voice Response |
|---|---|---|
| **Hunger** | 60 BPM heartbeat | *"Shh little one, food is coming…"* |
| **Pain** | Womb white noise | *"It's okay baby, mama is here…"* |
| **Tired** | Soft lullaby tones | *"Time to sleep, you're safe…"* |
| **Discomfort**| Rhythmic shushing | *"Shh shh, getting comfortable…"* |

*All responses are backed by infant psychology research.*

---

## 🛠 Tech Stack

- **Frontend:** SvelteKit (Svelte 5 Runes)
- **Deployment:** Cloudflare Pages (Static + Edge API Routes)
- **AI Engine:** Gemma 4 Vision 
- **Audio Processing:** MediaRecorder API → Local Mel Spectrogram Generation
- **Visuals:** `getUserMedia` API
- **Response:** Web Audio API (synthesized sounds/R2 streaming) + Web Speech API (TTS)

## 🚀 Quick Start (Local Development)

### 1. Clone & Install
```bash
git clone https://github.com/dev-electro/roo-baby.git
cd roo-baby
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
# Your AI API key (supports Gemini/OpenRouter endpoints)
VITE_API_KEY=your_api_key_here
```

### 3. Run Locally
```bash
npm run dev
```
Open `http://localhost:5173` in your browser. 

---

## 🔒 Privacy First

ROO is designed for infants, so privacy is non-negotiable.
- **No PII:** No accounts, names, or emails required.
- **No Logging:** Audio recordings and photos are *never* saved or logged to a database.
- **Transient Processing:** Audio is processed into a spectrogram locally. The spectrogram and downscaled photo are sent to the AI, analyzed, and immediately discarded.

## 🔮 What's Next?

- **V2:** Switch to native audio input via Gemma 4 E4B/E2B endpoints when available (no spectrogram needed).
- **V3:** ROO learns YOUR baby's unique cry patterns over time.
- **V4:** Baby Monitor Mode — passive listening and push notifications.
- **V5:** Medical anomaly detection (e.g., jaundice or neurological indicators).
- **V6:** Full on-device inference via LiteRT-LM (Zero internet required).

---
*Babies have been trying to communicate since the beginning of humanity. We finally have a model capable enough to start listening.*
