import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { defineConfig, Plugin } from 'vite';

const execFileAsync = promisify(execFile);

function dynamicNeuralTtsPlugin(): Plugin {
  return {
    name: 'dynamic-neural-tts-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/tts/speak' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { text, language = 'te-IN', voiceGender = 'female' } = JSON.parse(body || '{}');
              if (!text || typeof text !== 'string') {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Text required' }));
              }

              const isTe = String(language).toLowerCase().startsWith('te');
              const langCode = isTe ? 'te-IN' : 'en-IN';
              const cleanText = text.trim();
              const hash = crypto
                .createHash('sha256')
                .update(langCode + ':' + voiceGender + ':' + cleanText.toLowerCase())
                .digest('hex')
                .slice(0, 16);

              const cacheDir = path.resolve('public/audio/cache');
              if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
              }

              const outFile = path.join(cacheDir, `${hash}.mp3`);
              const relUrl = `/audio/cache/${hash}.mp3`;

              if (fs.existsSync(outFile) && fs.statSync(outFile).size > 1000) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: true, audioUrl: relUrl, source: 'disk-cache' }));
              }

              // Synthesize on the fly using python3 scripts/generate_neural_speech.py
              await execFileAsync('python3', [
                'scripts/generate_neural_speech.py',
                '--text', cleanText,
                '--lang', langCode,
                '--gender', voiceGender,
                '--output', outFile,
              ]);

              if (fs.existsSync(outFile) && fs.statSync(outFile).size > 500) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: true, audioUrl: relUrl, source: 'dynamic-neural' }));
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, fallbackToBrowser: true }));
            } catch (err) {
              console.warn('[Vite Dev TTS Plugin Error]:', err);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, fallbackToBrowser: true }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), dynamicNeuralTtsPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || process.cwd(), '.'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'lucide-react'],
    },
    server: {
      hmr: false,
      watch: null,
    },
  };
});
