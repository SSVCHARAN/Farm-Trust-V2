import fs from 'fs';
import path from 'path';

// Load static manifest from public cache directory or embedded fallback
let cachedManifest: Record<string, any> | null = null;

function getManifest(): Record<string, any> {
  if (cachedManifest) return cachedManifest;

  try {
    const manifestPath = path.join(process.cwd(), 'public', 'audio', 'cache', 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const data = fs.readFileSync(manifestPath, 'utf-8');
      cachedManifest = JSON.parse(data);
      return cachedManifest!;
    }
  } catch (err) {
    console.warn('[Vercel Serverless] Failed to read manifest.json from filesystem:', err);
  }

  return {};
}

function cleanText(text: string): string {
  return text
    .toLowerCase()
    .replace(/#?\s*ft-(\d+)/gi, 'order $1')
    .replace(/₹\s*(\d+)\s*\/\s*(?:kg|kilogram|కిలో|కేజీ)?/gi, '$1 rupees per kg')
    .replace(/₹\s*(\d+)/g, '$1 rupees')
    .replace(/(\d+)\s*(?:kg|కేజీ)/gi, '$1 kg')
    .replace(/[*#_~`\[\]()"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function handler(req: any, res: any) {
  // Set CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const manifest = getManifest();
    return res.status(200).json({
      status: 'ok',
      service: 'Farm Trust Neural TTS Serverless',
      indexedClips: Object.keys(manifest).length,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, language = 'te-IN' } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text input is required' });
    }

    const manifest = getManifest();
    const isTe = String(language).toLowerCase().startsWith('te');
    const langKey = isTe ? 'te-IN' : 'en-IN';
    const cleaned = cleanText(text);
    const normalizedTarget = cleaned.replace(/[^a-z0-9\u0C00-\u0C7F]/g, '');

    const extractNumbers = (str: string): number[] => {
      const matches = str.match(/\d+/g) || [];
      return matches.map(Number).sort((a, b) => a - b);
    };

    const targetNumbers = extractNumbers(cleaned);

    const extractProduce = (str: string): string => {
      const lower = str.toLowerCase();
      if (lower.includes('tomato') || lower.includes('టమాటా')) return 'tomato';
      if (lower.includes('onion') || lower.includes('ఉల్లి')) return 'onion';
      if (lower.includes('rice') || lower.includes('బియ్యం') || lower.includes('వరి')) return 'rice';
      if (lower.includes('chilli') || lower.includes('chili') || lower.includes('మిరప') || lower.includes('మిర్చి')) return 'chilli';
      if (lower.includes('mango') || lower.includes('మామిడి')) return 'mango';
      if (lower.includes('milk') || lower.includes('పాలు')) return 'milk';
      if (lower.includes('ghee') || lower.includes('నెయ్యి')) return 'ghee';
      if (lower.includes('okra') || lower.includes('బెండ')) return 'okra';
      if (lower.includes('potato') || lower.includes('బంగాళాదుంప')) return 'potato';
      return '';
    };

    const targetProduce = extractProduce(cleaned);

    // 1. Direct or normalized match in pre-rendered static clips
    for (const item of Object.values(manifest)) {
      if (item.url && item.lang === langKey) {
        const itemClean = cleanText(item.text || item.cleaned || '');
        const candidateNumbers = extractNumbers(itemClean);

        if (targetNumbers.length > 0 || candidateNumbers.length > 0) {
          if (targetNumbers.length !== candidateNumbers.length) continue;
          if (!targetNumbers.every((val, idx) => val === candidateNumbers[idx])) continue;
        }

        if (targetProduce && extractProduce(itemClean) !== targetProduce) continue;

        const itemNorm = itemClean.replace(/[^a-z0-9\u0C00-\u0C7F]/g, '');

        if (itemNorm === normalizedTarget || (itemNorm.length > 8 && (itemNorm.includes(normalizedTarget) || normalizedTarget.includes(itemNorm)))) {
          return res.status(200).json({
            success: true,
            audioUrl: item.url,
            source: 'serverless-cache',
            voice: item.voice,
          });
        }
      }
    }

    // 2. Token overlap similarity
    const targetTokens = new Set(
      cleaned
        .replace(/[^a-z0-9\u0C00-\u0C7F\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 2)
    );

    let bestMatch: any = null;
    let highestScore = 0;

    for (const item of Object.values(manifest)) {
      if (item.url && item.lang === langKey) {
        const itemClean = cleanText(item.text || item.cleaned || '');
        const candidateNumbers = extractNumbers(itemClean);

        if (targetNumbers.length > 0 || candidateNumbers.length > 0) {
          if (targetNumbers.length !== candidateNumbers.length) continue;
          if (!targetNumbers.every((val, idx) => val === candidateNumbers[idx])) continue;
        }

        if (targetProduce && extractProduce(itemClean) !== targetProduce) continue;

        const candidateTokens = itemClean
          .replace(/[^a-z0-9\u0C00-\u0C7F\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 2);

        if (candidateTokens.length < 2) continue;

        let intersection = 0;
        for (const tok of candidateTokens) {
          if (targetTokens.has(tok)) intersection++;
        }

        const score = intersection / Math.max(targetTokens.size, candidateTokens.length);
        if (score > 0.6 && score > highestScore) {
          highestScore = score;
          bestMatch = item;
        }
      }
    }

    if (bestMatch) {
      return res.status(200).json({
        success: true,
        audioUrl: bestMatch.url,
        source: 'serverless-fuzzy-cache',
        voice: bestMatch.voice,
      });
    }

    // 3. Graceful fallback (NEVER 404 on Vercel)
    return res.status(200).json({
      success: false,
      fallbackToBrowser: true,
      message: 'Phrase not in serverless static cache; using client synthesis fallback',
    });
  } catch (err: any) {
    console.error('[Vercel Serverless TTS Error]:', err);
    return res.status(200).json({
      success: false,
      fallbackToBrowser: true,
      error: err?.message || 'Serverless TTS error',
    });
  }
}
