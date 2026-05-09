"""
ROO — Hugging Face Space · ZeroGPU + FastAPI REST API
Gemma 4 E4B-it 4-bit quantized · Native audio + image multimodal

Architecture:
  - Gradio SDK → ZeroGPU (free T4)
  - FastAPI mounted at /health, /analyze/* → REST API for frontend
  - Gradio UI at /demo → manual testing
  - @spaces.GPU on inference → GPU allocated per request
"""

import spaces
import gradio as gr
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import torch
import json
import io
import numpy as np
from PIL import Image
import librosa

MODEL_ID = "google/gemma-4-E4B-it"

PROMPTS = {
    "audio": """You are ROO, the world's best baby cry analyst. Analyze this baby cry audio.

CRY PATTERNS:
HUNGER: rhythmic "neh" pattern, builds slowly, 400-600Hz → feed
PAIN: sudden sharp cry, 600-800Hz, breath pauses between → soothe immediately
TIRED: whiny nasal cry, irregular fade, 300-450Hz → help sleep
DISCOMFORT: sustained medium cry, 400-500Hz, grunting → adjust position
BURPING: short burst cries, dropping pitch → burp

Respond with ONLY valid JSON:
{"category":"HUNGER","confidence":85,"severity":"MEDIUM","reasoning":"Rhythmic pattern at ~450Hz consistent with hunger cry, builds gradually","parent_action":"Feed the baby now","response_sound":"heartbeat","pre_cry":false,"pre_cry_message":null}
severity: LOW|MEDIUM|HIGH|CRITICAL  sound: heartbeat|whitenoise|lullaby|shush""",

    "image": """You are ROO, the world's best baby cry analyst. Analyze this photo.

FIRST: Is this a BABY (age 0-3)? Baby: round face, chubby cheeks, small nose, fine hair, large head. Adult/older child: facial hair, defined jawline, wrinkles, makeup, mature bone structure.

If BABY (0-3) → is_adult: false. Analyze expression seriously.
If ADULT/OLDER CHILD (4+) → is_adult: true. Still analyze the face (for fun — imagine a giant baby!). Keep real category/confidence. Make reasoning playful.

VISUAL CUES:
HUNGER: rooting reflex, hands to mouth, lip smacking → feed
PAIN: scrunched face, eyes shut tight, redness → soothe
TIRED: droopy eyes, glassy stare, rubbing eyes → help sleep
DISCOMFORT: arched back, legs drawn up, fidgeting → adjust position
BURPING: squirming, back arching briefly → burp

Respond with ONLY valid JSON:
{"category":"HUNGER","confidence":78,"severity":"MEDIUM","reasoning":"Rooting reflex visible","parent_action":"Feed soon","response_sound":"heartbeat","pre_cry":true,"pre_cry_message":"Baby may be getting hungry soon","is_adult":false,"adult_message":null}
For adults add: "is_adult":true, "adult_message":"You're testing ROO on yourself! Results are for fun only — ROO is designed for babies 0-3 years. Try it on your little one!" """,

    "both": """You are ROO, the world's best baby cry analyst. CROSS-REFERENCE audio + image.

FIRST: Is the face a BABY (0-3)? Baby: round face, chubby cheeks, small nose. Adult/older child: facial hair, wrinkles, makeup, mature bone structure.

If BABY (0-3) → is_adult: false. Serious cross-reference.
If ADULT/OLDER CHILD (4+) → is_adult: true. Still do full cross-reference for fun! Imagine a giant baby. Make reasoning playful.

STEP 1: Analyze cry audio patterns (frequency, rhythm, intensity)
STEP 2: Analyze facial expression and body language
STEP 3: Do audio and visual signals agree? Higher confidence when they converge.
STEP 4: Provide combined diagnosis.

CRY: HUNGER=rhythmic neh 400-600Hz, PAIN=sharp 600-800Hz, TIRED=whiny 300-450Hz, DISCOMFORT=medium 400-500Hz, BURPING=short bursts
FACE: HUNGER=root+mouth, PAIN=scrunched+red, TIRED=droopy+glassy, DISCOMFORT=arched+legs, BURPING=squirm

Respond with ONLY valid JSON:
{"category":"HUNGER","confidence":91,"severity":"HIGH","reasoning":"Audio shows rhythmic 450Hz pattern AND face shows rooting reflex — both signals agree strongly on hunger","parent_action":"Feed immediately","response_sound":"heartbeat","pre_cry":false,"pre_cry_message":null,"is_adult":false,"adult_message":null}
For adults: include "is_adult":true and a funny adult_message.
severity: LOW|MEDIUM|HIGH|CRITICAL  sound: heartbeat|whitenoise|lullaby|shush"""
}

_model = None
_processor = None


@spaces.GPU
def load_model():
    global _model, _processor
    if _model is not None:
        return _model, _processor
    from transformers import AutoProcessor, AutoModelForMultimodalLM, BitsAndBytesConfig
    quant = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
    )
    print("Loading Gemma 4 E4B-it (4-bit)…", flush=True)
    _processor = AutoProcessor.from_pretrained(MODEL_ID)
    _model = AutoModelForMultimodalLM.from_pretrained(
        MODEL_ID,
        quantization_config=quant,
        device_map="auto",
        low_cpu_mem_usage=True,
    )
    print("ROO ready!", flush=True)
    return _model, _processor


def parse_json(text):
    raw = text.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(raw)
    except Exception:
        pass
    s, e = raw.find("{"), raw.rfind("}") + 1
    if s >= 0 and e > s:
        try:
            return json.loads(raw[s:e])
        except Exception:
            pass
    return {
        "category": "UNKNOWN",
        "confidence": 0,
        "severity": "LOW",
        "reasoning": "Parse error",
        "parent_action": "Try again",
        "response_sound": "whitenoise",
        "pre_cry": False,
        "pre_cry_message": None,
    }


@spaces.GPU
def do_inference(audio_bytes=None, image_bytes=None, mode="audio"):
    model, processor = load_model()
    content = []

    if audio_bytes:
        arr, _ = librosa.load(io.BytesIO(audio_bytes), sr=16000, mono=True)
        content.append({"type": "audio", "audio": arr[: 30 * 16000]})

    if image_bytes:
        content.append({"type": "image", "image": Image.open(io.BytesIO(image_bytes)).convert("RGB")})

    content.append({"type": "text", "text": PROMPTS[mode]})
    messages = [{"role": "user", "content": content}]

    inputs = processor.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=True,
        return_tensors="pt",
        return_dict=True,
    )
    inputs = {k: v.to(model.device) if isinstance(v, torch.Tensor) else v for k, v in inputs.items()}

    with torch.inference_mode():
        outputs = model.generate(**inputs, max_new_tokens=400, do_sample=False)

    result_text = processor.decode(outputs[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True)
    return parse_json(result_text)


# ── FastAPI REST API ──────────────────────────────────
api = FastAPI(title="ROO API")
api.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@api.get("/health")
def health():
    loaded = _model is not None
    return {
        "status": "ROO online" if loaded else "ROO starting",
        "model": MODEL_ID,
        "runtime": "HF Spaces + ZeroGPU",
        "model_loaded": loaded,
    }


@api.post("/analyze/audio")
async def api_audio(audio: UploadFile = File(...)):
    r = do_inference(await audio.read(), mode="audio")
    return JSONResponse(r)


@api.post("/analyze/image")
async def api_image(image: UploadFile = File(...)):
    r = do_inference(image_bytes=await image.read(), mode="image")
    return JSONResponse(r)


@api.post("/analyze/both")
async def api_both(audio: UploadFile = File(...), image: UploadFile = File(...)):
    r = do_inference(await audio.read(), await image.read(), "both")
    return JSONResponse(r)


# ── Gradio UI (at /demo) ─────────────────────────────
@spaces.GPU
def gr_audio(path):
    if not path:
        return {"error": "No audio provided"}
    with open(path, "rb") as f:
        return do_inference(f.read(), mode="audio")


@spaces.GPU
def gr_image(img):
    if img is None:
        return {"error": "No image provided"}
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return do_inference(image_bytes=buf.getvalue(), mode="image")


@spaces.GPU
def gr_both(path, img):
    a = None
    if path:
        with open(path, "rb") as f:
            a = f.read()
    i = None
    if img is not None:
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        i = buf.getvalue()
    if not a and not i:
        return {"error": "No input provided"}
    return do_inference(a, i, "both")


with gr.Blocks(title="ROO — Baby Cry Analyzer", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🍼 ROO — Baby Cry Analyzer\n**Gemma 4 E4B-it · ZeroGPU · Audio + Vision**")

    with gr.Tab("🎙️ Audio"):
        a_in = gr.Audio(type="filepath", label="Record cry (30s max)")
        a_btn = gr.Button("Analyze Cry", variant="primary")
        a_out = gr.JSON(label="Result")
        a_btn.click(gr_audio, [a_in], [a_out])

    with gr.Tab("📸 Image"):
        i_in = gr.Image(type="pil", label="Capture baby's face")
        i_btn = gr.Button("Analyze Face", variant="primary")
        i_out = gr.JSON(label="Result")
        i_btn.click(gr_image, [i_in], [i_out])

    with gr.Tab("⚡ Both"):
        with gr.Row():
            b_a = gr.Audio(type="filepath", label="Cry audio")
            b_i = gr.Image(type="pil", label="Face image")
        b_btn = gr.Button("Analyze Both", variant="primary")
        b_out = gr.JSON(label="Result")
        b_btn.click(gr_both, [b_a, b_i], [b_out])

    gr.Markdown(
        "**REST API:**  `/health` · `/analyze/audio` · `/analyze/image` · `/analyze/both`\n"
        "Built for [DEV × Gemma 4](https://dev.to/challenges/gemma4)"
    )

demo.queue(max_size=5)
app = gr.mount_gradio_app(api, demo, path="/demo")