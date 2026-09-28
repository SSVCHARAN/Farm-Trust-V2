#!/usr/bin/env python3
"""
Pre-generates all standard UI audio phrases for Farm Trust into public/audio/cache/
using Microsoft Edge Neural AI voices (te-IN-ShrutiNeural and en-IN-NeerjaExpressiveNeural).
Provides 100% studio-quality offline & static deployment speech playback without a backend.
"""

import os
import sys
import json
import hashlib
import asyncio
import re
import edge_tts

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "audio", "cache")
MANIFEST_PATH = os.path.join(OUTPUT_DIR, "manifest.json")

os.makedirs(OUTPUT_DIR, exist_ok=True)

VOICE_MAP = {
    "te-IN": "te-IN-ShrutiNeural",
    "en-IN": "en-IN-NeerjaExpressiveNeural",
}

# Master list of all phrases spoken across Farm Trust
PHRASES = [
    # ─── GREETINGS & GUIDANCE ───
    {
        "text": "Namaste Ravi Kumar! You can say: Show pending orders, Change tomato price to 35, Set tomato stock to 20 kg, or Accept Ananya's order.",
        "lang": "en-IN"
    },
    {
        "text": "నమస్కారం! మీరు కొత్త ఆర్డర్లు చెప్పు, టమాటాల ధర 35 చేయి, 20 కిలోల స్టాక్ ఉంది, లేదా అనన్య ఆర్డర్ అంగీకరించు అని మాట్లాడవచ్చు.",
        "lang": "te-IN"
    },
    {
        "text": "Namaste! I am your Farm Trust assistant. How can I help you today?",
        "lang": "en-IN"
    },
    {
        "text": "నమస్కారం! నేను ఫార్మ్ ట్రస్ట్ సహాయకుడిని. మీకు ఎలా సహాయపడగలను?",
        "lang": "te-IN"
    },

    # ─── WIZARD STEP PROMPTS (Add Produce Flow) ───
    {
        "text": "What crop are you listing today?",
        "lang": "en-IN"
    },
    {
        "text": "మీరు ఏ పంటను విక్రయించాలనుకుంటున్నారు?",
        "lang": "te-IN"
    },
    {
        "text": "How much stock do you have ready?",
        "lang": "en-IN"
    },
    {
        "text": "ఎంత పరిమాణం అందుబాటులో ఉంది?",
        "lang": "te-IN"
    },
    {
        "text": "What is your selling price?",
        "lang": "en-IN"
    },
    {
        "text": "మీరు ఆశించే ధర ఎంత?",
        "lang": "te-IN"
    },
    {
        "text": "Review and confirm your produce listing.",
        "lang": "en-IN"
    },
    {
        "text": "పంట వివరాలను సమీక్షించి ఖరారు చేయండి.",
        "lang": "te-IN"
    },

    # ─── CONFIRMATION QUESTIONS ───
    {
        "text": "Set tomato price to ₹35/kg?",
        "lang": "en-IN"
    },
    {
        "text": "టమాటాల ధర కిలోకి ₹35 చేయమంటారా?",
        "lang": "te-IN"
    },
    {
        "text": "Change price of Tomatoes to ₹35 per kg?",
        "lang": "en-IN"
    },
    {
        "text": "టమాటాల ధర 35 రూపాయలు చేయనా?",
        "lang": "te-IN"
    },
    {
        "text": "Add 20 kg to stock?",
        "lang": "en-IN"
    },
    {
        "text": "Add 20 kg to Tomatoes? Total stock will be 40 kg.",
        "lang": "en-IN"
    },
    {
        "text": "పంట నిల్వకు 20 కిలోలు చేర్చమంటారా?",
        "lang": "te-IN"
    },
    {
        "text": "Mark Tomatoes as out of stock (0 kg)?",
        "lang": "en-IN"
    },
    {
        "text": "టమాటాలు స్టాక్ పూర్తయినట్లు మార్చమంటారా?",
        "lang": "te-IN"
    },
    {
        "text": "Show pending buyer orders?",
        "lang": "en-IN"
    },
    {
        "text": "మీ పెండింగ్ ఆర్డర్లు చూపించమంటారా?",
        "lang": "te-IN"
    },
    {
        "text": "Search marketplace for Tomatoes?",
        "lang": "en-IN"
    },
    {
        "text": "టమాటాలు కోసం మార్కెట్‌లో శోధించమంటారా?",
        "lang": "te-IN"
    },
    {
        "text": "Search marketplace for Farm Fresh Tomatoes under ₹30?",
        "lang": "en-IN"
    },
    {
        "text": "Search marketplace for Tomatoes under ₹30?",
        "lang": "en-IN"
    },
    {
        "text": "Search marketplace for Rice?",
        "lang": "en-IN"
    },
    {
        "text": "Search marketplace for Sona Masoori Heritage Rice?",
        "lang": "en-IN"
    },
    {
        "text": "Search marketplace for Milk?",
        "lang": "en-IN"
    },
    {
        "text": "Search marketplace for Desi A2 Cow Milk?",
        "lang": "en-IN"
    },
    {
        "text": "Search marketplace for Mangoes?",
        "lang": "en-IN"
    },
    {
        "text": "Search marketplace for Banganapalli Sweet Mangoes?",
        "lang": "en-IN"
    },
    {
        "text": "Search marketplace for Chillies?",
        "lang": "en-IN"
    },
    {
        "text": "Search marketplace for Guntur Red Chillies?",
        "lang": "en-IN"
    },
    {
        "text": "సోనా మసూరి బియ్యం కోసం మార్కెట్‌లో శోధించమంటారా?",
        "lang": "te-IN"
    },
    {
        "text": "స్వచ్ఛమైన ఆవు పాలు కోసం మార్కెట్‌లో శోధించమంటారా?",
        "lang": "te-IN"
    },
    {
        "text": "బంగనపల్లి మామిడిపండ్లు కోసం మార్కెట్‌లో శోధించమంటారా?",
        "lang": "te-IN"
    },
    {
        "text": "గుంటూరు మిరప కోసం మార్కెట్‌లో శోధించమంటారా?",
        "lang": "te-IN"
    },
    {
        "text": "Update order for Ananya Sharma to \"Accepted by Farmer\"?",
        "lang": "en-IN"
    },
    {
        "text": "అనన్య శర్మ గారి ఆర్డర్ స్థితిని \"రైతు అంగీకరించారు\"గా మార్చమంటారా?",
        "lang": "te-IN"
    },
    {
        "text": "Update order for Ananya Sharma to \"Ready\"?",
        "lang": "en-IN"
    },
    {
        "text": "అనన్య శర్మ గారి ఆర్డర్ స్థితిని \"డెలివరీకి సిద్ధం\"గా మార్చమంటారా?",
        "lang": "te-IN"
    },

    # ─── ORDER READOUTS (speakOrderAloud) ───
    {
        "text": "Order from Ananya Sharma. 2 kg of Farm Fresh Tomatoes. You receive 40 rupees.",
        "lang": "en-IN"
    },
    {
        "text": "Order from Ananya Sharma. 2 kg of Fresh Tomatoes. You receive 40 rupees.",
        "lang": "en-IN"
    },
    {
        "text": "అనన్య శర్మ నుండి ఆర్డర్. 2 కిలోల నాటు టమాటాలు. మీకు అందే మొత్తం 40 రూపాయలు.",
        "lang": "te-IN"
    },
    {
        "text": "Ananya Sharma నుండి ఆర్డర్. 2 కిలోల నాటు టమాటాలు. మీకు అందే మొత్తం 40 రూపాయలు.",
        "lang": "te-IN"
    },
    {
        "text": "Ananya Sharma నుండి ఆర్డర్. 2 కిలోల Farm Fresh Tomatoes. మీకు అందే మొత్తం 40 రూపాయలు.",
        "lang": "te-IN"
    },
    {
        "text": "Order from K. Suresh Reddy. 10 kg of Sona Masoori Heritage Rice. You receive 580 rupees.",
        "lang": "en-IN"
    },
    {
        "text": "Order from Suresh Reddy. 10 kg of Sona Masoori Heritage Rice. You receive 580 rupees.",
        "lang": "en-IN"
    },
    {
        "text": "Order from Suresh Reddy. 10 kg of Rice. You receive 580 rupees.",
        "lang": "en-IN"
    },
    {
        "text": "K. Suresh Reddy నుండి ఆర్డర్. 10 కిలోల సోనా మసూరి బియ్యం. మీకు అందే మొత్తం 580 రూపాయలు.",
        "lang": "te-IN"
    },
    {
        "text": "సురేష్ రెడ్డి నుండి ఆర్డర్. 10 కిలోల సోనా మసూరి బియ్యం. మీకు అందే మొత్తం 580 రూపాయలు.",
        "lang": "te-IN"
    },
    {
        "text": "Order from Suresh Varma. 5 kg of Country Tomatoes. You receive 150 rupees.",
        "lang": "en-IN"
    },
    {
        "text": "సురేష్ వర్మ నుండి ఆర్డర్. 5 కిలోల నాటు టమాటాలు. మీకు అందే మొత్తం 150 రూపాయలు.",
        "lang": "te-IN"
    },
    {
        "text": "Order from Deepa Varma. 5 kg of Farm Fresh Tomatoes. You receive 100 rupees.",
        "lang": "en-IN"
    },
    {
        "text": "దీపా వర్మ నుండి ఆర్డర్. 5 కిలోల నాటు టమాటాలు. మీకు అందే మొత్తం 100 రూపాయలు.",
        "lang": "te-IN"
    },
    {
        "text": "Order from Venkatesh Babu. 2 liters of Desi A2 Cow Milk. You receive 130 rupees.",
        "lang": "en-IN"
    },
    {
        "text": "వెంకటేష్ బాబు నుండి ఆర్డర్. 2 లీటర్ల స్వచ్ఛమైన ఆవు పాలు. మీకు అందే మొత్తం 130 రూపాయలు.",
        "lang": "te-IN"
    },
    {
        "text": "Order from Sravani P. 4 kg of Banganapalli Sweet Mangoes. You receive 380 rupees.",
        "lang": "en-IN"
    },
    {
        "text": "శ్రావణి పి నుండి ఆర్డర్. 4 కిలోల బంగనపల్లి మామిడిపండ్లు. మీకు అందే మొత్తం 380 రూపాయలు.",
        "lang": "te-IN"
    },
    {
        "text": "You have 1 pending order: #FT-1024.",
        "lang": "en-IN"
    },
    {
        "text": "మీకు ఒక పెండింగ్ ఆర్డర్ ఉంది: #FT-1024.",
        "lang": "te-IN"
    },
    {
        "text": "మీకు ఒక పెండింగ్ ఆర్డర్ ఉంది.",
        "lang": "te-IN"
    },
    {
        "text": "You have 1 pending order from Ananya Sharma.",
        "lang": "en-IN"
    },
    {
        "text": "You have 2 pending orders.",
        "lang": "en-IN"
    },
    {
        "text": "మీకు రెండు పెండింగ్ ఆర్డర్లు ఉన్నాయి.",
        "lang": "te-IN"
    },
    {
        "text": "You have no pending orders. All orders are up to date!",
        "lang": "en-IN"
    },
    {
        "text": "You have no pending orders right now. All orders are up to date!",
        "lang": "en-IN"
    },
    {
        "text": "ప్రస్తుతం పెండింగ్‌లో ఎటువంటి ఆర్డర్లు లేవు. అన్ని ఆర్డర్లు ప్రాసెస్ చేయబడ్డాయి!",
        "lang": "te-IN"
    },

    # ─── SUMMARIES ───
    {
        "text": "You have 20 kg of fresh tomatoes in stock.",
        "lang": "en-IN"
    },
    {
        "text": "మీ దగ్గర 20 కిలోల టమాటాలు ఉన్నాయి.",
        "lang": "te-IN"
    },
    {
        "text": "This week you had total sales of 580 rupees.",
        "lang": "en-IN"
    },
    {
        "text": "ఈ వారం మీరు మొత్తం 580 రూపాయల అమ్మకాలు చేశారు.",
        "lang": "te-IN"
    },
    {
        "text": "This week you had total sales of 2,450 rupees.",
        "lang": "en-IN"
    },
    {
        "text": "ఈ వారం మీరు మొత్తం 2,450 రూపాయల అమ్మకాలు చేశారు.",
        "lang": "te-IN"
    },

    # ─── ACTION RESULTS & FEEDBACK ───
    {
        "text": "Sure, I have updated the tomato price to 35 rupees per kg.",
        "lang": "en-IN"
    },
    {
        "text": "సరే, టమాటాల ధర కిలోకి 35 రూపాయలు చేశాను.",
        "lang": "te-IN"
    },
    {
        "text": "Added 10 kg to Tomatoes. Total stock is now 30 kg.",
        "lang": "en-IN"
    },
    {
        "text": "టమాటాలు నిల్వకు 10 కిలోలు జోడించాను. మొత్తం నిల్వ 30 కిలోలు.",
        "lang": "te-IN"
    },
    {
        "text": "Order #FT-1024 for Ananya Sharma has been updated to \"Accepted by Farmer\".",
        "lang": "en-IN"
    },
    {
        "text": "అనన్య శర్మ గారి ఆర్డర్ సిద్ధమైంది.",
        "lang": "te-IN"
    },
    {
        "text": "Your produce offer was sent to the customer successfully!",
        "lang": "en-IN"
    },
    {
        "text": "కస్టమర్‌కు మీ పంట ఆఫర్ విజయవంతంగా పంపించబడింది!",
        "lang": "te-IN"
    },
    {
        "text": "Offer accepted! Order placed direct with the farmer.",
        "lang": "en-IN"
    },
    {
        "text": "రైతు ఆఫర్ అంగీకరించబడింది! ఆర్డర్ ఖరారైంది.",
        "lang": "te-IN"
    },
    {
        "text": "Okay, action cancelled.",
        "lang": "en-IN"
    },
    {
        "text": "సరే, చర్య రద్దు చేయబడింది.",
        "lang": "te-IN"
    },
    {
        "text": "Sorry, I did not catch that. Please tap the mic and speak again.",
        "lang": "en-IN"
    },
    {
        "text": "మాట సరిగ్గా వినపడలేదు. దయచేసి మైక్ నొక్కి మళ్ళీ మాట్లాడండి.",
        "lang": "te-IN"
    },
    {
        "text": "Couldn't catch that clearly. Please complete details manually.",
        "lang": "en-IN"
    },
    {
        "text": "వాయిస్ గుర్తించలేకపోయాము. దయచేసి వివరాలను మాన్యువల్‌గా పూర్తి చేయండి.",
        "lang": "te-IN"
    }
]

def clean_speech_text(text: str, lang: str) -> str:
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

    t = t.replace(',', ' ').replace(';', ' ')
    t = re.sub(r'[*#_~`\[\]()"]', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def get_hash(lang: str, voice: str, text: str) -> str:
    key = f"{lang}:{voice}:{text.strip().lower()}"
    return hashlib.sha256(key.encode('utf-8')).hexdigest()[:16]

async def process_all():
    manifest = {}
    if os.path.exists(MANIFEST_PATH):
        try:
            with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
        except Exception:
            manifest = {}

    total = len(PHRASES)
    print(f"🎙️  Pre-generating {total} audio clips using Microsoft Neural AI...")

    for i, item in enumerate(PHRASES, 1):
        raw_text = item["text"]
        lang = item["lang"]
        voice = VOICE_MAP[lang]
        cleaned = clean_speech_text(raw_text, lang)
        file_hash = get_hash(lang, voice, cleaned)
        output_file = os.path.join(OUTPUT_DIR, f"{file_hash}.mp3")

        # Skip if already generated and non-empty
        if not os.path.exists(output_file) or os.path.getsize(output_file) < 500:
            try:
                communicate = edge_tts.Communicate(cleaned, voice, rate="-4%")
                await communicate.save(output_file)
                print(f"  [{i}/{total}] Generated: {file_hash}.mp3 ({lang}) -> {cleaned[:40]}...")
            except Exception as e:
                print(f"  [{i}/{total}] Error generating '{cleaned[:30]}': {e}")
        else:
            print(f"  [{i}/{total}] Cached: {file_hash}.mp3 ({lang})")

        manifest[file_hash] = {
            "text": raw_text,
            "cleaned": cleaned,
            "lang": lang,
            "voice": voice,
            "url": f"/audio/cache/{file_hash}.mp3"
        }

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Successfully generated and indexed {len(manifest)} clips in {MANIFEST_PATH}")

if __name__ == "__main__":
    asyncio.run(process_all())
