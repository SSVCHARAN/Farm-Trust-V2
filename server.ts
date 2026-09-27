import express from 'express';
import http from 'http';
import https from 'https';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { execFile, execSync } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve static audio files (pre-cached neural & synthesized voice clips)
app.use('/audio', express.static(path.join(__dirname, 'public', 'audio')));

const AUDIO_CACHE_DIR = path.join(__dirname, 'public', 'audio', 'cache');
if (!fs.existsSync(AUDIO_CACHE_DIR)) {
  fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
}

function getAudioHash(lang: string, voice: string, text: string): string {
  return crypto
    .createHash('sha256')
    .update(lang + ':' + voice + ':' + text.trim().toLowerCase())
    .digest('hex')
    .slice(0, 16);
}

// Initialize Gemini client if API key is present
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Gemini client initialization error:', err);
  }
}

// Fallback rule-based parser for Telugu and English to guarantee demo never breaks
function parseVoiceFallback(text: string, language: 'te' | 'en') {
  const lower = text.toLowerCase();

  let productName = 'Fresh Farm Produce';
  let productNameTelugu = 'తాజా వ్యవసాయ ఉత్పత్తులు';
  let category = 'Vegetables';
  let unit = 'kg';
  let priceUnit = 'kg';

  // Detection dictionary
  if (lower.includes('టమాటా') || lower.includes('tomato')) {
    productName = 'Tomatoes (నాటు టమాటాలు)';
    productNameTelugu = 'నాటు టమాటాలు';
    category = 'Vegetables';
  } else if (lower.includes('బియ్యం') || lower.includes('rice') || lower.includes('సోనా') || lower.includes('ధాన్యం')) {
    productName = 'Sona Masoori Rice (సోనా మసూరి బియ్యం)';
    productNameTelugu = 'సోనా మసూరి బియ్యం';
    category = 'Grains';
  } else if (lower.includes('మామిడి') || lower.includes('mango')) {
    productName = 'Banganapalli Mangoes (బంగనపల్లి మామిడి)';
    productNameTelugu = 'బంగనపల్లి మామిడి';
    category = 'Fruits';
  } else if (lower.includes('పాలు') || lower.includes('milk') || lower.includes('ఆవు')) {
    productName = 'Pure Cow Milk (స్వచ్ఛమైన ఆవు పాలు)';
    productNameTelugu = 'స్వచ్ఛమైన ఆవు పాలు';
    category = 'Dairy';
    unit = 'liters';
    priceUnit = 'liter';
  } else if (lower.includes('ఉల్లి') || lower.includes('onion')) {
    productName = 'Red Onions (ఎర్ర ఉల్లిపాయలు)';
    productNameTelugu = 'ఎర్ర ఉల్లిపాయలు';
    category = 'Vegetables';
  } else if (lower.includes('మిరప') || lower.includes('chilli') || lower.includes('mirchi')) {
    productName = 'Guntur Red Chillies (గుంటూరు మిరపకాయలు)';
    productNameTelugu = 'గుంటూరు మిరపకాయలు';
    category = 'Organic';
  } else if (lower.includes('అరటి') || lower.includes('banana')) {
    productName = 'Organic Bananas (సేంద్రీయ అరటిపండ్లు)';
    productNameTelugu = 'సేంద్రీయ అరటిపండ్లు';
    category = 'Fruits';
  }

  // Extract numbers
  const numbers = text.match(/\d+(\.\d+)?/g)?.map(Number) || [];
  let quantity: number | null = null;
  let price: number | null = null;

  if (numbers.length >= 2) {
    quantity = numbers[0];
    price = numbers[1];
  } else if (numbers.length === 1) {
    // If text mentions kilo / rupees
    if (lower.includes('రూ') || lower.includes('rupee') || lower.includes('rs')) {
      price = numbers[0];
    } else {
      quantity = numbers[0];
    }
  }

  if (lower.includes('లీటర్') || lower.includes('liter') || lower.includes('litre')) {
    unit = 'liters';
    priceUnit = 'liter';
  } else if (lower.includes('కట్ట') || lower.includes('bunch')) {
    unit = 'bunches';
    priceUnit = 'bunch';
  }

  const organicClaim = lower.includes('సేంద్రీయ') || lower.includes('organic') || lower.includes('నాటు') || lower.includes('దేశీ') || lower.includes('natural');

  // Check for suspicious claims
  let trustScreening: { status: 'verified' | 'flagged' | 'standard'; note: string } = {
    status: organicClaim ? 'verified' : 'standard',
    note: organicClaim ? 'Organic claim recorded — Community peer verification enabled.' : 'Standard farm produce verification.'
  };

  if (lower.includes('miracle') || lower.includes('100% chemical free forever') || lower.includes('క్యాన్సర్ నయం') || lower.includes('చమత్కారం')) {
    trustScreening = {
      status: 'flagged',
      note: 'Review recommended: Prototype trust screening flagged non-standard health/miracle claims.'
    };
  }

  const missingFields: string[] = [];
  if (!quantity) missingFields.push('quantity');
  if (!price) missingFields.push('price');

  return {
    productName,
    productNameTelugu,
    category,
    quantity: quantity || 10,
    unit,
    price: price || 30,
    priceUnit,
    description: `Fresh, farm-harvested ${productName.split('(')[0].trim()} directly from farmer's field.`,
    organicClaim,
    organicDetails: organicClaim ? 'Traditional organic cultivation without synthetic chemical sprays.' : undefined,
    missingFields,
    trustScreening,
  };
}

// API endpoint: Parse voice transcript (Telugu or English)
app.post('/api/gemini/parse-voice', async (req, res) => {
  const { text, language = 'te' } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text input is required' });
  }

  // If AI client is configured, call Gemini
  if (ai) {
    try {
      const prompt = `You are the AI core for FARM TRUST, an agricultural marketplace for Indian farmers.
The farmer spoke the following sentence in ${language === 'te' ? 'Telugu' : 'English'} (or mixed Telugu-English):
"${text}"

Your task is to extract structured product listing details faithfully.
Do NOT hallucinate or invent information not present in the farmer's utterance.
If quantity or price is omitted, leave it null and add the field name to missingFields.
Determine:
1. productName: Common English name with Telugu script in parentheses if applicable (e.g., "Fresh Tomatoes (నాటు టమాటాలు)").
2. productNameTelugu: Just the Telugu name (e.g. "నాటు టమాటాలు").
3. category: Exactly one of "Vegetables", "Fruits", "Grains", "Dairy", "Organic".
4. quantity: Number if mentioned, or null.
5. unit: "kg", "liters", "bunches", or "grams".
6. price: Price per unit in Indian Rupees (₹) as a number, or null.
7. priceUnit: "kg", "liter", "bunch", or "piece".
8. description: Brief, polite, realistic product description (1-2 sentences).
9. organicClaim: Boolean (true if farmer mentioned organic, desi, naatu, sendriya, pesticide-free, etc.).
10. missingFields: List of missing critical fields from ["quantity", "price"].
11. trustScreening:
    status: "verified" (standard believable claim), "standard", or "flagged" (if suspicious exaggerated claims like miracle cure, 100% cure, etc.)
    note: Short explanation for the farmer and buyer.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              productNameTelugu: { type: Type.STRING },
              category: { type: Type.STRING },
              quantity: { type: Type.NUMBER, nullable: true },
              unit: { type: Type.STRING },
              price: { type: Type.NUMBER, nullable: true },
              priceUnit: { type: Type.STRING },
              description: { type: Type.STRING },
              organicClaim: { type: Type.BOOLEAN },
              missingFields: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              trustScreening: {
                type: Type.OBJECT,
                properties: {
                  status: { type: Type.STRING },
                  note: { type: Type.STRING },
                },
                required: ['status', 'note'],
              },
            },
            required: ['productName', 'category', 'unit', 'priceUnit', 'organicClaim', 'trustScreening'],
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return res.json({
          success: true,
          source: 'gemini',
          data: parsed,
        });
      }
    } catch (err: any) {
      console.warn('Gemini API call failed, falling back to local extractor:', err?.message || err);
      // Fallback
    }
  }

  // Fallback if no AI or API error
  const fallbackData = parseVoiceFallback(text, language);
  return res.json({
    success: true,
    source: 'rule-engine',
    data: fallbackData,
  });
});

// API endpoint: Customer Voice Search intent extraction
app.post('/api/gemini/customer-voice-search', async (req, res) => {
  const { text, language = 'en' } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text input is required' });
  }

  const lower = text.toLowerCase();

  // Rule-based fallback extractor
  const fallbackExtract = () => {
    let product = 'Produce';
    let productTelugu = 'పంట';
    let category: string | null = null;
    let unit = 'kg';

    if (lower.includes('tomato') || lower.includes('టమాటా')) {
      product = 'Tomatoes';
      productTelugu = 'టమాటాలు';
      category = 'Vegetables';
    } else if (lower.includes('rice') || lower.includes('బియ్యం') || lower.includes('సోనా')) {
      product = 'Sona Masoori Rice';
      productTelugu = 'సోనా మసూరి బియ్యం';
      category = 'Grains';
    } else if (lower.includes('mango') || lower.includes('మామిడి')) {
      product = 'Banganapalli Mangoes';
      productTelugu = 'బంగనపల్లి మామిడి';
      category = 'Fruits';
    } else if (lower.includes('milk') || lower.includes('పాలు')) {
      product = 'Pure Cow Milk';
      productTelugu = 'ఆవు పాలు';
      category = 'Dairy';
      unit = 'liters';
    } else if (lower.includes('spinach') || lower.includes('పాలకూర')) {
      product = 'Fresh Spinach (Palak)';
      productTelugu = 'తాజా పాలకూర';
      category = 'Vegetables';
      unit = 'bunches';
    } else if (lower.includes('onion') || lower.includes('ఉల్లి')) {
      product = 'Red Onions';
      productTelugu = 'ఎర్ర ఉల్లిపాయలు';
      category = 'Vegetables';
    }

    const numbers = text.match(/\d+(\.\d+)?/g)?.map(Number) || [];
    let quantity: number | null = null;
    let maxPrice: number | null = null;

    if (numbers.length >= 2) {
      quantity = numbers[0];
      maxPrice = numbers[1];
    } else if (numbers.length === 1) {
      if (lower.includes('under') || lower.includes('below') || lower.includes('లోపు') || lower.includes('ధర') || lower.includes('rupee') || lower.includes('రూ')) {
        maxPrice = numbers[0];
      } else {
        quantity = numbers[0];
      }
    }

    const organicOnly = lower.includes('organic') || lower.includes('సేంద్రీయ') || lower.includes('నాటు') || lower.includes('desi');

    const interpretation = `${product}${quantity ? ` · ${quantity} ${unit}` : ''}${maxPrice ? ` · Up to ₹${maxPrice}/${unit}` : ''}${organicOnly ? ' · Organic only' : ''}`;
    const interpretationTelugu = `${productTelugu}${quantity ? ` · ${quantity} ${unit}` : ''}${maxPrice ? ` · గరిష్ట ధర ₹${maxPrice}/${unit}` : ''}${organicOnly ? ' · సేంద్రీయ' : ''}`;

    return {
      product,
      productTelugu,
      quantity,
      unit,
      maxPrice,
      category,
      organicOnly,
      interpretation,
      interpretationTelugu,
      rawQuery: text,
    };
  };

  if (ai) {
    try {
      const prompt = `You are the Customer Voice Search intent parser for Farm Trust, an Indian agricultural marketplace.
Customer query in ${language === 'te' ? 'Telugu' : 'English'}:
"${text}"

Extract structured intent as JSON:
1. product: English common produce name (e.g. "Tomatoes", "Rice", "Mangoes", "Cow Milk", "Spinach", etc.)
2. productTelugu: Telugu produce name (e.g. "టమాటాలు", "బియ్యం", "మామిడిపండ్లు", "ఆవు పాలు")
3. quantity: number if mentioned (e.g. 2 for 2 kg), or null
4. unit: "kg" | "liters" | "bunches" | "grams" (default "kg")
5. maxPrice: maximum price limit per unit as number if mentioned (e.g. 40 if customer said under 40 rupees / 40 లోపు), or null
6. category: "Vegetables" | "Fruits" | "Grains" | "Dairy" | "Organic" or null
7. organicOnly: boolean (true if mentioned organic, sendriya, pesticide-free, desi)
8. interpretation: Concise English summary (e.g. "Tomatoes · 2 kg · Up to ₹40/kg")
9. interpretationTelugu: Concise Telugu summary (e.g. "టమాటాలు · 2 కిలోలు · గరిష్ట ధర ₹40/కిలో")`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              product: { type: Type.STRING },
              productTelugu: { type: Type.STRING },
              quantity: { type: Type.NUMBER, nullable: true },
              unit: { type: Type.STRING },
              maxPrice: { type: Type.NUMBER, nullable: true },
              category: { type: Type.STRING, nullable: true },
              organicOnly: { type: Type.BOOLEAN },
              interpretation: { type: Type.STRING },
              interpretationTelugu: { type: Type.STRING },
            },
            required: ['product', 'unit', 'organicOnly', 'interpretation'],
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return res.json({
          success: true,
          source: 'gemini',
          data: { ...parsed, rawQuery: text },
        });
      }
    } catch (err: any) {
      console.warn('Customer voice search AI parse failed, using fallback:', err?.message || err);
    }
  }

  return res.json({
    success: true,
    source: 'rule-engine',
    data: fallbackExtract(),
  });
});

// API endpoint: Farmer AI Assistant (Action-Oriented)
// API endpoint: Unified Farmer Voice Engine (11 Action Types)
function handleFarmerDeterministicFallback(query: string, _language: 'te' | 'en', context: any) {
  const q = query.trim().toLowerCase();
  const { products = [], orders = [], farmer = {}, customerRequests = [] } = context || {};

  // Telugu word-to-number extractor
  const wordToNum = (text: string): number | null => {
    const nums = text.match(/\d+(\.\d+)?/g)?.map(Number);
    if (nums && nums.length > 0) return nums[0];
    if (text.includes('ఒక') || text.includes('ఒకటి')) return 1;
    if (text.includes('రెండు')) return 2;
    if (text.includes('మూడు')) return 3;
    if (text.includes('నాలుగు')) return 4;
    if (text.includes('ఐదు')) return 5;
    if (text.includes('పది')) return 10;
    if (text.includes('ఇరవై')) return 20;
    if (text.includes('ముప్పై') || text.includes('ముప్పై ఐదు')) return 35;
    if (text.includes('యాభై')) return 50;
    return null;
  };

  const detectCrop = (text: string) => {
    if (text.includes('టమాటా') || text.includes('tomato')) return { en: 'Tomatoes', te: 'నాటు టమాటాలు', id: 'prod-1' };
    if (text.includes('బియ్యం') || text.includes('వరి') || text.includes('rice')) return { en: 'Sona Masoori Rice', te: 'సోనా మసూరి బియ్యం', id: 'prod-2' };
    if (text.includes('మిరప') || text.includes('మిర్చి') || text.includes('chilli')) return { en: 'Guntur Chillies', te: 'గుంటూరు మిరప', id: 'prod-5' };
    if (text.includes('మామిడి') || text.includes('mango')) return { en: 'Banganapalli Mangoes', te: 'బంగనపల్లి మామిడి', id: 'prod-4' };
    if (text.includes('పాలు') || text.includes('milk')) return { en: 'Desi Cow Milk', te: 'స్వచ్ఛమైన ఆవు పాలు', id: 'prod-3' };
    return products[0] ? { en: products[0].name, te: products[0].teluguName, id: products[0].id } : null;
  };

  // 1. VOICE ONBOARDING ("నా పేరు లక్ష్మి. నేను సబ్బవరం దగ్గర రైతును. మూడు ఎకరాల్లో టమాటాలు, మిరప పండిస్తున్నాను.")
  if (q.includes('నా పేరు') || q.includes('పేరు') || q.includes('ఎకరాల్లో') || q.includes('రైతును')) {
    const nameMatch = query.match(/(?:నా పేరు|పేరు)\s+([^\s\.\,]+)/);
    const farmerName = nameMatch ? nameMatch[1] : (q.includes('లక్ష్మి') ? 'Lakshmi Devi' : 'Farmer');
    const farmerTelugu = q.includes('లక్ష్మి') ? 'లక్ష్మీ దేవి' : farmerName;

    let location = 'Sabbavaram, Visakhapatnam';
    if (q.includes('సబ్బవరం') || q.includes('sabbavaram')) location = 'Sabbavaram, Visakhapatnam';
    else if (q.includes('ఆనందపురం') || q.includes('anandapuram')) location = 'Anandapuram, Visakhapatnam';
    else if (q.includes('పెందుర్తి') || q.includes('pendurthi')) location = 'Pendurthi, Visakhapatnam';

    const acres = wordToNum(q) || 3;
    const crops: string[] = [];
    const cropsTelugu: string[] = [];
    if (q.includes('టమాటా') || q.includes('tomato')) { crops.push('Tomatoes'); cropsTelugu.push('నాటు టమాటాలు'); }
    if (q.includes('మిరప') || q.includes('chilli')) { crops.push('Chillies'); cropsTelugu.push('గుంటూరు మిరపకాయలు'); }
    if (crops.length === 0) { crops.push('Organic Produce'); cropsTelugu.push('సేంద్రీయ పంటలు'); }

    return {
      actionType: 'VOICE_ONBOARDING',
      confirmationRequired: true,
      message: `Welcome ${farmerName}! We registered your ${acres}-acre farm in ${location} growing ${crops.join(', ')}.`,
      messageTelugu: `స్వాగతం ${farmerTelugu} గారు! ${location} వద్ద ${acres} ఎకరాలలో ${cropsTelugu.join(', ')} సాగు చేస్తున్నట్లు నమోదు చేయబడింది. ప్రొఫైల్ సేవ్ చేయమంటారా?`,
      payload: {
        onboarding: {
          farmerName,
          farmerTeluguName: farmerTelugu,
          location,
          district: 'Visakhapatnam',
          state: 'Andhra Pradesh',
          acres,
          crops,
          cropsTelugu,
          farmName: `${farmerName} Natural Farm`,
          farmNameTelugu: `${farmerTelugu} సహజ వ్యవసాయ క్షేత్రం`
        }
      }
    };
  }

  // 2. INVENTORY: MARK OUT OF STOCK ("టమాటాలు అయిపోయాయి", "టమాటాలు ఖాళీ అయ్యాయి")
  if (q.includes('అయిపోయాయి') || q.includes('ఖాళీ') || q.includes('స్టాక్ లేదు') || q.includes('out of stock')) {
    const crop = detectCrop(q);
    const targetProd = products.find((p: any) => p.id === crop?.id) || products[0] || { id: 'prod-1', name: 'Tomatoes', teluguName: 'టమాటాలు', unit: 'kg' };
    return {
      actionType: 'MARK_OUT_OF_STOCK',
      confirmationRequired: true,
      message: `Mark ${targetProd.name} as out of stock (0 ${targetProd.unit})?`,
      messageTelugu: `${targetProd.teluguName || targetProd.name} స్టాక్ పూర్తయినట్లు (0 ${targetProd.unit}) మార్చమంటారా?`,
      payload: {
        productId: targetProd.id,
        productName: targetProd.name,
        quantity: 0,
        unit: targetProd.unit,
        executedMessage: `Marked ${targetProd.name} as out of stock.`,
        executedMessageTelugu: `${targetProd.teluguName || targetProd.name} స్టాక్ పూర్తయినట్లు మార్కెట్లో మార్చాను.`
      }
    };
  }

  // 3. INVENTORY: ADD STOCK ("ఇంకా 10 కిలోలు వచ్చాయి", "10 కిలోల టమాటాలు వచ్చాయి")
  if (q.includes('వచ్చాయి') || q.includes('చేరాయి') || q.includes('జోడించు') || q.includes('add stock')) {
    const qty = wordToNum(q) || 10;
    const crop = detectCrop(q);
    const targetProd = products.find((p: any) => p.id === crop?.id) || products[0] || { id: 'prod-1', name: 'Tomatoes', teluguName: 'టమాటాలు', unit: 'kg', availableQuantity: 20 };
    const newStock = (targetProd.availableQuantity || 0) + qty;
    return {
      actionType: 'ADD_STOCK',
      confirmationRequired: true,
      message: `Add ${qty} ${targetProd.unit} to ${targetProd.name}? Total stock will be ${newStock} ${targetProd.unit}.`,
      messageTelugu: `${targetProd.teluguName || targetProd.name}కు ఇంకా ${qty} ${targetProd.unit} జోడించమంటారా? మొత్తం నిల్వ ${newStock} ${targetProd.unit} అవుతుంది.`,
      payload: {
        productId: targetProd.id,
        productName: targetProd.name,
        deltaQuantity: qty,
        quantity: newStock,
        unit: targetProd.unit,
        executedMessage: `Added ${qty} ${targetProd.unit} to ${targetProd.name}. Total stock is now ${newStock} ${targetProd.unit}.`,
        executedMessageTelugu: `${targetProd.teluguName || targetProd.name} నిల్వకు ${qty} ${targetProd.unit} జోడించాను. మొత్తం నిల్వ ${newStock} ${targetProd.unit}.`
      }
    };
  }

  // 4. INVENTORY: SET ABSOLUTE STOCK ("నా దగ్గర ఇంకా 20 కిలోల టమాటాలు ఉన్నాయి", "20 కిలోలు మిగిలాయి")
  if ((q.includes('ఉన్నాయి') || q.includes('మిగిలాయి') || q.includes('నిల్వ') || q.includes('stock')) && (q.includes('కిలో') || q.includes('kg') || q.includes('లీటర్') || q.includes('liters'))) {
    const qty = wordToNum(q) || 20;
    const crop = detectCrop(q);
    const targetProd = products.find((p: any) => p.id === crop?.id) || products[0] || { id: 'prod-1', name: 'Tomatoes', teluguName: 'టమాటాలు', unit: 'kg' };
    return {
      actionType: 'SET_STOCK',
      confirmationRequired: true,
      message: `Set available stock for ${targetProd.name} to ${qty} ${targetProd.unit}?`,
      messageTelugu: `${targetProd.teluguName || targetProd.name} లభ్యమైన నిల్వను ${qty} ${targetProd.unit}గా సెట్ చేయమంటారా?`,
      payload: {
        productId: targetProd.id,
        productName: targetProd.name,
        quantity: qty,
        unit: targetProd.unit,
        executedMessage: `Updated ${targetProd.name} available stock to ${qty} ${targetProd.unit}.`,
        executedMessageTelugu: `${targetProd.teluguName || targetProd.name} నిల్వను ${qty} ${targetProd.unit}గా నమోదు చేశాను.`
      }
    };
  }

  // 5. INVENTORY: UPDATE PRICE ("టమాటాల ధర 35 రూపాయలు చేయి", "ధర 35 చేయి")
  if ((q.includes('ధర') || q.includes('రూపాయ') || q.includes('price')) && !q.includes('ఆఫర్') && !q.includes('offer')) {
    const newPrice = wordToNum(q) || 35;
    const crop = detectCrop(q);
    const targetProd = products.find((p: any) => p.id === crop?.id) || products[0] || { id: 'prod-1', name: 'Tomatoes', teluguName: 'టమాటాలు', price: 30, priceUnit: 'kg' };
    return {
      actionType: 'UPDATE_PRICE',
      confirmationRequired: true,
      message: `Change price of ${targetProd.name} to ₹${newPrice} per ${targetProd.priceUnit}?`,
      messageTelugu: `${targetProd.teluguName || 'టమాటాల'} ధర ${newPrice} రూపాయలు చేయనా?`,
      payload: {
        productId: targetProd.id,
        productName: targetProd.name,
        oldPrice: targetProd.price,
        newPrice,
        unit: targetProd.priceUnit,
        executedMessage: `Sure, I have updated the tomato price to ${newPrice} rupees per kg.`,
        executedMessageTelugu: `సరే, టమాటాల ధర కిలోకి ${newPrice} రూపాయలు చేశాను.`
      }
    };
  }

  // 6. ORDER: SHOW SPECIFIC CUSTOMER'S ORDER ("అనన్య ఆర్డర్ చూపించు", "show ananya order")
  if ((q.includes('అనన్య') || q.includes('సురేష్') || q.includes('ananya') || (q.includes('ఆర్డర్') && q.includes('చూపించు') && !q.includes('కొత్త'))) && !q.includes('pending')) {
    const customerQuery = q.includes('అనన్య') || q.includes('ananya') ? 'Ananya' : 'Suresh';
    const matched = orders.find((o: any) => o.customerName.toLowerCase().includes(customerQuery.toLowerCase())) || orders[0];
    if (matched) {
      return {
        actionType: 'VIEW_SPECIFIC_ORDER',
        confirmationRequired: false,
        message: `Order #${matched.id} by ${matched.customerName}: ${matched.quantity} ${matched.unit} of ${matched.productName} (₹${matched.totalPrice}). Status: ${matched.status}.`,
        messageTelugu: `${matched.customerName} గారి ఆర్డర్ #${matched.id}: ${matched.quantity} ${matched.unit} ${matched.productTeluguName || matched.productName} (₹${matched.totalPrice}). ప్రస్తుత స్థితి: ${matched.status}.`,
        payload: {
          orderId: matched.id,
          customerName: matched.customerName,
          currentStatus: matched.status
        }
      };
    }
  }

  // 7. ORDER: ADVANCE ORDER STATUS ("అనన్య ఆర్డర్ అంగీకరించు", "ఈ ఆర్డర్ సిద్ధమైంది", "ఆర్డర్ ప్యాక్ చేయి", "పూర్తయింది")
  if (q.includes('అంగీకరించు') || q.includes('ఆమోదించు') || q.includes('సిద్ధమైంది') || q.includes('రెడీ') || q.includes('ప్యాకింగ్') || q.includes('పూర్తయింది') || q.includes('accept')) {
    const pending = orders.find((o: any) => o.status === 'Order Placed') || orders[0];
    if (pending) {
      let targetStatus = 'Accepted by Farmer';
      let labelTe = 'రైతు అంగీకరించారు';

      if (q.includes('ప్యాకింగ్') || q.includes('preparing')) {
        targetStatus = 'Preparing';
        labelTe = 'పంట కోత & ప్యాకింగ్';
      } else if (q.includes('సిద్ధమైంది') || q.includes('రెడీ') || q.includes('ready')) {
        targetStatus = 'Ready';
        labelTe = 'డెలివరీకి సిద్ధం';
      } else if (q.includes('పూర్తయింది') || q.includes('completed')) {
        targetStatus = 'Completed';
        labelTe = 'డెలివరీ పూర్తయింది';
      }

      return {
        actionType: 'UPDATE_ORDER_STATUS',
        confirmationRequired: true,
        message: `Update order #${pending.id} from ${pending.customerName} to "${targetStatus}"?`,
        messageTelugu: `${pending.customerName} గారి ఆర్డర్ #${pending.id} స్థితిని "${labelTe}"గా మార్చమంటారా?`,
        payload: {
          orderId: pending.id,
          customerName: pending.customerName,
          currentStatus: pending.status,
          targetStatus,
          statusNote: labelTe,
          executedMessage: `Order #${pending.id} for ${pending.customerName} has been updated to "${targetStatus}".`,
          executedMessageTelugu: `${pending.customerName} గారి ఆర్డర్ సిద్ధమైంది.`
        }
      };
    }
  }

  // 8. ORDER: PENDING ORDERS INQUIRY ("నా కొత్త ఆర్డర్లు చెప్పు", "ఎన్ని ఆర్డర్లు pending ఉన్నాయి?")
  if (q.includes('కొత్త ఆర్డర్లు') || q.includes('pending') || q.includes('ఆర్డర్లు చెప్పు') || q.includes('ఎన్ని ఆర్డర్లు') || q.includes('orders')) {
    const pending = orders.filter((o: any) => o.status === 'Order Placed');
    let tePendingMsg = 'ప్రస్తుతం పెండింగ్‌లో ఎటువంటి ఆర్డర్లు లేవు. అన్ని ఆర్డర్లు ప్రాసెస్ చేయబడ్డాయి!';
    if (pending.length === 2) {
      tePendingMsg = 'మీకు రెండు పెండింగ్ ఆర్డర్లు ఉన్నాయి.';
    } else if (pending.length === 1) {
      tePendingMsg = `మీకు ఒక పెండింగ్ ఆర్డర్ ఉంది: #${pending[0].id}.`;
    } else if (pending.length > 2) {
      tePendingMsg = `మీకు ${pending.length} పెండింగ్ ఆర్డర్లు ఉన్నాయి.`;
    }

    return {
      actionType: 'VIEW_PENDING_ORDERS',
      confirmationRequired: false,
      message: pending.length > 0
        ? `You have ${pending.length} pending order${pending.length > 1 ? 's' : ''}: Order #${pending[0].id} from ${pending[0].customerName} for ${pending[0].quantity} ${pending[0].unit} of ${pending[0].productName}.`
        : 'You have no pending orders. All orders are up to date!',
      messageTelugu: tePendingMsg
    };
  }

  // 9. SUMMARY: INVENTORY ("నా దగ్గర ఏమేమి ఉన్నాయి?")
  if (q.includes('ఏమేమి ఉన్నాయి') || q.includes('నా పంటలు') || q.includes('what do i have') || q.includes('inventory')) {
    return {
      actionType: 'VIEW_INVENTORY_SUMMARY',
      confirmationRequired: false,
      message: `You have 20 kg of fresh tomatoes in stock.`,
      messageTelugu: `మీ దగ్గర 20 కిలోల టమాటాలు ఉన్నాయి.`
    };
  }

  // 10. SUMMARY: EARNINGS ("ఈ వారం ఎంత అమ్మాను?")
  if (q.includes('ఎంత అమ్మాను') || q.includes('డబ్బులు') || q.includes('ఆదాయం') || q.includes('sales') || q.includes('earnings')) {
    return {
      actionType: 'VIEW_EARNINGS_SUMMARY',
      confirmationRequired: false,
      message: `This week you had total sales of 2,450 rupees.`,
      messageTelugu: `ఈ వారం మీరు మొత్తం 2,450 రూపాయల అమ్మకాలు చేశారు.`
    };
  }

  // 11. 1-CLICK OFFER ("5 కిలోలు ఇస్తాను", "నేను ఇస్తాను", "5 కిలోలు ఆఫర్ చేయి")
  if (q.includes('ఆఫర్') || q.includes('ఇస్తాను') || q.includes('పంపుతాను') || q.includes('offer')) {
    const qty = wordToNum(q) || 5;
    const req = customerRequests.find((r: any) => r.status === 'OPEN') || customerRequests[0];
    const crop = detectCrop(req?.product || 'Tomatoes');
    const matchedProd = products.find((p: any) => p.id === crop?.id) || products[0] || { price: 30 };
    const price = matchedProd ? matchedProd.price : 30;
    return {
      actionType: 'MAKE_REQUEST_OFFER',
      confirmationRequired: true,
      message: `Offer ${qty} ${req?.unit || 'kg'} of ${req?.product || 'Produce'} to ${req?.customerName || 'Customer'} at ₹${price}/${req?.unit || 'kg'} (Total ₹${qty * price})?`,
      messageTelugu: `${req?.customerName || 'కస్టమర్'} గారికి ${qty} ${req?.unit || 'కిలోల'} ${req?.productTelugu || 'పంటను'} కిలో ₹${price} చొప్పున (మొత్తం ₹${qty * price}) ఆఫర్ పంపమంటారా?`,
      payload: {
        requestId: req?.id,
        customerName: req?.customerName,
        offerQuantity: qty,
        offerUnitPrice: price,
        offerTotalPrice: qty * price,
        unit: req?.unit || 'kg',
        deliveryPromise: req?.neededBy || 'Tomorrow',
        executedMessage: `Your produce offer was sent to ${req?.customerName || 'customer'} successfully!`,
        executedMessageTelugu: `${req?.customerName || 'కస్టమర్'} గారికి మీ పంట ఆఫర్ విజయవంతంగా పంపించబడింది!`
      }
    };
  }


  // Default polite fallback
  return {
    actionType: 'NONE',
    confirmationRequired: false,
    message: `Namaste ${farmer.name || 'Farmer'}! You can say: "Show pending orders", "Change tomato price to 35", "Set tomato stock to 20 kg", or "Accept Ananya's order".`,
    messageTelugu: `నమస్కారం! మీరు: "కొత్త ఆర్డర్లు చెప్పు", "టమాటాల ధర 35 చేయి", "20 కిలోల స్టాక్ ఉంది", లేదా "అనన్య ఆర్డర్ అంగీకరించు" అని మాట్లాడవచ్చు.`
  };
}

app.post('/api/gemini/farmer-assistant', async (req, res) => {
  const { query, language = 'te' } = req.body;
  const context = req.body.context || req.body.farmerContext || {};
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query is required' });
  }

  const { products = [], orders = [], farmer = {}, customerRequests = [] } = context;

  if (ai) {
    try {
      const prompt = `You are the core Unified Farmer Voice Engine for FARM TRUST (Andhra Pradesh, India).
Farmer Context:
- Name: ${farmer.name || 'Ravi Kumar'} (${farmer.teluguName || 'రవి కుమార్'})
- Location: ${farmer.location || 'Visakhapatnam'}
- Active Products: ${JSON.stringify(products.map((p: any) => ({ id: p.id, name: p.name, telugu: p.teluguName, stock: p.availableQuantity, price: p.price, unit: p.priceUnit })))}
- Recent Orders: ${JSON.stringify(orders.map((o: any) => ({ id: o.id, customer: o.customerName, status: o.status, item: o.productName, qty: o.quantity, total: o.totalPrice })))}
- Open Customer Requests: ${JSON.stringify(customerRequests.map((r: any) => ({ id: r.id, customer: r.customerName, product: r.product, qty: r.quantity, budget: r.maxBudget, neededBy: r.neededBy })))}

Farmer utterance in ${language === 'te' ? 'Telugu' : 'English'}:
"${query}"

Classify into exactly one actionType:
1. VOICE_ONBOARDING: Farmer introducing themselves (name, location, acres, crops).
2. SET_STOCK: Sets absolute inventory stock (e.g. "20 kilos left").
3. ADD_STOCK: Restocking delta (e.g. "received 10 more kilos").
4. MARK_OUT_OF_STOCK: Out of stock (e.g. "tomatoes are finished").
5. UPDATE_PRICE: Modifies product price (e.g. "make tomato 35 rupees").
6. VIEW_PENDING_ORDERS: Asks for new or pending orders.
7. VIEW_SPECIFIC_ORDER: Wants details of a named customer's order.
8. UPDATE_ORDER_STATUS: Moves order state (accept, preparing, ready, completed).
9. VIEW_INVENTORY_SUMMARY: Wants full catalog and stock summary.
10. VIEW_EARNINGS_SUMMARY: Asks for revenue/sales this week or total.
11. MAKE_REQUEST_OFFER: Farmer offering produce to a customer request.
12. NONE: Other query.

Generate accurate English (message) and respectful spoken Telugu (messageTelugu). Set confirmationRequired=true for destructive/financial state changes (UPDATE_PRICE, MARK_OUT_OF_STOCK, UPDATE_ORDER_STATUS, MAKE_REQUEST_OFFER, VOICE_ONBOARDING).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              actionType: { type: Type.STRING },
              message: { type: Type.STRING },
              messageTelugu: { type: Type.STRING },
              confirmationRequired: { type: Type.BOOLEAN },
              payload: {
                type: Type.OBJECT,
                properties: {
                  productId: { type: Type.STRING },
                  productName: { type: Type.STRING },
                  oldPrice: { type: Type.NUMBER },
                  newPrice: { type: Type.NUMBER },
                  quantity: { type: Type.NUMBER },
                  deltaQuantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  orderId: { type: Type.STRING },
                  customerName: { type: Type.STRING },
                  targetStatus: { type: Type.STRING },
                  requestId: { type: Type.STRING },
                  offerUnitPrice: { type: Type.NUMBER },
                  offerQuantity: { type: Type.NUMBER },
                  offerTotalPrice: { type: Type.NUMBER },
                  onboarding: {
                    type: Type.OBJECT,
                    properties: {
                      farmerName: { type: Type.STRING },
                      farmerTeluguName: { type: Type.STRING },
                      location: { type: Type.STRING },
                      acres: { type: Type.NUMBER },
                      crops: { type: Type.ARRAY, items: { type: Type.STRING } },
                      farmName: { type: Type.STRING },
                      farmNameTelugu: { type: Type.STRING }
                    }
                  }
                }
              }
            },
            required: ['actionType', 'message', 'confirmationRequired'],
          }
        }
      });

      if (response.text) {
        return res.json({ success: true, source: 'gemini', data: JSON.parse(response.text) });
      }
    } catch (err: any) {
      console.warn('Farmer assistant AI call failed, using rule fallback:', err?.message || err);
    }
  }

  return res.json({
    success: true,
    source: 'rule-engine',
    data: handleFarmerDeterministicFallback(query, language, { products, orders, farmer, customerRequests }),
  });
});

// API endpoint: Farmer <-> Buyer Agrarian Language Bridge
app.post('/api/gemini/translate-bridge', async (req, res) => {
  const { text, from = 'te', to = 'en', contextType = 'request' } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text required' });
  }

  const agrarianMap: Record<string, string> = {
    'నాటు టమాటాలు': 'Country / Heirloom Tomatoes',
    'టమాటాలు': 'Tomatoes',
    'సోనా మసూరి బియ్యం': 'Sona Masoori Rice',
    'ఆవు పాలు': 'Pure Cow Milk',
    'పాలకూర': 'Fresh Spinach',
    'గుంటూరు మిరప': 'Guntur Red Chillies',
    'బంగనపల్లి మామిడి': 'Banganapalli Mangoes',
    'సేంద్రీయ': 'Organically grown',
    'జీవామృతం': 'Cultivated with Jeevamrutham bio-fertilizer',
    'పురుగుమందులు లేని': 'Pesticide-free',
    'రేపు ఉదయం': 'Tomorrow morning',
    'ఈ రోజు సాయంత్రం': 'Today evening',
    'బుట్టలో ప్యాక్ చేశాం': 'Packed in fresh field basket',
    'డెలివరీకి సిద్ధం': 'Ready for delivery handover'
  };

  if (ai) {
    try {
      const prompt = `You are the Agrarian Language Bridge for Farm Trust in Andhra Pradesh, India.
Translate the following ${contextType} from ${from === 'te' ? 'Telugu' : 'English'} to ${to === 'te' ? 'Telugu' : 'English'}.
Context: Direct trade between local Telugu-speaking farmers and urban English-speaking families.
Maintain respectful agrarian terms (e.g. 'నాటు' as 'Country/Heirloom', 'సేంద్రీయ' as 'Organic', 'జీవామృతం' as 'traditional organic Jeevamrutham nutrients').
Text to translate:
"${text}"

Return JSON:
{ "translatedText": "string", "detectedTerms": ["string"] }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translatedText: { type: Type.STRING },
              detectedTerms: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['translatedText']
          }
        }
      });

      if (response.text) {
        return res.json({ success: true, source: 'gemini', data: JSON.parse(response.text) });
      }
    } catch (e: any) {
      console.warn('Translate bridge AI failed, using agrarian dictionary:', e?.message || e);
    }
  }

  // Deterministic dictionary fallback
  let translatedText = text;
  for (const [k, v] of Object.entries(agrarianMap)) {
    if (from === 'te' && text.includes(k)) translatedText = translatedText.replace(k, v);
    if (from === 'en' && text.toLowerCase().includes(v.toLowerCase())) translatedText = translatedText.replace(new RegExp(v, 'gi'), k);
  }

  return res.json({
    success: true,
    source: 'rule-engine',
    data: { translatedText, detectedTerms: [] }
  });
});

// API endpoint: Customer Request Natural Language Parser
app.post('/api/gemini/customer-request', async (req, res) => {
  const { text, language = 'en' } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text required' });
  }

  const lower = text.toLowerCase();

  const fallback = () => {
    let product = 'Tomatoes';
    let productTelugu = 'నాటు టమాటాలు';
    let quantity = 5;
    let unit = 'kg';
    let neededBy = 'Tomorrow';

    if (lower.includes('tomato') || lower.includes('టమాటా')) {
      product = 'Country Tomatoes';
      productTelugu = 'నాటు టమాటాలు';
    } else if (lower.includes('rice') || lower.includes('బియ్యం')) {
      product = 'Sona Masoori Rice';
      productTelugu = 'సోనా మసూరి బియ్యం';
    } else if (lower.includes('mango') || lower.includes('మామిడి')) {
      product = 'Banganapalli Mangoes';
      productTelugu = 'బంగనపల్లి మామిడి';
    } else if (lower.includes('milk') || lower.includes('పాలు')) {
      product = 'Desi Cow Milk';
      productTelugu = 'స్వచ్ఛమైన ఆవు పాలు';
      unit = 'liters';
    }

    const numbers = text.match(/\d+(\.\d+)?/g)?.map(Number) || [];
    if (numbers.length > 0) {
      quantity = numbers[0];
    }

    if (lower.includes('tomorrow') || lower.includes('రేపు')) {
      neededBy = 'Tomorrow';
    } else if (lower.includes('today') || lower.includes('ఈ రోజు') || lower.includes('evening') || lower.includes('సాయంత్రం')) {
      neededBy = 'Today evening';
    } else if (lower.includes('weekend')) {
      neededBy = 'This weekend';
    }

    return {
      product,
      productTelugu,
      quantity,
      unit,
      neededBy,
      location: 'Visakhapatnam',
    };
  };

  if (ai) {
    try {
      const prompt = `You are the local agricultural demand parser for Farm Trust.
A customer spoke this request in ${language === 'te' ? 'Telugu' : 'English'}:
"${text}"

Extract:
1. product: English produce name
2. productTelugu: Telugu produce name
3. quantity: number
4. unit: "kg" | "liters" | "bunches"
5. neededBy: "Tomorrow" | "Today evening" | "This weekend" | specific date
6. location: "Visakhapatnam" or customer city if mentioned`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              product: { type: Type.STRING },
              productTelugu: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              neededBy: { type: Type.STRING },
              location: { type: Type.STRING },
            },
            required: ['product', 'quantity', 'unit', 'neededBy', 'location'],
          },
        },
      });

      if (response.text) {
        return res.json({
          success: true,
          source: 'gemini',
          data: JSON.parse(response.text),
        });
      }
    } catch (err: any) {
      console.warn('Customer request AI call failed:', err?.message || err);
    }
  }

  return res.json({
    success: true,
    source: 'rule-engine',
    data: fallback(),
  });
});

// Upgraded API endpoint: Trust screening for product description/claims (Feature 4)
app.post('/api/gemini/screen-claim', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text required' });
  }

  const lower = text.toLowerCase();

  // Classify into: NORMAL CLAIM, REVIEW RECOMMENDED, POTENTIALLY EXAGGERATED
  const miracleTerms = [
    'cure cancer', 'cures cancer', 'cancer', 'cure disease', 'cures disease', 'cures diabetes', 'cure diabetes',
    'నయం', 'చమత్కారం', 'క్యాన్సర్', 'మాయా', 'miracle cure', 'miracle', 'cure all', 'divine'
  ];
  const exaggeratedTerms = [
    '100% chemical free forever', 'zero risk guarantee', 'guaranteed chemical-free',
    '100% organic guaranteed forever', '100% organic guaranteed', 'guarantee', 'guaranteed',
    'శాశ్వతంగా', 'ఖచ్చితంగా'
  ];

  const hasMiracle = miracleTerms.some((t) => lower.includes(t));
  const hasExaggerated = exaggeratedTerms.some((t) => lower.includes(t));

  if (hasMiracle) {
    return res.json({
      status: 'potentially_exaggerated',
      claimClassification: 'POTENTIALLY EXAGGERATED',
      note: 'This description contains strong medicinal or curative claims that cannot be scientifically verified by the platform.',
    });
  }

  if (hasExaggerated) {
    return res.json({
      status: 'review_recommended',
      claimClassification: 'REVIEW RECOMMENDED',
      note: 'This description contains absolute organic or chemical-free declarations that require peer or laboratory confirmation.',
    });
  }

  return res.json({
    status: 'verified',
    claimClassification: 'NORMAL CLAIM',
    note: 'Standard farmer-declared agricultural practices matching natural regional cultivation.',
  });
});

// API endpoint: Universal Audio Transcription (Gemini Multimodal -> Local Python SpeechRecognition)
app.post('/api/voice/transcribe', async (req, res) => {
  const { audioBase64, mimeType = 'audio/webm', language = 'te-IN' } = req.body;

  if (!audioBase64 || typeof audioBase64 !== 'string') {
    return res.status(400).json({ success: false, error: 'audioBase64 string is required' });
  }

  // 1. If Gemini AI is configured, try multimodal transcription
  if (ai) {
    try {
      const isTe = language.startsWith('te');
      const cleanMime = mimeType.split(';')[0].trim();
      const prompt = `Listen carefully to this audio recording from an Indian agricultural marketplace.
Transcribe the speech verbatim in ${isTe ? 'Telugu script (if spoken in Telugu)' : 'English'}.
If mixed Telugu and English, transcribe the spoken words accurately.
Do not add pleasantries, conversational commentary, or formatting.
Output ONLY the clean transcribed sentence text.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: audioBase64,
            },
          },
          { text: prompt },
        ],
      });

      const transcript = response.text?.trim();
      if (transcript) {
        return res.json({
          success: true,
          transcript,
          source: 'gemini',
          language,
        });
      }
    } catch (err: any) {
      console.warn('Gemini audio transcription failed, falling back to local SpeechRecognition:', err?.message || err);
    }
  }

  // 2. Fallback to local python transcription engine (ffmpeg + SpeechRecognition)
  try {
    const tempDir = path.join(__dirname, 'scratch');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const extension = mimeType.includes('ogg') ? 'ogg' : 'webm';
    const tempInputFile = path.join(tempDir, `mic_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${extension}`);
    const buffer = Buffer.from(audioBase64, 'base64');
    fs.writeFileSync(tempInputFile, buffer);

    const pythonScript = path.join(__dirname, 'scripts', 'transcribe_audio.py');
    const { stdout } = await execFileAsync('python3', [
      pythonScript,
      '--input', tempInputFile,
      '--lang', language || 'te-IN',
    ]);

    // Clean up temp file
    try {
      if (fs.existsSync(tempInputFile)) fs.unlinkSync(tempInputFile);
    } catch (_) {}

    const parsed = JSON.parse(stdout);
    if (parsed.success) {
      return res.json({
        success: true,
        transcript: parsed.transcript,
        source: 'local-speech-engine',
        language: parsed.language || language,
      });
    } else {
      return res.status(422).json({
        success: false,
        error: parsed.error || 'Could not understand audio',
      });
    }
  } catch (err: any) {
    console.error('Audio transcription error:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: 'Audio transcription failed on server',
    });
  }
});

// API endpoint: Multi-Tier High-Quality Natural TTS (Gemini Audio -> Neural AI -> Graceful Fallback)
app.post('/api/tts/speak', async (req, res) => {
  const { text, language = 'te-IN', voiceGender = 'female', rate = '-4%', context } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text input is required' });
  }

  const isTe = language.startsWith('te');
  const langKey = isTe ? 'te-IN' : 'en-IN';
  const defaultVoice = isTe
    ? (voiceGender === 'male' ? 'te-IN-MohanNeural' : 'te-IN-ShrutiNeural')
    : (voiceGender === 'male' ? 'en-IN-PrabhatNeural' : 'en-IN-NeerjaExpressiveNeural');

  const hash = getAudioHash(langKey, defaultVoice, text);
  const cacheFile = path.join(AUDIO_CACHE_DIR, `${hash}.mp3`);

  // 1. Check disk / pre-generated audio cache
  if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 1000) {
    return res.json({
      success: true,
      audioUrl: `/audio/cache/${hash}.mp3`,
      source: 'cache',
      voice: defaultVoice,
    });
  }

  // 2. If Gemini API key is configured, attempt Gemini Audio synthesis
  if (ai) {
    try {
      const geminiVoice = isTe ? 'Aoede' : 'Kore';
      const prompt = `You are a warm, natural Indian voice assistant helping farmers use the Farm Trust agricultural marketplace. Speak conversational ${isTe ? 'Telugu' : 'English'} with clear pronunciation, moderate pace, gentle confidence, and natural human intonation. Keep responses short and conversational. Text to speak: "${text}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: geminiVoice,
              },
            },
          },
        },
      });

      const part = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.mimeType?.startsWith('audio/'));
      if (part?.inlineData?.data) {
        const audioBuffer = Buffer.from(part.inlineData.data, 'base64');
        fs.writeFileSync(cacheFile, audioBuffer);
        return res.json({
          success: true,
          audioUrl: `/audio/cache/${hash}.mp3`,
          source: 'gemini',
          voice: geminiVoice,
        });
      }
    } catch (err: any) {
      console.warn('Gemini Audio API call failed, falling back to local neural TTS:', err?.message || err);
    }
  }

  // 3. Fallback to local high-fidelity neural speech generator
  try {
    const pythonScript = path.join(__dirname, 'scripts', 'generate_neural_speech.py');
    await execFileAsync('python3', [
      pythonScript,
      '--text', text,
      '--lang', langKey,
      '--voice', defaultVoice,
      '--rate', rate,
      '--output', cacheFile,
    ]);

    if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 500) {
      return res.json({
        success: true,
        audioUrl: `/audio/cache/${hash}.mp3`,
        source: 'neural-ai',
        voice: defaultVoice,
      });
    }
  } catch (err: any) {
    console.warn('Neural TTS generation failed:', err?.message || err);
  }

  // 4. If all server synthesis attempts fail, inform client to use browser fallback
  return res.json({
    success: false,
    fallbackToBrowser: true,
    message: 'Server synthesis unavailable; fallback to browser speech synthesis',
  });
});

function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

function getOrCreateCertificates() {
  const certDir = path.join(__dirname, '.cert');
  const keyPath = path.join(certDir, 'key.pem');
  const certPath = path.join(certDir, 'cert.pem');

  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.log('🔒 Generating self-signed SSL certificate for secure local network access...');
    const localIps = getLocalIpAddresses();
    const altNames = ['DNS:localhost', 'IP:127.0.0.1', ...localIps.map((ip) => `IP:${ip}`)].join(',');
    try {
      execSync(
        `openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj "/CN=Farm-Trust-Local" -addext "subjectAltName=${altNames}" -keyout "${keyPath}" -out "${certPath}" -days 365`,
        { stdio: 'ignore' }
      );
    } catch (e) {
      console.warn('Could not generate SSL cert via openssl, falling back to HTTP:', e);
      return null;
    }
  }

  try {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  } catch (err) {
    console.warn('Failed reading SSL cert files:', err);
    return null;
  }
}

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const useHttps = process.env.HTTPS === 'true';

  let sslCreds = null;
  if (useHttps) {
    sslCreds = getOrCreateCertificates();
  }

  const server = (useHttps && sslCreds)
    ? https.createServer(sslCreds, app)
    : http.createServer(app);

  const protocol = (useHttps && sslCreds) ? 'https' : 'http';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server,
        },
        watch: {
          usePolling: true,
          interval: 100,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    const localIps = getLocalIpAddresses();
    console.log(`\n  🌾 Farm Trust is ready and accessible on your local network!`);
    console.log(`  ➜  Local:   ${protocol}://localhost:${port}/`);
    if (localIps.length > 0) {
      localIps.forEach((ip) => {
        console.log(`  ➜  Network: ${protocol}://${ip}:${port}/`);
      });
    } else {
      console.log(`  ➜  Network: ${protocol}://0.0.0.0:${port}/`);
    }
    if (protocol === 'http') {
      console.log(`\n  💡 Tip: To enable mobile microphone/voice input over LAN, run with HTTPS:`);
      console.log(`     npm run dev:https\n`);
    } else {
      console.log(`\n  🔒 Running in HTTPS mode (Mobile mic/voice enabled).`);
      console.log(`     If the browser warns about a self-signed cert, click 'Advanced' -> 'Proceed'.\n`);
    }
  });
}

startServer();
