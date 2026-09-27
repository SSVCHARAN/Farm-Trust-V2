import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, '..', 'public', 'audio', 'cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });

function getHash(lang, voice, text) {
  return crypto
    .createHash('sha256')
    .update(lang + ':' + voice + ':' + text.trim().toLowerCase())
    .digest('hex')
    .slice(0, 16);
}

const PHRASES = [
  // Critical demo test phrases (Telugu)
  { lang: 'te-IN', voice: 'te-IN-ShrutiNeural', gender: 'female', text: 'సరే, టమాటాల ధర కిలోకి 35 రూపాయలు చేశాను.' },
  { lang: 'te-IN', voice: 'te-IN-ShrutiNeural', gender: 'female', text: 'మీకు రెండు పెండింగ్ ఆర్డర్లు ఉన్నాయి.' },
  { lang: 'te-IN', voice: 'te-IN-ShrutiNeural', gender: 'female', text: 'మీ దగ్గర 20 కిలోల టమాటాలు ఉన్నాయి.' },
  { lang: 'te-IN', voice: 'te-IN-ShrutiNeural', gender: 'female', text: 'టమాటాల ధర 35 రూపాయలు చేయనా?' },
  { lang: 'te-IN', voice: 'te-IN-ShrutiNeural', gender: 'female', text: 'ఈ వారం మీరు మొత్తం 2,450 రూపాయల అమ్మకాలు చేశారు.' },

  // Variations & app phrases (Telugu)
  { lang: 'te-IN', voice: 'te-IN-ShrutiNeural', gender: 'female', text: 'టమాటాల ధర ₹35/kg కి మార్చాను.' },
  { lang: 'te-IN', voice: 'te-IN-ShrutiNeural', gender: 'female', text: 'నాటు టమాటాలు ధరను ₹35/kgగా మార్చమంటారా?' },
  { lang: 'te-IN', voice: 'te-IN-ShrutiNeural', gender: 'female', text: 'మీకు 1 పెండింగ్ ఆర్డర్ ఉంది: #FT-1024.' },
  { lang: 'te-IN', voice: 'te-IN-ShrutiNeural', gender: 'female', text: 'మీకు ఒక పెండింగ్ ఆర్డర్ ఉంది: #FT-1024.' },
  { lang: 'te-IN', voice: 'te-IN-ShrutiNeural', gender: 'female', text: 'మీకు ఒక పెండింగ్ ఆర్డర్ ఉంది.' },
  { lang: 'te-IN', voice: 'te-IN-ShrutiNeural', gender: 'female', text: 'ప్రస్తుతం పెండింగ్‌లో ఎటువంటి ఆర్డర్లు లేవు. అన్ని ఆర్డర్లు ప్రాసెస్ చేయబడ్డాయి!' },
  { lang: 'te-IN', voice: 'te-IN-ShrutiNeural', gender: 'female', text: 'అనన్య శర్మ గారి ఆర్డర్ సిద్ధమైంది.' },
  { lang: 'te-IN', voice: 'te-IN-ShrutiNeural', gender: 'female', text: 'నమస్కారం! నేను ఫార్మ్ ట్రస్ట్ సహాయకుడిని. మీకు ఎలా సహాయపడగలను?' },
  { lang: 'te-IN', voice: 'te-IN-ShrutiNeural', gender: 'female', text: 'మాట సరిగ్గా వినపడలేదు. దయచేసి మైక్ నొక్కి మళ్ళీ మాట్లాడండి.' },
  { lang: 'te-IN', voice: 'te-IN-ShrutiNeural', gender: 'female', text: 'సరే, చర్య రద్దు చేయబడింది.' },
  { lang: 'te-IN', voice: 'te-IN-ShrutiNeural', gender: 'female', text: 'సరే, ఆఫర్ పంపించాను.' },

  // English counterparts (en-IN)
  { lang: 'en-IN', voice: 'en-IN-NeerjaExpressiveNeural', gender: 'female', text: 'Sure, I have updated the tomato price to 35 rupees per kg.' },
  { lang: 'en-IN', voice: 'en-IN-NeerjaExpressiveNeural', gender: 'female', text: 'Change tomato price to 35 rupees per kg?' },
  { lang: 'en-IN', voice: 'en-IN-NeerjaExpressiveNeural', gender: 'female', text: 'You have 2 pending orders.' },
  { lang: 'en-IN', voice: 'en-IN-NeerjaExpressiveNeural', gender: 'female', text: 'You have 1 pending order from Ananya Sharma.' },
  { lang: 'en-IN', voice: 'en-IN-NeerjaExpressiveNeural', gender: 'female', text: 'You have 20 kg of fresh tomatoes in stock.' },
  { lang: 'en-IN', voice: 'en-IN-NeerjaExpressiveNeural', gender: 'female', text: 'This week you had total sales of 2,450 rupees.' },
  { lang: 'en-IN', voice: 'en-IN-NeerjaExpressiveNeural', gender: 'female', text: 'Namaste! I am your Farm Trust assistant. How can I help you today?' },
  { lang: 'en-IN', voice: 'en-IN-NeerjaExpressiveNeural', gender: 'female', text: 'Sorry, I did not catch that. Please tap the mic and speak again.' },
  { lang: 'en-IN', voice: 'en-IN-NeerjaExpressiveNeural', gender: 'female', text: 'Okay, action cancelled.' }
];

async function run() {
  console.log(`🎙️ Pre-generating ${PHRASES.length} neural audio clips for Farm Trust...`);
  const manifest = {};

  for (const item of PHRASES) {
    const hash = getHash(item.lang, item.voice, item.text);
    const outFile = path.join(CACHE_DIR, `${hash}.mp3`);
    manifest[hash] = {
      text: item.text,
      lang: item.lang,
      voice: item.voice,
      url: `/audio/cache/${hash}.mp3`
    };

    if (fs.existsSync(outFile) && fs.statSync(outFile).size > 1000) {
      console.log(`⏩ [CACHED] ${item.lang} | "${item.text.slice(0, 30)}..." -> ${hash}.mp3`);
      continue;
    }

    try {
      console.log(`🔊 [SYNTH]  ${item.lang} | "${item.text.slice(0, 30)}..." -> ${hash}.mp3`);
      await execFileAsync('python3', [
        path.join(__dirname, 'generate_neural_speech.py'),
        '--text', item.text,
        '--lang', item.lang,
        '--voice', item.voice,
        '--output', outFile
      ]);
    } catch (err) {
      console.error(`❌ Failed to synthesize "${item.text}":`, err.message);
    }
  }

  const manifestPath = path.join(CACHE_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`✅ Pre-generation complete! Manifest written to ${manifestPath}`);
}

run();
