FROM nvidia/cuda:12.4.0-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/data/hf-cache \
    TRANSFORMERS_CACHE=/data/hf-cache

RUN apt-get update && apt-get install -y \
    python3.11 python3-pip ffmpeg libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

# Pre-download model (cached in /data)
RUN python3 -c "from transformers import AutoProcessor; AutoProcessor.from_pretrained('google/gemma-4-E4B-it')" 2>/dev/null || true

EXPOSE 7860
CMD ["python3", "app.py"]
