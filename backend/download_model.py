#!/usr/bin/env python3
"""
Download roberta-base model with 3 labels for sentiment classification
"""
import os
from pathlib import Path
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# Model configuration
BASE_MODEL = "roberta-base"
NUM_LABELS = 3
OUTPUT_DIR = Path(__file__).parent / "models" / "best_model" / "model"

print(f"📥 Downloading model: {BASE_MODEL}")
print(f"📁 Saving to: {OUTPUT_DIR}")
print(f"🏷️  Number of labels: {NUM_LABELS}")

# Create directory
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

try:
    # Download and save tokenizer
    print("\n🔄 Downloading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print("✅ Tokenizer saved")
    
    # Download and save model
    print("\n🔄 Downloading model weights (~500MB, may take a few minutes)...")
    model = AutoModelForSequenceClassification.from_pretrained(
        BASE_MODEL,
        num_labels=NUM_LABELS,
        id2label={0: "negative", 1: "neutral", 2: "positive"},
        label2id={"negative": 0, "neutral": 1, "positive": 2}
    )
    model.save_pretrained(OUTPUT_DIR)
    print("✅ Model weights saved")
    
    # Verify
    saved_files = list(OUTPUT_DIR.glob("*"))
    print(f"\n✅ Success! Files saved:")
    for f in saved_files:
        size_mb = f.stat().st_size / (1024 * 1024) if f.is_file() else 0
        print(f"   - {f.name} ({size_mb:.1f} MB)")
    
    print(f"\n🎉 Model downloaded successfully!")
    print(f"📍 Location: {OUTPUT_DIR}")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    exit(1)
