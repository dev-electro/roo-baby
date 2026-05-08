"""
ROO — Hugging Face Space with ZeroGPU + FastAPI REST endpoints.
Gemma 4 E4B 4-bit quantized. Gradio UI for direct use, FastAPI for frontend integration.
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

# ── Prompts ──────────────────────────────────────
PROMPTS = {
    "audio": """You are ROO, analyze this baby cry audio.

CRY PATTERNS:
HUNGER: rhythmic "neh", builds slow, 400-600Hz → feed
PAIN: sudden sharp, 600-800Hz, breath pauses → soothe
TIRED: whiny nasal, irregular fade, 300-450Hz → sleep
DISCOMFORT: sustained medium, 400-500Hz → adjust
BURPING: short bursts, dropping pitch → burp

JSON only:
{"category":"HUNGER","confidence":85,"severity":"MEDIUM","reasoning":"...","parent_action":"Feed now.","response_sound":"heartbeat","pre_cry":false,"pre_cry_message":null}
severity:LOW|MEDIUM|HIGH|CRITICAL sound:heartbeat|whitenoise|lullaby|shush""",

    "image": """You are ROO. Analyze this baby's face.
Hunger=rooting+hands. Pain=scrunched+shut+red. Tired=droopy+glassy. Discomfort=arched+legs.
JSON only:
{"category":"HUNGER","confidence":78,"severity":"MEDIUM","reasoning":"...","parent_action":"Feed soon.","response_sound":"heartbeat","pre_cry":true,"pre_cry_message":null}""",

    "both": """You are ROO. CROSS-REFERENCE audio AND image.
1. CRY analysis 2. FACE analysis 3. Agree/conflict? 4. Combined.
Higher confidence when both agree.
JSON only:
{"category":"HUNGER","confidence":91,"severity":"HIGH","reasoning":"...","parent_action":"Feed immediately.","response_sound":"heartbeat","pre_cry":false,"pre_cry_message":null}"""
}

# ── Model (4-bit, shared between FastAPI and Gradio) ──
_model = None
_processor = None

def load_model():
    global _model, _processor
    if _model is not None:
        return _model, _processor
    from transformers import AutoProcessor, AutoModelForMultimodalLM, BitsAndBytesConfig
    quant = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.float32, bnb_4bit_use_double_quant=True, bnb_4bit_quant_type="nf4")
    print("Loading Gemma 4 E4B (4-bit)...", flush=True)
    _processor = AutoProcessor.from_pretrained(MODEL_ID)
    _model = AutoModelForMultimodalLM.from_pretrained(MODEL_ID, quantization_config=quant, device_map={"": "cpu"}, low_cpu_mem_usage=True)
    print("ROO ready!", flush=True)
    return _model, _processor

def parse_json(text):
    try:
        s, e = text.find('{'), text.rfind('}') + 1
        return json.loads(text[s:e]) if s >= 0 and e > s else {}
    except:
        pass
    return {"category":"UNKNOWN","confidence":0,"severity":"LOW","reasoning":"Parse error","parent_action":"Try again","response_sound":"whitenoise","pre_cry":False,"pre_cry_message":None}

def do_inference(audio_bytes=None, image_bytes=None, mode="audio"):
    model, processor = load_model()
    content = []
    if audio_bytes:
        arr, _ = librosa.load(io.BytesIO(audio_bytes), sr=16000, mono=True)
        content.append({"type": "audio", "audio": arr[:30*16000]})
    if image_bytes:
        content.append({"type": "image", "image": Image.open(io.BytesIO(image_bytes)).convert("RGB")})
    content.append({"type": "text", "text": PROMPTS[mode]})
    messages = [{"role": "user", "content": content}]
    inputs = processor.apply_chat_template(messages, add_generation_prompt=True, tokenize=True, return_tensors="pt", return_dict=True)
    with torch.inference_mode():
        outputs = model.generate(**inputs, max_new_tokens=400, do_sample=False)
    return parse_json(processor.decode(outputs[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True))

# ── FastAPI (mounted to Gradio, serves REST API) ──
api = FastAPI(title="ROO API")
api.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@api.get("/health")
def health():
    return {"status":"ROO online","model":"gemma-4-E4B-it","runtime":"HF Spaces + ZeroGPU"}

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

# ── Gradio UI (with ZeroGPU) ─────────────────────
@spaces.GPU
def gr_audio(path):
    with open(path, "rb") as f:
        return do_inference(f.read(), mode="audio")

@spaces.GPU
def gr_image(img):
    buf = io.BytesIO()
    img.save(buf, "JPEG")
    return do_inference(image_bytes=buf.getvalue(), mode="image")

@spaces.GPU
def gr_both(path, img):
    with open(path, "rb") as f:
        a = f.read()
    buf = io.BytesIO()
    img.save(buf, "JPEG")
    return do_inference(a, buf.getvalue(), "both")

with gr.Blocks(title="ROO — Gemma 4 E4B", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🍼 ROO — Baby Cry Analyzer\n**Gemma 4 E4B with ZeroGPU**")
    with gr.Tab("🎙️ Audio"):
        a_in = gr.Audio(type="filepath", label="Record cry (30s max)")
        a_btn = gr.Button("Analyze Cry", variant="primary")
        a_out = gr.JSON(label="Result")
        a_btn.click(gr_audio, [a_in], [a_out])
    with gr.Tab("📸 Image"):
        i_in = gr.Image(type="pil", label="Capture face")
        i_btn = gr.Button("Analyze Face", variant="primary")
        i_out = gr.JSON(label="Result")
        i_btn.click(gr_image, [i_in], [i_out])
    with gr.Tab("⚡ Both"):
        with gr.Row():
            b_a = gr.Audio(type="filepath", label="Cry")
            b_i = gr.Image(type="pil", label="Face")
        b_btn = gr.Button("Analyze Both", variant="primary")
        b_out = gr.JSON(label="Result")
        b_btn.click(gr_both, [b_a, b_i], [b_out])

demo.queue(max_size=5)
app = gr.mount_gradio_app(api, demo, path="/")
