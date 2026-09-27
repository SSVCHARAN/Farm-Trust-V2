#!/usr/bin/env python3
"""
Farm Trust — Neural AI Speech Generator
Supports high-fidelity Indian voices:
- Telugu: te-IN-ShrutiNeural (female, warm & natural), te-IN-MohanNeural (male, calm & grounded)
- English: en-IN-NeerjaExpressiveNeural (female, warm Indian English), en-IN-PrabhatNeural (male)
"""

import sys
import os
import argparse
import asyncio
import json
import edge_tts

VOICE_MAP = {
    "te-IN": {
        "female": "te-IN-ShrutiNeural",
        "male": "te-IN-MohanNeural",
    },
    "te": {
        "female": "te-IN-ShrutiNeural",
        "male": "te-IN-MohanNeural",
    },
    "en-IN": {
        "female": "en-IN-NeerjaExpressiveNeural",
        "male": "en-IN-PrabhatNeural",
    },
    "en": {
        "female": "en-IN-NeerjaExpressiveNeural",
        "male": "en-IN-PrabhatNeural",
    }
}

import re

def clean_speech_text(text: str, lang: str) -> str:
    # Remove commas inside numbers e.g. 2,450 -> 2450
    t = re.sub(r'(\d+),(\d+)', r'\1\2', text)
    if 'te' in lang:
        t = re.sub(r'₹\s*(\d+)\s*\/\s*(?:kg|కిలో|కేజీ)?', r'\1 రూపాయలు కిలో', t)
        t = re.sub(r'₹\s*(\d+)', r'\1 రూపాయలు', t)
        t = re.sub(r'(\d+)\s*(?:kg|కేజీ)', r'\1 కిలోలు', t)
        t = re.sub(r'(\d+)\s*(?:liters|లీటర్లు)', r'\1 లీటర్లు', t)
    else:
        t = re.sub(r'₹\s*(\d+)\s*\/\s*(?:kg|kilogram)?', r'\1 rupees per kg', t)
        t = re.sub(r'₹\s*(\d+)', r'\1 rupees', t)
        t = re.sub(r'(\d+)\s*kg', r'\1 kg', t)

    # Remove commas and semicolons to prevent parser stalls in Indic text
    t = t.replace(',', ' ').replace(';', ' ')

    # Remove markdown & brackets
    t = re.sub(r'[*#_~`\[\]()]', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

async def generate_speech(text: str, voice: str, output_path: str, rate: str = "-4%", lang: str = "te-IN"):
    cleaned = clean_speech_text(text, lang)
    communicate = edge_tts.Communicate(cleaned, voice, rate=rate)
    await communicate.save(output_path)
    file_size = os.path.getsize(output_path)
    return {
        "success": True,
        "voice": voice,
        "cleaned_text": cleaned,
        "output_path": output_path,
        "size_bytes": file_size
    }

def main():
    parser = argparse.ArgumentParser(description="Farm Trust Neural Speech Generator")
    parser.add_argument("--text", required=True, help="Text to speak")
    parser.add_argument("--lang", default="te-IN", help="Language code (te-IN, en-IN)")
    parser.add_argument("--gender", default="female", choices=["female", "male"], help="Voice gender")
    parser.add_argument("--voice", default=None, help="Explicit voice name override")
    parser.add_argument("--rate", default="-4%", help="Speech rate adjustment (e.g. -4%% for gentle pacing)")
    parser.add_argument("--output", required=True, help="Output MP3 file path")

    args = parser.parse_args()

    # Determine voice
    voice = args.voice
    if not voice:
        lang_group = VOICE_MAP.get(args.lang, VOICE_MAP["te-IN"])
        voice = lang_group.get(args.gender, "te-IN-ShrutiNeural")

    # Ensure parent dir exists
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)

    try:
        result = asyncio.run(generate_speech(args.text, voice, args.output, args.rate, args.lang))
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
