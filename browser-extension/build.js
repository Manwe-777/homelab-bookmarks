#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, 'dist');

// Load .env from root
function loadEnv() {
  const envPath = join(__dirname, '..', '.env');
  try {
    const content = readFileSync(envPath, 'utf-8');
    const env = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnv();
const collectorUrl = env.COLLECTOR_URL || 'http://server.local:3100';

console.log(`Building extension with COLLECTOR_URL=${collectorUrl}`);

// Create dist directory
mkdirSync(distDir, { recursive: true });

// Copy static files
const staticFiles = ['manifest.json', 'options.html', 'popup.html', 'popup.css', 'icon.svg'];
for (const file of staticFiles) {
  cpSync(join(__dirname, file), join(distDir, file));
}

// Copy icons if they exist
try {
  cpSync(join(__dirname, 'icon48.png'), join(distDir, 'icon48.png'));
  cpSync(join(__dirname, 'icon128.png'), join(distDir, 'icon128.png'));
} catch {
  // Icons don't exist yet, skip
}

// Process background.js - replace default URL
let backgroundJs = readFileSync(join(__dirname, 'background.js'), 'utf-8');
backgroundJs = backgroundJs.replace(
  /const DEFAULT_COLLECTOR_URL = '[^']+'/,
  `const DEFAULT_COLLECTOR_URL = '${collectorUrl}'`
);
writeFileSync(join(distDir, 'background.js'), backgroundJs);

// Process options.js - replace default URL
let optionsJs = readFileSync(join(__dirname, 'options.js'), 'utf-8');
optionsJs = optionsJs.replace(
  /collectorUrl \|\| '[^']+'/,
  `collectorUrl || '${collectorUrl}'`
);
writeFileSync(join(distDir, 'options.js'), optionsJs);

// Process popup.js - replace default URL
let popupJs = readFileSync(join(__dirname, 'popup.js'), 'utf-8');
popupJs = popupJs.replace(
  /const DEFAULT_URL = '[^']+'/,
  `const DEFAULT_URL = '${collectorUrl}'`
);
writeFileSync(join(distDir, 'popup.js'), popupJs);

// Update manifest - keep <all_urls> for flexibility
let manifest = JSON.parse(readFileSync(join(distDir, 'manifest.json'), 'utf-8'));
writeFileSync(join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Update options.html placeholder
let optionsHtml = readFileSync(join(distDir, 'options.html'), 'utf-8');
optionsHtml = optionsHtml.replace(
  /placeholder="[^"]+"/,
  `placeholder="${collectorUrl}"`
);
writeFileSync(join(distDir, 'options.html'), optionsHtml);

// Update popup.html placeholder
let popupHtml = readFileSync(join(distDir, 'popup.html'), 'utf-8');
popupHtml = popupHtml.replace(
  /placeholder="[^"]+"/,
  `placeholder="${collectorUrl}"`
);
writeFileSync(join(distDir, 'popup.html'), popupHtml);

console.log(`Extension built to ${distDir}`);
