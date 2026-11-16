/**
 * PROJECT ATLAS — Application Entry Point (`src/main.js`)
 */
import { AtlasApp } from './app.js';

function bootAtlas() {
  if (window.__ATLAS_APP__) return;
  const app = new AtlasApp();
  window.__ATLAS_APP__ = app;
  app.init().catch((err) => {
    console.error('ATLAS Initialization Error:', err);
  });
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootAtlas, { once: true });
} else {
  bootAtlas();
}
