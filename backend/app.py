"""
ROO Backend — FastAPI server serving Gemma 4 E4B multimodal analysis.
Deploy on Google Colab with T4 GPU + ngrok tunnel.
"""

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="ROO API", description="Gemma 4 E4B Baby Cry Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Lazy load model on first request (saves memory during import)
model = None

def get_model():
    global model
    if model is None:
        from model import RooModel
        model = RooModel()
    return model

@app.get("/health")
def health():
    return {"status": "ROO is running", "model": "gemma-4-E4B-it"}

@app.post("/analyze/audio")
async def analyze_audio(audio: UploadFile = File(...)):
    audio_bytes = await audio.read()
    return get_model().analyze_audio(audio_bytes)

@app.post("/analyze/image")
async def analyze_image(image: UploadFile = File(...)):
    image_bytes = await image.read()
    return get_model().analyze_image(image_bytes)

@app.post("/analyze/both")
async def analyze_both(
    audio: UploadFile = File(...),
    image: UploadFile = File(...)
):
    audio_bytes = await audio.read()
    image_bytes = await image.read()
    return get_model().analyze_both(audio_bytes, image_bytes)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
