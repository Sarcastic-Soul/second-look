"""Draws a fixed, balanced sample of scam and ordinary text messages.

Dataset: "SMS Phishing Dataset for Machine Learning and Pattern Recognition" (Mishra and Soni,
Mendeley Data, doi:10.17632/f45bkkt8pr.1). 5,971 messages labelled ham, spam or smishing.
We use smishing (scam texts) against ham (ordinary texts). Plain spam is left out: Second Look
is built to call ordinary marketing "safe", so spam has no right answer for it.

Download Dataset_5971.zip from the Mendeley page and unzip it into eval/data/sms/.
Run: python3 -I eval/sample.py [per_class]
"""

import csv
import json
import random
import sys
from pathlib import Path

HERE = Path(__file__).parent
PER_CLASS = int(sys.argv[1]) if len(sys.argv) > 1 else 40
SEED = 42

rows = {"scam": [], "ham": []}
seen = set()
with open(HERE / "data" / "sms" / "Dataset_5971.csv", newline="", encoding="utf-8", errors="replace") as f:
    for i, r in enumerate(csv.DictReader(f)):
        text = " ".join((r.get("TEXT") or "").split())
        label = {"smishing": "scam", "ham": "ham"}.get((r.get("LABEL") or "").strip().lower())
        if not label or len(text) < 20 or text.lower() in seen:
            continue
        seen.add(text.lower())
        rows[label].append({"id": f"sms-{i}", "label": label, "text": text})

rng = random.Random(SEED)
sample = rng.sample(rows["scam"], PER_CLASS) + rng.sample(rows["ham"], PER_CLASS)
rng.shuffle(sample)
out = HERE / "sample.jsonl"
out.write_text("".join(json.dumps(s, ensure_ascii=False) + "\n" for s in sample), encoding="utf-8")
print(f"{len(rows['scam'])} scam, {len(rows['ham'])} ham usable; wrote {len(sample)} to {out.name}")
