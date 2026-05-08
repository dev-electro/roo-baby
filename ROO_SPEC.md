# ROO — Baby Cry Analyzer & Responder
## Complete Build Spec for AI Coder

---

## WHAT ARE WE BUILDING?

ROO is the world's first multimodal baby cry analyzer + responder powered by Gemma 4 E4B.

It does TWO things no existing app does:
1. Analyzes baby cries using Gemma 4's native AUDIO + VISION together
2. Responds back with appropriate soothing sounds

**DEV Challenge Entry:** https://dev.to/challenges/gemma4

---

## PROJECT STRUCTURE

```
roo/
├── backend/
│   ├── app.py              ← FastAPI server (main backend)
│   ├── model.py            ← Gemma 4 E4B loader + inference
│   ├── prompts.py          ← All system prompts + few-shot
│   └── colab_run.sh        ← Commands to run on Google Colab
├── frontend/
│   ├── index.html          ← Complete single-file frontend
│   └── sounds/
│       ├── heartbeat.mp3   ← For hunger response
│       ├── whitenoise.mp3  ← For pain/colic response
│       ├── lullaby.mp3     ← For tired response
│       └── shush.mp3       ← For discomfort response
└── README.md
```

---

## TECH STACK

| Layer | Technology | Why |
|---|---|---|
| Model | Gemma 4 E4B (google/gemma-4-E4B-it) | Native audio + vision, free weights |
| Inference | HuggingFace Transformers | Official support for E4B audio |
| Backend | FastAPI + Python | Fast, simple API |
| Hosting | Google Colab T4 GPU + ngrok | Free GPU, public URL |
| Frontend | Vanilla HTML/CSS/JS | No build step, fastest |
| Audio Capture | MediaRecorder API (browser) | Built-in, no library needed |
| Camera | getUserMedia API (browser) | Built-in |
| TTS Response | Web Speech API (browser) | Built-in, free |
| Audio Response | HTML5 Audio (pre-recorded files) | Instant playback |

---

## BACKEND — app.py

```python
# FastAPI server with 3 endpoints

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from model import RooModel
import uvicorn

app = FastAPI()

# Allow all origins for demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

model = RooModel()

@app.post("/analyze/audio")
async def analyze_audio(audio: UploadFile = File(...)):
    audio_bytes = await audio.read()
    result = model.analyze_audio_only(audio_bytes)
    return result

@app.post("/analyze/image")
async def analyze_image(image: UploadFile = File(...)):
    image_bytes = await image.read()
    result = model.analyze_image_only(image_bytes)
    return result

@app.post("/analyze/both")
async def analyze_both(
    audio: UploadFile = File(...),
    image: UploadFile = File(...)
):
    audio_bytes = await audio.read()
    image_bytes = await image.read()
    result = model.analyze_combined(audio_bytes, image_bytes)
    return result

@app.get("/health")
def health():
    return {"status": "ROO is running"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## BACKEND — model.py

```python
import torch
import json
import io
from transformers import AutoProcessor, AutoModelForMultimodalLM
from PIL import Image
import librosa
import numpy as np
from prompts import AUDIO_PROMPT, IMAGE_PROMPT, COMBINED_PROMPT

MODEL_ID = "google/gemma-4-E4B-it"

class RooModel:
    def __init__(self):
        print("Loading Gemma 4 E4B...")
        self.model = AutoModelForMultimodalLM.from_pretrained(
            MODEL_ID,
            dtype=torch.bfloat16,
            device_map="auto"
        )
        self.processor = AutoProcessor.from_pretrained(MODEL_ID)
        print("ROO Model Ready!")

    def _parse_result(self, output_text):
        # Extract JSON from model output
        try:
            start = output_text.find('{')
            end = output_text.rfind('}') + 1
            json_str = output_text[start:end]
            return json.loads(json_str)
        except:
            return {
                "category": "UNKNOWN",
                "confidence": 0,
                "severity": "LOW",
                "reasoning": "Could not analyze",
                "parent_action": "Please try recording again",
                "response_sound": "whitenoise"
            }

    def _load_audio(self, audio_bytes):
        # Load audio from bytes, resample to 16kHz mono
        audio_array, sr = librosa.load(
            io.BytesIO(audio_bytes),
            sr=16000,
            mono=True
        )
        # Trim to max 30 seconds
        max_samples = 30 * 16000
        audio_array = audio_array[:max_samples]
        return audio_array, sr

    def analyze_audio_only(self, audio_bytes):
        audio_array, sr = self._load_audio(audio_bytes)

        messages = [{
            "role": "user",
            "content": [
                {"type": "audio", "audio": audio_array},
                {"type": "text", "text": AUDIO_PROMPT}
            ]
        }]

        inputs = self.processor.apply_chat_template(
            messages,
            add_generation_prompt=True,
            tokenize=True,
            return_tensors="pt",
            return_dict=True
        ).to(self.model.device)

        with torch.inference_mode():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=300,
                do_sample=False
            )

        result_text = self.processor.decode(
            outputs[0][inputs["input_ids"].shape[-1]:],
            skip_special_tokens=True
        )
        return self._parse_result(result_text)

    def analyze_image_only(self, image_bytes):
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        messages = [{
            "role": "user",
            "content": [
                {"type": "image", "image": image},
                {"type": "text", "text": IMAGE_PROMPT}
            ]
        }]

        inputs = self.processor.apply_chat_template(
            messages,
            add_generation_prompt=True,
            tokenize=True,
            return_tensors="pt",
            return_dict=True
        ).to(self.model.device)

        with torch.inference_mode():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=300,
                do_sample=False
            )

        result_text = self.processor.decode(
            outputs[0][inputs["input_ids"].shape[-1]:],
            skip_special_tokens=True
        )
        return self._parse_result(result_text)

    def analyze_combined(self, audio_bytes, image_bytes):
        audio_array, sr = self._load_audio(audio_bytes)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        messages = [{
            "role": "user",
            "content": [
                {"type": "audio", "audio": audio_array},
                {"type": "image", "image": image},
                {"type": "text", "text": COMBINED_PROMPT}
            ]
        }]

        inputs = self.processor.apply_chat_template(
            messages,
            add_generation_prompt=True,
            tokenize=True,
            return_tensors="pt",
            return_dict=True
        ).to(self.model.device)

        with torch.inference_mode():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=400,
                do_sample=False
            )

        result_text = self.processor.decode(
            outputs[0][inputs["input_ids"].shape[-1]:],
            skip_special_tokens=True
        )
        return self._parse_result(result_text)
```

---

## BACKEND — prompts.py

```python
AUDIO_PROMPT = """
You are ROO, the world's most advanced baby cry analyzer.
Analyze this baby cry audio carefully.

CATEGORIES AND THEIR ACOUSTIC SIGNATURES:

HUNGER:
- Rhythmic, repetitive pattern (neh-neh-neh sound)
- Starts soft, builds gradually in intensity
- Medium pitch, regular intervals
- Stops briefly then resumes

PAIN:
- Sudden, high-pitched, piercing cry
- Intense from the very start
- May have breath-holding pauses
- Urgent, panicked quality

TIRED:
- Whiny, nasal quality
- Intermittent, fading at end
- Lower intensity than hunger
- Rubbing sounds may accompany

DISCOMFORT:
- Continuous, fussy cry
- Medium pitch, less urgent than pain
- May include grunting sounds
- Body discomfort indicator

BURPING:
- Short bursts of crying
- Mixed with grunting/straining
- Stops and starts frequently
- Lower pitched

Respond ONLY in this exact JSON format, no other text:
{
  "category": "HUNGER",
  "confidence": 85,
  "severity": "MEDIUM",
  "reasoning": "Rhythmic repetitive pattern detected with gradual buildup",
  "parent_action": "Baby needs feeding now. Try breastfeeding or bottle.",
  "response_sound": "heartbeat",
  "pre_cry_warning": false
}

severity options: LOW, MEDIUM, HIGH, CRITICAL
response_sound options: heartbeat, whitenoise, lullaby, shush
"""

IMAGE_PROMPT = """
You are ROO, an expert in reading baby facial expressions and body language.
Analyze this baby's face and body for distress signals.

VISUAL SIGNS TO DETECT:

HUNGER signals:
- Rooting reflex (turning head, open mouth)
- Hands moving toward mouth
- Lip smacking or sucking motion
- Furrowed brow with searching expression

PAIN signals:
- Scrunched/crumpled facial expression
- Tightly shut eyes
- Open square mouth shape
- Rigid or arched body
- Flushed/red face

TIRED signals:
- Heavy, drooping eyelids
- Eye rubbing (if hands visible)
- Yawning
- Glassy unfocused eyes
- Limp body posture

DISCOMFORT signals:
- General fussiness in expression
- Arched back (if visible)
- Pulling legs toward belly
- Grimacing

CALM signals:
- Relaxed facial muscles
- Normal eye focus
- No distress in expression

Respond ONLY in this exact JSON format:
{
  "category": "HUNGER",
  "confidence": 78,
  "severity": "MEDIUM",
  "reasoning": "Rooting reflex visible, hands near mouth",
  "parent_action": "Baby showing hunger cues. Feed soon.",
  "response_sound": "heartbeat",
  "pre_cry_warning": true
}
"""

COMBINED_PROMPT = """
You are ROO. You have BOTH the baby's cry audio AND facial image.
This is the most accurate analysis mode.

Analyze BOTH inputs together:
1. What does the CRY SOUND tell you? (pitch, rhythm, intensity, pattern)
2. What does the FACIAL EXPRESSION tell you? (signals, body language)
3. Do they AGREE or CONFLICT?
4. What is your COMBINED conclusion?

Use your multimodal analysis to give the most accurate classification.
Give higher confidence when audio and image agree.
Give lower confidence when they conflict.

Categories: HUNGER, PAIN, TIRED, DISCOMFORT, BURPING

Respond ONLY in this exact JSON format:
{
  "category": "HUNGER",
  "confidence": 91,
  "severity": "HIGH",
  "audio_signal": "Rhythmic hunger pattern detected",
  "image_signal": "Rooting reflex clearly visible",
  "signals_agree": true,
  "reasoning": "Both audio rhythm and visual rooting confirm hunger",
  "parent_action": "Baby is hungry. Feed immediately.",
  "response_sound": "heartbeat",
  "pre_cry_warning": false
}
"""
```

---

## COLAB SETUP (colab_run.sh)

Run these commands in Google Colab cells:

```bash
# Cell 1 - Install dependencies
!pip install fastapi uvicorn python-multipart transformers \
             accelerate torch librosa pillow pyngrok

# Cell 2 - Clone repo and run
!git clone https://github.com/YOUR_USERNAME/roo.git
%cd roo/backend

# Cell 3 - Start server + expose with ngrok
from pyngrok import ngrok
import subprocess
import threading

def run_server():
    subprocess.run(["python", "app.py"])

thread = threading.Thread(target=run_server)
thread.start()

# Get public URL
public_url = ngrok.connect(8000)
print(f"\n🍼 ROO API URL: {public_url}")
print("Copy this URL into index.html → API_BASE_URL")
```

---

## FRONTEND — index.html

Build a single HTML file with this structure and behavior:

### Visual Design Direction:
- **Theme:** Soft, warm, nurturing — NOT clinical
- **Colors:** Warm cream background (#FFF9F0), soft coral accent (#FF6B6B), 
  gentle blue (#4A90D9), mint green (#52B788)
- **Font:** Google Fonts — "Nunito" (rounded, friendly)
- **Mood:** Like a warm night light — calming for both parent and baby
- **Animations:** Breathing pulse on record button, wave animation for audio

### UI Sections:

**1. Header**
```
ROO 🍼
"Babies have been talking. Now we listen."
```

**2. Mode Selector (3 tabs)**
```
[🎙️ Audio Only] [📸 Image Only] [🎙️📸 Both]
```

**3. Input Area (changes based on mode)**

Audio mode:
```
Big circular record button (pulsing animation)
"Hold to record baby's cry (10 seconds)"
Waveform animation while recording
```

Image mode:
```
Camera viewfinder or upload button
"Capture baby's face"
Preview of captured image
```

Both mode:
```
Split view — mic + camera
"Record cry while camera captures face"
```

**4. Analyze Button**
```
[🔍 Analyze with ROO]
Loading spinner with "Listening..."
```

**5. Result Card (appears after analysis)**
```
╔════════════════════════╗
║  😭 HUNGER             ║
║  Confidence: 89%       ║
║  Severity: MEDIUM      ║
║                        ║
║  "Rhythmic cry with    ║
║   gradual buildup"     ║
║                        ║
║  💡 Feed baby now      ║
╚════════════════════════╝
```

**6. Response Player**
```
🔊 ROO is responding to baby...
[Heartbeat sound auto-plays]
[TTS: "Shh little one, mama is coming..."]
[Stop Response button]
```

### JavaScript Logic:

```javascript
const API_BASE_URL = "NGROK_URL_HERE"; // Replace with Colab ngrok URL

// Audio Recording
let mediaRecorder, audioChunks = [];

async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.start();
    
    // Auto stop after 10 seconds
    setTimeout(() => mediaRecorder.stop(), 10000);
}

// Image Capture  
async function captureImage() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    // Draw to canvas, get blob
}

// Analyze
async function analyze(mode) {
    const formData = new FormData();
    
    if (mode === 'audio' || mode === 'both') {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        formData.append('audio', audioBlob, 'cry.wav');
    }
    
    if (mode === 'image' || mode === 'both') {
        formData.append('image', imageBlob, 'baby.jpg');
    }
    
    const endpoint = `/analyze/${mode}`;
    const response = await fetch(API_BASE_URL + endpoint, {
        method: 'POST',
        body: formData
    });
    
    const result = await response.json();
    showResult(result);
    playResponse(result);
}

// Play Response
function playResponse(result) {
    // Play pre-recorded sound
    const soundMap = {
        'heartbeat': 'sounds/heartbeat.mp3',
        'whitenoise': 'sounds/whitenoise.mp3',
        'lullaby': 'sounds/lullaby.mp3',
        'shush': 'sounds/shush.mp3'
    };
    
    const audio = new Audio(soundMap[result.response_sound]);
    audio.play();
    
    // TTS gentle message
    const messages = {
        'HUNGER': "Shh little one, food is coming soon...",
        'PAIN': "It's okay baby, mama is here...",
        'TIRED': "Time to sleep, you're safe little one...",
        'DISCOMFORT': "Shh shh, let's get you comfortable...",
        'BURPING': "Let it out little one, you'll feel better..."
    };
    
    const utterance = new SpeechSynthesisUtterance(messages[result.category]);
    utterance.rate = 0.8;  // Slow, gentle
    utterance.pitch = 1.1; // Slightly higher, warmer
    utterance.volume = 0.7;
    speechSynthesis.speak(utterance);
}
```

---

## RESPONSE SOUNDS — Where to get FREE sounds

Download from freesound.org (Creative Commons license):

| Sound | Search query on freesound.org |
|---|---|
| heartbeat.mp3 | "baby heartbeat soothing" |
| whitenoise.mp3 | "white noise baby sleep" |
| lullaby.mp3 | "soft lullaby instrumental" |
| shush.mp3 | "shushing baby calm" |

OR generate using: https://mynoise.net (free)

---

## API RESPONSE FORMAT

All 3 endpoints return this JSON:

```json
{
  "category": "HUNGER",
  "confidence": 89,
  "severity": "MEDIUM",
  "reasoning": "Rhythmic repetitive pattern with gradual intensity buildup",
  "parent_action": "Baby needs feeding now. Try breastfeeding or bottle.",
  "response_sound": "heartbeat",
  "pre_cry_warning": false,
  "audio_signal": "Rhythmic hunger pattern",
  "image_signal": "Rooting reflex visible",
  "signals_agree": true
}
```

---

## BENCHMARK TESTING

After building, test accuracy using Donate a Cry dataset:

```python
# benchmark.py
import requests
import os
import json

DATASET_PATH = "./donate_a_cry_dataset"
API_URL = "http://localhost:8000"

categories = ["hungry", "belly_pain", "burping", "discomfort", "tired"]
results = {"correct": 0, "total": 0}

for category in categories:
    folder = os.path.join(DATASET_PATH, category)
    for filename in os.listdir(folder)[:20]:  # Test 20 per category
        filepath = os.path.join(folder, filename)
        with open(filepath, 'rb') as f:
            response = requests.post(
                f"{API_URL}/analyze/audio",
                files={"audio": f}
            )
        result = response.json()
        predicted = result["category"].lower()
        actual = category.replace("belly_pain", "pain")
        
        if predicted in actual or actual in predicted:
            results["correct"] += 1
        results["total"] += 1
        
accuracy = results["correct"] / results["total"] * 100
print(f"Accuracy: {accuracy:.1f}%")
```

Download dataset: https://github.com/gveres/donateacry-corpus

---

## WHAT TO SHOW IN DEV ARTICLE

1. **GIF of working demo** — Record → Analyze → Response plays
2. **Accuracy benchmark table** — vs existing apps
3. **Architecture diagram** — 3 modes explained
4. **Code snippets** — Key parts of implementation
5. **Science backing** — Baby cry research links

---

## IMPORTANT CONSTRAINTS

- Audio max 30 seconds (Gemma 4 limit)
- Audio must be mono channel
- Resample to 16kHz before sending
- Image should be well-lit (front-facing)
- CORS must be enabled on backend (demo use)
- ngrok URL changes every session — update in frontend

---

## BUILD ORDER (3-4 hours)

```
Hour 1:
□ Setup Colab with GPU
□ Install all dependencies  
□ Load Gemma 4 E4B (takes ~20 min to download)
□ Test single audio API call

Hour 2:
□ app.py complete (all 3 endpoints)
□ prompts.py finalized
□ ngrok URL working
□ Test all 3 modes via curl/Postman

Hour 3:
□ index.html complete
□ Audio recording working
□ Camera capture working
□ Results displaying correctly

Hour 4:
□ Response sounds playing
□ TTS working
□ Download benchmark dataset
□ Run accuracy test
□ Screen record demo GIF
□ Push to GitHub
```

---

## SUCCESS CRITERIA

- [ ] Audio mode working → result in <30 seconds
- [ ] Image mode working → result in <15 seconds
- [ ] Combined mode working → result in <45 seconds
- [ ] Response sound plays automatically
- [ ] TTS speaks to baby
- [ ] Accuracy >75% on benchmark
- [ ] Demo GIF recorded
- [ ] GitHub repo public
