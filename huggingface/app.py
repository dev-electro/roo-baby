"""
ROO — Baby Cry Analyzer on Hugging Face Spaces (CPU)
Gemma 4 E4B with 4-bit quantization fits in ~6GB RAM.
Free, always-on, no GPU required.
"""

import gradio as gr
import torch
import json
import io
import numpy as np
from PIL import Image
import librosa

MODEL_ID = "google/gemma-4-E4B-it"

# ── Prompts ──────────────────────────────────────
AUDIO_PROMPT = """You are ROO, the world's most advanced baby cry analyzer. Analyze this baby cry audio.

CRY PATTERNS:
HUNGER: rhythmic "neh", builds slow, 400-600Hz, stops/resumes → feed
PAIN: sudden sharp pierce, 600-800Hz, breath pauses, urgent → soothe
TIRED: whiny nasal, irregular fade, 300-450Hz, droopy → sleep
DISCOMFORT: sustained medium, 400-500Hz, grunting → adjust
BURPING: short bursts, dropping pitch, strain sounds → burp

Respond ONLY in JSON:
{"category":"HUNGER","confidence":85,"severity":"MEDIUM","reasoning":"...","parent_action":"Feed baby now.","response_sound":"heartbeat","pre_cry":false,"pre_cry_message":null}
severity: LOW|MEDIUM|HIGH|CRITICAL  sound: heartbeat|whitenoise|lullaby|shush"""

IMAGE_PROMPT = """You are ROO. Analyze this baby's face.

VISUAL CUES: Hunger=rooting+hands-to-mouth. Pain=scrunched+shut+red. Tired=droopy+glassy. Discomfort=arched+legs.

Respond ONLY in JSON:
{"category":"HUNGER","confidence":78,"severity":"MEDIUM","reasoning":"...","parent_action":"Feed soon.","response_sound":"heartbeat","pre_cry":true,"pre_cry_message":null}"""

COMBINED_PROMPT = """You are ROO. CROSS-REFERENCE audio AND image.
1. CRY analysis 2. FACE analysis 3. Do they agree? 4. Combined conclusion.
Higher confidence when audio+image agree.

Respond ONLY in JSON:
{"category":"HUNGER","confidence":91,"severity":"HIGH","audio_signal":"...","image_signal":"...","signals_agree":true,"reasoning":"...","parent_action":"Feed immediately.","response_sound":"heartbeat","pre_cry":false,"pre_cry_message":null}"""

# ── Model (CPU-optimized, 4-bit) ─────────────────
_model = None
_processor = None

def get_model():
    global _model, _processor
    if _model is not None:
        return _model, _processor

    from transformers import AutoProcessor, AutoModelForMultimodalLM, BitsAndBytesConfig

    quant = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.float32,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4"
    )

    print("Loading Gemma 4 E4B (4-bit CPU)...", flush=True)
    _processor = AutoProcessor.from_pretrained(MODEL_ID)
    _model = AutoModelForMultimodalLM.from_pretrained(
        MODEL_ID,
        quantization_config=quant,
        device_map={"": "cpu"},
        low_cpu_mem_usage=True
    )
    print("✅ ROO ready on CPU!", flush=True)
    return _model, _processor

def parse_json(text):
    try:
        s = text.find('{')
        e = text.rfind('}') + 1
        if s >= 0 and e > s:
            return json.loads(text[s:e])
    except:
        pass
    return {"category":"UNKNOWN","confidence":0,"severity":"LOW","reasoning":"Parse error","parent_action":"Try again","response_sound":"whitenoise","pre_cry":False,"pre_cry_message":None}

def run_analysis(audio_bytes=None, image_bytes=None, mode="audio"):
    model, processor = get_model()
    audio_arr = None
    image = None

    if audio_bytes:
        arr, _ = librosa.load(io.BytesIO(audio_bytes), sr=16000, mono=True)
        audio_arr = arr[:30*16000]

    if image_bytes:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    prompts = {"audio": AUDIO_PROMPT, "image": IMAGE_PROMPT, "both": COMBINED_PROMPT}
    content = []
    if audio_arr is not None:
        content.append({"type": "audio", "audio": audio_arr})
    if image is not None:
        content.append({"type": "image", "image": image})
    content.append({"type": "text", "text": prompts[mode]})

    messages = [{"role": "user", "content": content}]
    inputs = processor.apply_chat_template(
        messages, add_generation_prompt=True, tokenize=True,
        return_tensors="pt", return_dict=True
    )

    with torch.inference_mode():
        outputs = model.generate(**inputs, max_new_tokens=400, do_sample=False)

    result = processor.decode(outputs[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True)
    return parse_json(result)

# ── Gradio handlers ──────────────────────────────
def analyze_audio(audio_path):
    with open(audio_path, "rb") as f:
        data = f.read()
    return run_analysis(data, mode="audio")

def analyze_image(image):
    buf = io.BytesIO()
    image.save(buf, format="JPEG")
    return run_analysis(image_bytes=buf.getvalue(), mode="image")

def analyze_both(audio_path, image):
    with open(audio_path, "rb") as f:
        a = f.read()
    buf = io.BytesIO()
    image.save(buf, format="JPEG")
    return run_analysis(a, buf.getvalue(), "both")

# ── UI ───────────────────────────────────────────
with gr.Blocks(title="ROO — Gemma 4 E4B Baby Cry Analyzer", theme=gr.themes.Soft()) as demo:
    gr.Markdown("""# 🍼 ROO — Baby Cry Analyzer
    **Powered by Gemma 4 E4B (4-bit CPU)** — native audio + vision AI.
    Record your baby's cry and/or capture their face for instant analysis.
    """)

    with gr.Tab("🎙️ Audio"):
        audio_in = gr.Audio(type="filepath", label="Record cry (max 30s)")
        gr.Markdown("HUNGER=rhythmic | PAIN=piercing | TIRED=whiny | DISCOMFORT=fussy | BURPING=bursts")
        audio_btn = gr.Button("🔍 Analyze Cry", variant="primary")
        audio_out = gr.JSON(label="Result")
        audio_btn.click(analyze_audio, inputs=[audio_in], outputs=[audio_out])

    with gr.Tab("📸 Image"):
        image_in = gr.Image(type="pil", label="Capture baby face")
        gr.Markdown("Hunger=rooting | Pain=scrunched | Tired=droopy | Discomfort=arched")
        image_btn = gr.Button("🔍 Analyze Face", variant="primary")
        image_out = gr.JSON(label="Result")
        image_btn.click(analyze_image, inputs=[image_in], outputs=[image_out])

    with gr.Tab("⚡ Best Mode (Both)"):
        with gr.Row():
            audio_b = gr.Audio(type="filepath", label="Record cry")
            image_b = gr.Image(type="pil", label="Capture face")
        gr.Markdown("**Cross-reference audio + vision for highest accuracy.**")
        both_btn = gr.Button("🔍 Analyze Both", variant="primary")
        both_out = gr.JSON(label="Result")
        both_btn.click(analyze_both, inputs=[audio_b, image_b], outputs=[both_out])

    gr.Markdown("---\nBuilt for [DEV x Gemma 4 Challenge](https://dev.to/challenges/gemma4) • 4-bit quantized, runs on CPU • First load ~3min, subsequent ~30s")

demo.launch()
