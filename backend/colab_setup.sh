#!/bin/bash
# ROO — Google Colab Setup Script
# Run each section in a separate Colab cell

echo "========================================="
echo "  Cell 1: Install dependencies"
echo "========================================="
cat <<'CELL1'
!pip install fastapi uvicorn python-multipart transformers accelerate torch librosa pillow pyngrok soundfile numpy
CELL1

echo ""
echo "========================================="
echo "  Cell 2: Clone repo & install"
echo "========================================="
cat <<'CELL2'
!git clone https://github.com/dev-electro/roo-baby.git
%cd roo-baby/backend
CELL2

echo ""
echo "========================================="
echo "  Cell 3: Start server + ngrok"
echo "========================================="
cat <<'CELL3'
from pyngrok import ngrok
import subprocess
import threading
import time

def run_server():
    subprocess.run(["python", "app.py"])

# Start server in background
thread = threading.Thread(target=run_server, daemon=True)
thread.start()
time.sleep(5)

# Expose via ngrok
public_url = ngrok.connect(8000).public_url
print(f"\n🍼 ROO API URL: {public_url}")
print(f"📋 Health check: {public_url}/health")
print("Copy this URL into the ROO frontend settings.")
CELL3

echo ""
echo "========================================="
echo "  Cell 4 (Optional): Run benchmark"
echo "========================================="
cat <<'CELL4'
%cd roo-baby/backend
!python benchmark.py
CELL4

echo ""
echo "✅ Copy these cells into Google Colab and run sequentially."
