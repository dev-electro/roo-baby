# CLAUDE.md — ROO Project
## Instructions for AI Coder (Claude Code / Codex / Gemini)

---

## WHAT YOU ARE BUILDING

ROO — World's first multimodal baby cry analyzer + responder.
Powered by Gemma 4 E4B (audio + vision natively).
Built for DEV x Gemma 4 Challenge (deadline May 24, 2025).

**READ ROO_SPEC.md FIRST before writing any code.**

---

## YOUR MISSION

Build a working prototype in one session. Ship > Perfect.

The prototype must demonstrate:
1. Audio recording → Gemma 4 analysis → Result shown
2. Image capture → Gemma 4 analysis → Result shown
3. Combined audio + image → Best accuracy result
4. Appropriate soothing sound plays after analysis
5. TTS speaks gently to baby

---

## TECH DECISIONS — DO NOT CHANGE THESE

| Decision | Choice | Reason |
|---|---|---|
| Model | Gemma 4 E4B (google/gemma-4-E4B-it) | Only model with native audio+vision |
| Backend | FastAPI + Python | Simple, fast |
| GPU Platform | Google Colab T4 (free) | Zero cost |
| Frontend | Single index.html | No build step, fastest |
| Audio format | WAV, mono, 16kHz | Gemma 4 requirement |
| Tunnel | ngrok | Expose Colab to browser |

---

## FILE STRUCTURE — BUILD EXACTLY THIS

```
roo/
├── CLAUDE.md               ← This file
├── ROO_SPEC.md             ← Full spec
├── backend/
│   ├── app.py              ← FastAPI (build this first)
│   ├── model.py            ← Gemma 4 loader
│   ├── prompts.py          ← System prompts
│   ├── benchmark.py        ← Accuracy tester
│   └── requirements.txt    ← Dependencies
├── frontend/
│   ├── index.html          ← Complete UI (single file)
│   └── sounds/
│       ├── heartbeat.mp3
│       ├── whitenoise.mp3
│       ├── lullaby.mp3
│       └── shush.mp3
└── README.md
```

---

## BUILD ORDER — FOLLOW EXACTLY

### Phase 1: Backend (build first, test before frontend)

**Step 1:** Create requirements.txt
```
fastapi
uvicorn
python-multipart
transformers>=4.44.0
accelerate
torch
librosa
pillow
pyngrok
soundfile
```

**Step 2:** Build prompts.py (copy from ROO_SPEC.md exactly)

**Step 3:** Build model.py
- Load Gemma 4 E4B with bfloat16
- device_map="auto"
- Three methods: analyze_audio_only, analyze_image_only, analyze_combined
- Audio must be resampled to 16kHz mono before sending to model
- Parse JSON from model output — handle malformed JSON gracefully

**Step 4:** Build app.py
- Three POST endpoints: /analyze/audio, /analyze/image, /analyze/both
- CORS allow all origins (demo only)
- Health check at GET /health

**Step 5:** Test backend with curl before touching frontend:
```bash
# Test image endpoint
curl -X POST http://localhost:8000/analyze/image \
  -F "image=@test_baby.jpg"

# Test audio endpoint
curl -X POST http://localhost:8000/analyze/audio \
  -F "audio=@test_cry.wav"
```

---

### Phase 2: Frontend

Build index.html as ONE complete file — no separate CSS/JS files.

**Required sections:**
1. Header with logo + tagline
2. Three mode tabs (Audio / Image / Both)
3. Recording interface per mode
4. Analyze button
5. Result card
6. Response player

**Critical JS requirements:**
- MediaRecorder for audio (NOT getUserMedia alone)
- Always resample/ensure audio is in correct format
- Handle camera permission errors gracefully
- Auto-stop recording after 10 seconds
- Show loading state during API call
- Handle API errors — show friendly message
- Play sound immediately when result arrives
- TTS speaks after sound starts

**DO NOT:**
- Use any external JS framework
- Use npm or any build tool
- Make multiple JS files
- Fetch sounds from external URLs (embed or use local)

---

### Phase 3: Sounds

Download from freesound.org or generate:
- Each sound should be 30-60 seconds long
- Loop-friendly (fade in/out)
- Save as MP3 in frontend/sounds/

If you cannot download sounds, generate them programmatically:
```javascript
// Fallback: Generate heartbeat with Web Audio API
function generateHeartbeat(context) {
    // Create oscillator at 60 BPM
    // This is acceptable for demo
}
```

---

### Phase 4: Benchmark

Run benchmark.py against Donate a Cry dataset.
Dataset: https://github.com/gveres/donateacry-corpus

Map categories:
- donateacry "hungry" → ROO "HUNGER"
- donateacry "belly_pain" → ROO "PAIN"
- donateacry "burping" → ROO "BURPING"
- donateacry "discomfort" → ROO "DISCOMFORT"
- donateacry "tired" → ROO "TIRED"

Report accuracy per category AND overall.
Save results to benchmark_results.json.

---

## ERROR HANDLING RULES

**Model loading fails:**
- Print clear error message
- Check GPU memory availability
- Try loading with 8-bit quantization as fallback

**Audio format issues:**
- Always use librosa.load() with sr=16000, mono=True
- Handle MP4, M4A, WAV, OGG (mobile browsers send different formats)

**JSON parsing fails:**
- Log raw model output
- Return safe default: category=UNKNOWN, confidence=0
- Never crash the API

**Camera/mic permission denied:**
- Show user-friendly message in UI
- Offer file upload as fallback

---

## PROMPTING RULES

**Always use JSON-only output format.**
**Never ask model to be "helpful" — give specific instructions.**
**Include exact acoustic signatures in prompt.**
**Use chain-of-thought for combined mode.**

If accuracy seems low during testing:
1. Add more specific acoustic descriptions to prompt
2. Add few-shot examples (send sample cries with labels)
3. Try temperature=0 (already do_sample=False)
4. Increase max_new_tokens if response is cut off

---

## COLAB SPECIFIC NOTES

- Model download takes ~15-20 minutes first time
- Save model to /content/drive/MyDrive/roo_model/ to avoid re-downloading
- ngrok free tier = 1 tunnel at a time
- Session timeout = 12 hours (enough for demo)
- If GPU runs out of memory, use load_in_8bit=True

---

## DEFINITION OF DONE

Before declaring prototype complete, verify:

- [ ] /health endpoint returns 200
- [ ] /analyze/audio returns valid JSON with all required fields
- [ ] /analyze/image returns valid JSON with all required fields
- [ ] /analyze/both returns valid JSON with all required fields
- [ ] Frontend loads without errors
- [ ] Audio recording works in Chrome mobile
- [ ] Camera capture works in Chrome mobile
- [ ] Result card displays correctly
- [ ] Sound plays after analysis
- [ ] TTS speaks
- [ ] benchmark.py runs and reports >70% accuracy
- [ ] Works on mobile browser (test with Chrome DevTools)

---

## DO NOT OVER-ENGINEER

This is a 3-4 hour prototype for a hackathon.

**DO NOT build:**
- Database
- User accounts
- Authentication
- Rate limiting
- Logging system
- Docker setup
- CI/CD
- Tests
- Multiple environments

**DO build:**
- Working demo
- Clean code
- Good error messages
- Mobile-friendly UI

Ship it. Win it. Optimize later.

---

## WHEN STUCK

1. Check if Gemma 4 E4B is correctly loaded (model.device)
2. Check audio is 16kHz mono before sending to model
3. Check CORS is enabled for all origins
4. Check ngrok URL is updated in frontend
5. Check browser console for JS errors
6. If model output is not JSON — update prompt to be MORE explicit
7. If GPU OOM — reduce batch size, use 8-bit quantization

---

## FINAL NOTE

The idea is unique. Gemma 4 E4B audio + vision for baby cries.
Nobody else is building this for this challenge.

Your job: Make it work. Make it demo-able. Make it real.

The prize is $3,000. The real prize is proving this matters.

Build ROO. 🍼
