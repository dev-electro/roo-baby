"""
Gemma 4 E4B model loader + inference.
Uses AutoModelForMultimodalLM for native audio + vision support.
"""

import torch
import json
import io
import numpy as np
from transformers import AutoProcessor, AutoModelForMultimodalLM
from PIL import Image
import librosa

MODEL_ID = "google/gemma-4-E4B-it"

from prompts import AUDIO_PROMPT, IMAGE_PROMPT, COMBINED_PROMPT

class RooModel:
    def __init__(self):
        print(f"Loading {MODEL_ID}...", flush=True)
        self.processor = AutoProcessor.from_pretrained(MODEL_ID)
        self.model = AutoModelForMultimodalLM.from_pretrained(
            MODEL_ID,
            dtype=torch.bfloat16,
            device_map="auto"
        )
        print("Gemma 4 E4B ready!", flush=True)

    def _parse_result(self, output_text):
        try:
            start = output_text.find('{')
            end = output_text.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(output_text[start:end])
        except:
            pass
        return {
            "category": "UNKNOWN", "confidence": 0, "severity": "LOW",
            "reasoning": "Could not analyze", "parent_action": "Please try recording again",
            "response_sound": "whitenoise", "pre_cry": False, "pre_cry_message": None
        }

    def _load_audio(self, audio_bytes):
        audio_array, sr = librosa.load(io.BytesIO(audio_bytes), sr=16000, mono=True)
        return audio_array[:30 * 16000], 16000

    def _build_messages(self, audio_arr=None, image=None, prompt=""):
        content = []
        if audio_arr is not None:
            content.append({"type": "audio", "audio": audio_arr})
        if image is not None:
            content.append({"type": "image", "image": image})
        content.append({"type": "text", "text": prompt})
        return [{"role": "user", "content": content}]

    def _generate(self, messages, max_tokens=300):
        inputs = self.processor.apply_chat_template(
            messages, add_generation_prompt=True, tokenize=True,
            return_tensors="pt", return_dict=True
        ).to(self.model.device)

        with torch.inference_mode():
            outputs = self.model.generate(**inputs, max_new_tokens=max_tokens, do_sample=False)

        result = self.processor.decode(
            outputs[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True
        )
        return self._parse_result(result)

    def analyze_audio(self, audio_bytes):
        audio_arr, _ = self._load_audio(audio_bytes)
        messages = self._build_messages(audio_arr=audio_arr, prompt=AUDIO_PROMPT)
        return self._generate(messages)

    def analyze_image(self, image_bytes):
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        messages = self._build_messages(image=image, prompt=IMAGE_PROMPT)
        return self._generate(messages)

    def analyze_both(self, audio_bytes, image_bytes):
        audio_arr, _ = self._load_audio(audio_bytes)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        messages = self._build_messages(audio_arr=audio_arr, image=image, prompt=COMBINED_PROMPT)
        return self._generate(messages, max_tokens=400)
