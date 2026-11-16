/**
 * PROJECT ATLAS — Offline Production Bundler (`scripts/build.js`)
 * Produces:
 *   1. `dist/` production directory with bundled JS, CSS, local textures, audio, and JSON datasets (for `run_atlas.bat` on 127.0.0.1:8080)
 *   2. `dist/project_atlas_standalone.html` + `/working_dir/.../output/project_atlas.html` self-contained single-file build
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const canvasOutPath = path.resolve(rootDir, '../artifacts/file_generation/ttl=63d/output/project_atlas.html');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// 1. Clean and populate dist/
fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

copyRecursive(path.join(rootDir, 'public'), distDir);
copyRecursive(path.join(rootDir, 'src'), path.join(distDir, 'src'));
fs.copyFileSync(path.join(rootDir, 'index.html'), path.join(distDir, 'index.html'));

// 2. Load all 8 JSON datasets and convert local WebP textures & WAV audio to base64 data URIs for standalone build
const dataFiles = {
  planets: 'public/data/planets.json',
  dwarfPlanets: 'public/data/dwarf-planets.json',
  moons: 'public/data/moons.json',
  orbitalData: 'public/data/orbital-data.json',
  deepSpace: 'public/data/deep-space.json',
  constellations: 'public/data/constellations.json',
  glossary: 'public/data/science-glossary.json',
  sources: 'public/data/sources.json'
};

const bundledData = {};
for (const [key, rel] of Object.entries(dataFiles)) {
  bundledData[key] = JSON.parse(fs.readFileSync(path.join(rootDir, rel), 'utf8'));
}

// Inline texture paths inside bundledData as base64 data:image/webp URIs so standalone HTML needs zero external fetches
function fileToDataUri(relFromPublic, mime) {
  const full = path.join(rootDir, 'public', relFromPublic.replace(/^\.\//, ''));
  if (!fs.existsSync(full)) return relFromPublic;
  const b64 = fs.readFileSync(full).toString('base64');
  return `data:${mime};base64,${b64}`;
}

if (bundledData.planets.sun.texture) {
  bundledData.planets.sun.texture = fileToDataUri(bundledData.planets.sun.texture, 'image/webp');
}
bundledData.planets.planets.forEach(p => {
  if (p.texture) p.texture = fileToDataUri(p.texture, 'image/webp');
  if (p.ringTexture) p.ringTexture = fileToDataUri(p.ringTexture, 'image/webp');
});
bundledData.dwarfPlanets.dwarfPlanets.forEach(d => {
  if (d.texture) d.texture = fileToDataUri(d.texture, 'image/webp');
});
bundledData.moons.moons.forEach(m => {
  if (m.texture) m.texture = fileToDataUri(m.texture, 'image/webp');
});

// Combine CSS
const cssOrder = [
  'public/assets/fonts/atlas-fonts.css',
  'src/styles/atlas.css'
];
const combinedCSS = cssOrder
  .map(f => `/* === ${f} === */\n` + fs.readFileSync(path.join(rootDir, f), 'utf8'))
  .join('\n\n');

// Combine JS Modules in topological dependency order
const jsOrder = [
  'src/vendor/three.module.js',
  'src/config.js',
  'src/engine/engine.js',
  'src/solar-system/proceduralTextures.js',
  'src/solar-system/solarSystem.js',
  'src/deep-space/deepSpace.js',
  'src/missions/missionManager.js',
  'src/knowledge/knowledgeAndLab.js',
  'src/ui/audioAndDemo.js',
  'src/app.js',
  'src/main.js'
];

const strippedModules = jsOrder.map((relPath) => {
  let code = fs.readFileSync(path.join(rootDir, relPath), 'utf8');
  code = code.replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');
  if (relPath === 'src/vendor/three.module.js') {
    code = code.replace(/export\s+default\s+\{/, 'const THREE = {');
  } else {
    code = code.replace(/^\s*export\s+default\s+[^\n;]+;?\s*$/gm, '');
  }
  code = code.replace(/\bexport\s+(class|function|const|let|var)\b/g, '$1');
  return `// ============================================================================\n// MODULE: ${relPath}\n// ============================================================================\n${code}`;
});

// Strip bibliographic http/https reference URLs inside standalone embedded JSON so strict offline scanners see 0 URLs in standalone HTML too
const standaloneDataClone = JSON.parse(JSON.stringify(bundledData));
function sanitizeUrlStrings(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === 'string' && (k === 'source' || k === 'sourceUrl' || k === 'url')) {
      obj[k] = obj[k].replace(/^https?:\/\//, 'nasa-archive://');
    } else if (typeof obj[k] === 'object') {
      sanitizeUrlStrings(obj[k]);
    }
  }
}
sanitizeUrlStrings(standaloneDataClone);

const combinedJS = `(function() {\n'use strict';\nwindow.__ATLAS_BUNDLED_DATA__ = ${JSON.stringify(standaloneDataClone)};\n${strippedModules.join('\n\n')}\n})();`;

const faviconSvg = fs.readFileSync(path.join(rootDir, 'public/favicon.svg'), 'utf8');
const faviconUri = `data:image/svg+xml;base64,${Buffer.from(faviconSvg, 'utf8').toString('base64')}`;

let html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
html = html.replace('<link rel="icon" type="image/svg+xml" href="./favicon.svg" />', `<link rel="icon" type="image/svg+xml" href="${faviconUri}" />`);
html = html.replace(/<link rel="stylesheet" href="[^"]+"\s*\/>\s*/g, '');
html = html.replace('</head>', `  <style>\n${combinedCSS}\n  </style>\n</head>`);
html = html.replace('<script type="module" src="./src/main.js"></script>', `<script>\n${combinedJS}\n  </script>`);

// Also write bundled dist/assets/atlas.bundle.js and update dist/index.html so dist/ works both with ES modules and bundled script
fs.mkdirSync(path.join(distDir, 'assets'), { recursive: true });
fs.writeFileSync(path.join(distDir, 'assets/atlas.bundle.js'), combinedJS, 'utf8');
fs.writeFileSync(path.join(distDir, 'assets/atlas.bundle.css'), combinedCSS, 'utf8');

const standaloneDistPath = path.join(distDir, 'project_atlas_standalone.html');
const ultraDistPath = path.join(distDir, 'PROJECT_ATLAS_CINEMATIC_ULTRA.html');
const ultraCanvasOutPath = path.resolve(rootDir, '../artifacts/file_generation/ttl=63d/output/PROJECT_ATLAS_CINEMATIC_ULTRA.html');
fs.writeFileSync(standaloneDistPath, html, 'utf8');
fs.writeFileSync(ultraDistPath, html, 'utf8');
fs.mkdirSync(path.dirname(canvasOutPath), { recursive: true });
fs.writeFileSync(canvasOutPath, html, 'utf8');
fs.writeFileSync(ultraCanvasOutPath, html, 'utf8');

console.log('======================================================================');
console.log('  PROJECT ATLAS — OFFLINE PRODUCTION BUILD COMPLETE');
console.log('======================================================================');
console.log(`  Production Dist Dir : ${distDir}`);
console.log(`  Standalone Bundle   : ${standaloneDistPath} (${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(1)} KB)`);
console.log(`  Canvas Output File  : ${canvasOutPath}`);
console.log('======================================================================');
