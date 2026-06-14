import fs from 'fs';
import path from 'path';

// Manual loader for env.local (which does not have a dot prefix)
function loadManualEnv() {
  const envPath = path.join(process.cwd(), 'env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const index = trimmed.indexOf('=');
      if (index === -1) continue;
      const key = trimmed.substring(0, index).trim();
      let val = trimmed.substring(index + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      // Only set if not already set by system environment
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadManualEnv();

// Synchronize GEMINI_API_KEY to GOOGLE_API_KEY if needed (the Vercel SDK looks for GOOGLE_API_KEY)
if (!process.env.GOOGLE_API_KEY && process.env.GEMINI_API_KEY) {
  process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
}
// Also make sure Vercel AI SDK gets the google key under its standard env name if it falls back
if (process.env.GOOGLE_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_API_KEY;
}
