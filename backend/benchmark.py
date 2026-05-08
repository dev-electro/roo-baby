"""
ROO Benchmark — Test accuracy against Donate a Cry dataset.
Dataset: https://github.com/gveres/donateacry-corpus
"""

import requests
import os
import json
from pathlib import Path

API_URL = os.getenv("ROO_API_URL", "http://localhost:8000")
DATASET_PATH = Path("./donateacry-corpus")

CATEGORY_MAP = {
    "hungry": "HUNGER",
    "belly_pain": "PAIN",
    "burping": "BURPING",
    "discomfort": "DISCOMFORT",
    "tired": "TIRED",
}

def test_audio():
    results = {"correct": 0, "total": 0, "per_category": {}}
    
    for folder_name, expected in CATEGORY_MAP.items():
        category_path = DATASET_PATH / folder_name
        if not category_path.exists():
            print(f"⚠️  Missing: {category_path}")
            continue
            
        wav_files = list(category_path.glob("*.wav"))[:20]
        cat_correct = 0
        
        for filepath in wav_files:
            with open(filepath, 'rb') as f:
                resp = requests.post(
                    f"{API_URL}/analyze/audio",
                    files={"audio": (filepath.name, f, "audio/wav")}
                )
            
            if resp.status_code != 200:
                print(f"  ❌ API error: {resp.status_code}")
                continue
                
            result = resp.json()
            predicted = result.get("category", "").upper()
            
            if predicted == expected or expected in predicted or predicted in expected:
                cat_correct += 1
            
            results["total"] += 1
        
        results["correct"] += cat_correct
        accuracy = (cat_correct / len(wav_files) * 100) if wav_files else 0
        results["per_category"][folder_name] = {
            "expected": expected,
            "correct": cat_correct,
            "total": len(wav_files),
            "accuracy": f"{accuracy:.1f}%"
        }
        print(f"  📊 {folder_name}: {accuracy:.1f}% ({cat_correct}/{len(wav_files)})")
    
    overall = (results["correct"] / results["total"] * 100) if results["total"] > 0 else 0
    results["overall_accuracy"] = f"{overall:.1f}%"
    results["total_tested"] = results["total"]
    
    print(f"\n🎯 Overall Accuracy: {overall:.1f}%")
    return results

if __name__ == "__main__":
    if not DATASET_PATH.exists():
        print("Downloading Donate a Cry dataset...")
        os.system("git clone https://github.com/gveres/donateacry-corpus.git")
    
    results = test_audio()
    
    with open("benchmark_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print("\n✅ Results saved to benchmark_results.json")
