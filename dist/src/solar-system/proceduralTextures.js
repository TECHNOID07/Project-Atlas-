/**
 * PROJECT ATLAS — Ultra-Detail Procedural Celestial Texture Synthesizer (`src/solar-system/proceduralTextures.js`)
 * Generates high-definition equirectangular CanvasTextures 100% offline with adaptive resolution
 * (256px LOW, 512px MEDIUM, 1024px HIGH) for the Sun, 8 Planets, Saturn's Rings, 5 Dwarf Planets, and 18 Moons.
 */
import THREE from '../vendor/three.module.js';

function hash2D(x, y, seed = 1) {
  const h = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return h - Math.floor(h);
}

function valueNoise(x, y, seed = 1) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3.0 - 2.0 * xf);
  const v = yf * yf * (3.0 - 2.0 * yf);
  const a = hash2D(xi, yi, seed);
  const b = hash2D(xi + 1, yi, seed);
  const c = hash2D(xi, yi + 1, seed);
  const d = hash2D(xi + 1, yi + 1, seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

function fbm(x, y, octaves = 4, seed = 1) {
  let val = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    val += amp * valueNoise(x * freq, y * freq, seed + i * 17);
    freq *= 2.02;
    amp *= 0.5;
  }
  return val;
}

export class ProceduralTextureFactory {
  constructor() {
    this.cache = new Map();
  }

  clearCache() {
    this.cache.clear();
  }

  getBodyTexture(id, width = 512) {
    const key = `${id}_${width}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const w = width;
    const h = Math.max(128, Math.floor(width / 2));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    switch (id) {
      case 'sun':
        this._drawSunGranulation(ctx, w, h);
        break;
      case 'mercury':
        this._drawMercurySurface(ctx, w, h);
        break;
      case 'venus':
        this._drawVenusClouds(ctx, w, h);
        break;
      case 'earth':
        this._drawEarthSurface(ctx, w, h);
        break;
      case 'earth_clouds':
        this._drawEarthClouds(ctx, w, h);
        break;
      case 'mars':
        this._drawMarsSurface(ctx, w, h);
        break;
      case 'jupiter':
        this._drawJupiterAtmosphere(ctx, w, h);
        break;
      case 'saturn':
        this._drawSaturnAtmosphere(ctx, w, h);
        break;
      case 'saturn_rings':
        return this._buildSaturnRingsTexture(width);
      case 'uranus':
        this._drawUranusAtmosphere(ctx, w, h);
        break;
      case 'neptune':
        this._drawNeptuneAtmosphere(ctx, w, h);
        break;
      case 'pluto':
        this._drawPlutoSurface(ctx, w, h);
        break;
      case 'ceres':
        this._drawCeresSurface(ctx, w, h);
        break;
      case 'haumea':
        this._drawRockyIcyWorld(ctx, w, h, [212, 220, 228], [168, 178, 188], [195, 75, 55], 31, true);
        break;
      case 'makemake':
        this._drawRockyIcyWorld(ctx, w, h, [202, 132, 92], [152, 88, 56], [235, 182, 145], 37, false);
        break;
      case 'eris':
        this._drawRockyIcyWorld(ctx, w, h, [228, 234, 242], [182, 192, 204], [250, 252, 255], 43, false);
        break;
      case 'moon':
        this._drawLunarSurface(ctx, w, h);
        break;
      case 'io':
        this._drawIoVolcanicSurface(ctx, w, h);
        break;
      case 'europa':
        this._drawEuropaLineaeSurface(ctx, w, h);
        break;
      case 'ganymede':
        this._drawGanymedeSurface(ctx, w, h);
        break;
      case 'callisto':
        this._drawCallistoSurface(ctx, w, h);
        break;
      case 'titan':
        this._drawTitanAtmosphere(ctx, w, h);
        break;
      case 'enceladus':
        this._drawEnceladusSurface(ctx, w, h);
        break;
      case 'triton':
        this._drawTritonSurface(ctx, w, h);
        break;
      case 'charon':
        this._drawCharonSurface(ctx, w, h);
        break;
      case 'iapetus':
        this._drawIapetusSurface(ctx, w, h);
        break;
      default:
        this._drawRockyIcyWorld(ctx, w, h, [185, 190, 198], [135, 140, 148], [225, 230, 238], id.length * 13, false);
        break;
    }

    const tex = new THREE.CanvasTexture(canvas);
    this.cache.set(key, tex);
    return tex;
  }

  _drawSunGranulation(ctx, w, h) {
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;
    for (let y = 0; y < h; y++) {
      const v = y / h;
      const latFactor = Math.sin(v * Math.PI);
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const gran = fbm(u * 28.0, v * 14.0, 4, 101);
        const superGran = fbm(u * 8.0 + gran * 0.35, v * 4.0, 3, 202);
        const flare = Math.pow(Math.max(0, superGran), 2.2);
        const idx = (y * w + x) * 4;
        // Multi-toned solar granulation: deep orange -> golden -> yellow -> white-hot active regions
        d[idx] = Math.min(255, Math.floor(225 + 30 * gran));
        d[idx + 1] = Math.min(255, Math.floor(95 + 115 * gran + 55 * flare * latFactor));
        d[idx + 2] = Math.min(255, Math.floor(10 + 65 * gran * gran + 145 * flare));
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Add active sunspot groups & bright faculae rings
    const spots = [
      [0.22, 0.38, 12], [0.25, 0.40, 7], [0.58, 0.62, 14],
      [0.61, 0.60, 8], [0.79, 0.36, 10], [0.41, 0.56, 9]
    ];
    spots.forEach(([ux, vy, rBase]) => {
      const cx = ux * w, cy = vy * h, r = (rBase / 512) * w;
      const grad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 2.2);
      grad.addColorStop(0, 'rgba(35, 12, 0, 0.92)');
      grad.addColorStop(0.45, 'rgba(130, 45, 5, 0.78)');
      grad.addColorStop(0.75, 'rgba(255, 245, 190, 0.55)');
      grad.addColorStop(1, 'rgba(255, 180, 40, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  _drawMercurySurface(ctx, w, h) {
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;
    for (let y = 0; y < h; y++) {
      const v = y / h;
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const n = fbm(u * 14.0, v * 7.0, 4, 11);
        const fine = fbm(u * 42.0, v * 21.0, 3, 29);
        const val = 98 + 62 * n + 26 * fine;
        const idx = (y * w + x) * 4;
        d[idx] = Math.min(255, Math.floor(val * 1.02));
        d[idx + 1] = Math.min(255, Math.floor(val * 0.98));
        d[idx + 2] = Math.min(255, Math.floor(val * 0.93));
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Caloris Basin & rayed craters + lobate scarps
    this._addCratersAndRays(ctx, w, h, 85, 17, [75, 72, 68], [185, 180, 172], true);
  }

  _drawVenusClouds(ctx, w, h) {
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;
    for (let y = 0; y < h; y++) {
      const v = y / h;
      const lat = (v - 0.5) * 2.0;
      for (let x = 0; x < w; x++) {
        const u = x / w;
        // Characteristic V-shaped chevron sulfuric acid cloud waves
        const chevron = Math.sin((u * 6.283 + Math.abs(lat) * 2.6) * 2.0) * 0.5 + 0.5;
        const swirl = fbm(u * 10.0 + chevron * 0.45, v * 8.0, 4, 33);
        const band = Math.cos(lat * Math.PI * 3.5) * 0.5 + 0.5;
        const mix = 0.45 * swirl + 0.35 * chevron + 0.20 * band;
        const idx = (y * w + x) * 4;
        d[idx] = Math.min(255, Math.floor(195 + 52 * mix));
        d[idx + 1] = Math.min(255, Math.floor(142 + 68 * mix));
        d[idx + 2] = Math.min(255, Math.floor(68 + 64 * mix));
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  _drawEarthSurface(ctx, w, h) {
    // Deep ocean bathymetries
    for (let y = 0; y < h; y++) {
      const v = y / h;
      const eq = 1.0 - Math.abs(v - 0.5) * 2.0;
      const r = Math.floor(10 + 18 * eq);
      const g = Math.floor(48 + 52 * eq);
      const b = Math.floor(125 + 68 * eq);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, y, w, 1);
    }

    // Recognizable Continental Landmasses (North/South America, Eurasia, Africa, Australia)
    const continents = [
      // North America
      { cx: 0.20, cy: 0.30, rx: 0.11, ry: 0.13, biome: 'temperate' },
      { cx: 0.25, cy: 0.42, rx: 0.05, ry: 0.06, biome: 'forest' },
      // South America
      { cx: 0.31, cy: 0.64, rx: 0.065, ry: 0.16, biome: 'rainforest' },
      // Africa
      { cx: 0.53, cy: 0.46, rx: 0.085, ry: 0.10, biome: 'desert' },
      { cx: 0.55, cy: 0.62, rx: 0.065, ry: 0.12, biome: 'savanna' },
      // Europe
      { cx: 0.52, cy: 0.27, rx: 0.07, ry: 0.07, biome: 'temperate' },
      // Asia
      { cx: 0.70, cy: 0.30, rx: 0.15, ry: 0.13, biome: 'steppe' },
      { cx: 0.76, cy: 0.44, rx: 0.08, ry: 0.08, biome: 'forest' },
      // Australia
      { cx: 0.83, cy: 0.69, rx: 0.06, ry: 0.06, biome: 'desert' }
    ];

    const biomePalette = {
      temperate: [[42, 118, 52], [78, 138, 65]],
      forest: [[28, 98, 42], [46, 122, 55]],
      rainforest: [[22, 108, 45], [38, 135, 58]],
      desert: [[198, 168, 108], [168, 135, 82]],
      savanna: [[98, 132, 56], [142, 148, 72]],
      steppe: [[112, 128, 76], [148, 138, 96]]
    };

    continents.forEach((c, idx) => {
      const cols = biomePalette[c.biome] || biomePalette.temperate;
      for (let i = 0; i < 48; i++) {
        const ang = (i / 48) * Math.PI * 2;
        const radJitter = 0.4 + 0.65 * hash2D(i, idx, 77);
        const px = (c.cx + Math.cos(ang) * c.rx * radJitter * 0.75) * w;
        const py = (c.cy + Math.sin(ang) * c.ry * radJitter * 0.75) * h;
        const rw = (0.018 + 0.032 * hash2D(idx, i, 91)) * w;
        const rh = (0.018 + 0.032 * hash2D(i, idx, 103)) * h;

        // Shallow turquoise coastal shelf
        ctx.fillStyle = 'rgba(28, 142, 178, 0.32)';
        ctx.beginPath();
        ctx.ellipse(px, py, rw * 1.28, rh * 1.28, ang * 0.3, 0, Math.PI * 2);
        ctx.fill();

        const col = i % 2 === 0 ? cols[0] : cols[1];
        ctx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, 0.88)`;
        ctx.beginPath();
        ctx.ellipse(px, py, rw, rh, ang * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Arctic & Antarctic Polar Ice Caps with jagged edges
    for (let x = 0; x < w; x += 3) {
      const u = x / w;
      const nTop = 8 + Math.floor(10 * fbm(u * 12, 0.1, 3, 55));
      const nBot = 14 + Math.floor(12 * fbm(u * 12, 0.9, 3, 66));
      ctx.fillStyle = 'rgba(242, 248, 255, 0.95)';
      ctx.fillRect(x, 0, 4, nTop);
      ctx.fillRect(x, h - nBot, 4, nBot);
    }
  }

  _drawEarthClouds(ctx, w, h) {
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;
    for (let y = 0; y < h; y++) {
      const v = y / h;
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const swirl = fbm(u * 12.0 + Math.sin(v * 9.0) * 0.25, v * 6.0, 4, 404);
        const alpha = Math.max(0, Math.min(210, Math.floor((swirl - 0.46) * 520)));
        const idx = (y * w + x) * 4;
        d[idx] = 250;
        d[idx + 1] = 253;
        d[idx + 2] = 255;
        d[idx + 3] = alpha;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  _drawMarsSurface(ctx, w, h) {
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;
    for (let y = 0; y < h; y++) {
      const v = y / h;
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const base = fbm(u * 10.0, v * 5.0, 4, 51);
        const darkAlbedo = fbm(u * 5.0 + 1.2, v * 3.5, 3, 88);
        const isBasalt = darkAlbedo > 0.58 ? (darkAlbedo - 0.58) * 2.2 : 0;
        const r = Math.floor((188 + 52 * base) * (1 - 0.38 * isBasalt));
        const g = Math.floor((82 + 38 * base) * (1 - 0.42 * isBasalt));
        const b = Math.floor((48 + 25 * base) * (1 - 0.35 * isBasalt));
        const idx = (y * w + x) * 4;
        d[idx] = Math.max(0, Math.min(255, r));
        d[idx + 1] = Math.max(0, Math.min(255, g));
        d[idx + 2] = Math.max(0, Math.min(255, b));
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Valles Marineris canyon scar & Tharsis volcanoes (Olympus Mons)
    ctx.strokeStyle = 'rgba(78, 28, 16, 0.78)';
    ctx.lineWidth = Math.max(2, w / 160);
    ctx.beginPath();
    ctx.moveTo(w * 0.38, h * 0.52);
    ctx.bezierCurveTo(w * 0.44, h * 0.54, w * 0.50, h * 0.51, w * 0.56, h * 0.53);
    ctx.stroke();

    // Tharsis volcanic calderas
    [[0.26, 0.42, 12], [0.31, 0.46, 8], [0.33, 0.50, 8], [0.35, 0.54, 8]].forEach(([ux, vy, r]) => {
      const rad = (r / 512) * w;
      ctx.fillStyle = 'rgba(115, 42, 24, 0.68)';
      ctx.beginPath();
      ctx.arc(ux * w, vy * h, rad, 0, Math.PI * 2);
      ctx.fill();
    });

    this._addCratersAndRays(ctx, w, h, 45, 62, [118, 46, 26], [228, 128, 86], false);

    // North & South CO2 / Water Ice Polar Caps
    ctx.fillStyle = 'rgba(248, 245, 242, 0.92)';
    ctx.fillRect(0, 0, w, Math.max(5, Math.floor(h * 0.045)));
    ctx.fillRect(0, h - Math.max(5, Math.floor(h * 0.04)), w, Math.max(5, Math.floor(h * 0.04)));
  }

  _drawJupiterAtmosphere(ctx, w, h) {
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;
    // Rich alternating zones (cream/ivory) and belts (rust/ochre/sienna/slate)
    const palette = [
      [148, 126, 106], [225, 206, 178], [176, 112, 72], [238, 224, 198],
      [158, 92, 56],   [234, 212, 182], [192, 128, 84], [242, 228, 204],
      [142, 84, 52],   [228, 204, 172], [168, 122, 92], [132, 118, 104]
    ];

    for (let y = 0; y < h; y++) {
      const v = y / h;
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const turb = (fbm(u * 18.0, v * 24.0, 4, 71) - 0.5) * 0.045;
        const festoon = Math.sin(u * Math.PI * 22.0 + v * 40.0) * 0.008;
        const bandPos = Math.max(0, Math.min(0.999, v + turb + festoon)) * (palette.length - 1);
        const idx0 = Math.floor(bandPos);
        const frac = bandPos - idx0;
        const c0 = palette[idx0];
        const c1 = palette[Math.min(palette.length - 1, idx0 + 1)];
        const idx = (y * w + x) * 4;
        d[idx] = Math.floor(c0[0] * (1 - frac) + c1[0] * frac);
        d[idx + 1] = Math.floor(c0[1] * (1 - frac) + c1[1] * frac);
        d[idx + 2] = Math.floor(c0[2] * (1 - frac) + c1[2] * frac);
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Prominent Great Red Spot with concentric anticyclonic eyewall & white ovals
    const grsX = w * 0.62, grsY = h * 0.64;
    const rx = w * 0.068, ry = h * 0.065;
    ctx.save();
    ctx.translate(grsX, grsY);
    const rings = [
      [1.25, 'rgba(238, 222, 198, 0.65)'],
      [1.0,  'rgba(198, 68, 38, 0.95)'],
      [0.75, 'rgba(224, 96, 56, 0.95)'],
      [0.45, 'rgba(172, 48, 26, 0.95)']
    ];
    rings.forEach(([scale, col]) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * scale, ry * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  _drawSaturnAtmosphere(ctx, w, h) {
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;
    for (let y = 0; y < h; y++) {
      const v = y / h;
      const poleDark = Math.pow(Math.abs(v - 0.5) * 2.0, 2.4);
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const wave = fbm(u * 12.0, v * 18.0, 3, 81) * 0.025;
        const b1 = Math.sin((v + wave) * Math.PI * 22.0) * 0.5 + 0.5;
        const b2 = Math.cos((v + wave) * Math.PI * 9.0) * 0.5 + 0.5;
        const mix = 0.6 * b1 + 0.4 * b2;
        const r = Math.floor((208 + 38 * mix) * (1 - 0.28 * poleDark));
        const g = Math.floor((182 + 42 * mix) * (1 - 0.25 * poleDark));
        const b = Math.floor((128 + 38 * mix) * (1 - 0.15 * poleDark));
        const idx = (y * w + x) * 4;
        d[idx] = r;
        d[idx + 1] = g;
        d[idx + 2] = b;
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  _buildSaturnRingsTexture(width = 512) {
    const w = Math.max(512, width);
    const h = 64;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Ring Geometry maps UV.x from 0 (inner radius) to 1 (outer radius)
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1);
      let r = 225, g = 205, b = 170, alpha = 0;
      const micro = Math.sin(u * 620.0) * 0.5 + 0.5;
      const fine = Math.cos(u * 1450.0) * 0.5 + 0.5;

      if (u >= 0.02 && u < 0.12) {
        // D Ring (faint innermost dusty ring)
        r = 165; g = 152; b = 132;
        alpha = 0.14 + 0.08 * micro;
      } else if (u >= 0.12 && u < 0.28) {
        // C Ring (Crepe Ring - semi-transparent slate/amber ice)
        r = 188; g = 172; b = 148;
        alpha = 0.32 + 0.16 * micro;
        if (Math.abs(u - 0.24) < 0.008) alpha = 0.05; // Maxwell Gap
      } else if (u >= 0.28 && u < 0.60) {
        // B Ring (brightest, densest multi-ringlet water ice)
        r = Math.floor(232 + 20 * micro);
        g = Math.floor(214 + 22 * fine);
        b = Math.floor(178 + 24 * micro);
        alpha = 0.78 + 0.20 * (0.6 * micro + 0.4 * fine);
      } else if (u >= 0.60 && u < 0.665) {
        // Cassini Division (4,590 km resonant gap)
        r = 85; g = 78; b = 68;
        alpha = 0.04 + 0.03 * micro;
      } else if (u >= 0.665 && u < 0.91) {
        // A Ring (bright outer ring with Encke & Keeler gaps)
        r = Math.floor(218 + 18 * micro);
        g = Math.floor(202 + 18 * micro);
        b = Math.floor(172 + 18 * micro);
        alpha = 0.62 + 0.16 * fine;
        if (Math.abs(u - 0.835) < 0.011) alpha = 0.03; // Encke Gap
        if (Math.abs(u - 0.902) < 0.004) alpha = 0.02; // Keeler Gap
      } else if (u >= 0.945 && u <= 0.972) {
        // F Ring (narrow braided shepherd ring)
        r = 242; g = 230; b = 204;
        alpha = 0.68 * Math.sin(((u - 0.945) / 0.027) * Math.PI);
      }

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
      ctx.fillRect(x, 0, 1, h);
    }

    const tex = new THREE.CanvasTexture(canvas);
    this.cache.set(`saturn_rings_${width}`, tex);
    return tex;
  }

  _drawUranusAtmosphere(ctx, w, h) {
    for (let y = 0; y < h; y++) {
      const v = y / h;
      const band = Math.sin(v * Math.PI * 10.0) * 0.5 + 0.5;
      const polarHaze = Math.pow(Math.max(0, 1.0 - v * 2.2), 1.8);
      const r = Math.floor(118 + 22 * band + 42 * polarHaze);
      const g = Math.floor(216 + 18 * band + 24 * polarHaze);
      const b = Math.floor(236 + 14 * band + 14 * polarHaze);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, y, w, 1);
    }
  }

  _drawNeptuneAtmosphere(ctx, w, h) {
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;
    for (let y = 0; y < h; y++) {
      const v = y / h;
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const streak = fbm(u * 16.0, v * 28.0, 3, 99);
        const band = Math.cos(v * Math.PI * 14.0) * 0.5 + 0.5;
        const idx = (y * w + x) * 4;
        d[idx] = Math.floor(28 + 38 * band + 25 * streak);
        d[idx + 1] = Math.floor(68 + 56 * band + 38 * streak);
        d[idx + 2] = Math.floor(185 + 48 * band + 22 * streak);
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Great Dark Spot & high-altitude white methane cirrus companion clouds
    ctx.fillStyle = 'rgba(14, 32, 108, 0.85)';
    ctx.beginPath();
    ctx.ellipse(w * 0.46, h * 0.60, w * 0.055, h * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(235, 248, 255, 0.78)';
    ctx.beginPath();
    ctx.ellipse(w * 0.47, h * 0.56, w * 0.048, h * 0.012, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawPlutoSurface(ctx, w, h) {
    this._drawRockyIcyWorld(ctx, w, h, [198, 166, 136], [96, 56, 38], [232, 212, 188], 111, false);
    // Bright nitrogen-ice heart: Tombaugh Regio / Sputnik Planitia
    ctx.fillStyle = 'rgba(246, 238, 226, 0.92)';
    ctx.beginPath();
    ctx.ellipse(w * 0.48, h * 0.52, w * 0.075, h * 0.11, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.55, h * 0.50, w * 0.065, h * 0.09, 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawCeresSurface(ctx, w, h) {
    this._drawRockyIcyWorld(ctx, w, h, [122, 118, 114], [88, 84, 80], [162, 158, 152], 121, true);
    // Occator Crater bright sodium carbonate faculae (Cerealia & Vinalia Faculae)
    ctx.fillStyle = 'rgba(245, 250, 255, 0.96)';
    ctx.beginPath();
    ctx.arc(w * 0.52, h * 0.46, Math.max(3, w * 0.012), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(220, 238, 255, 0.75)';
    ctx.beginPath();
    ctx.arc(w * 0.54, h * 0.46, Math.max(2, w * 0.007), 0, Math.PI * 2);
    ctx.fill();
  }

  _drawLunarSurface(ctx, w, h) {
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;
    for (let y = 0; y < h; y++) {
      const v = y / h;
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const highlands = fbm(u * 12.0, v * 6.0, 4, 131);
        const maria = fbm(u * 4.5 + 2.1, v * 3.0, 3, 141);
        const isMare = maria > 0.54 ? (maria - 0.54) * 2.3 : 0;
        const val = Math.floor((158 + 58 * highlands) * (1 - 0.45 * isMare));
        const idx = (y * w + x) * 4;
        d[idx] = val;
        d[idx + 1] = val;
        d[idx + 2] = Math.min(255, val + 4);
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    this._addCratersAndRays(ctx, w, h, 90, 151, [82, 82, 86], [225, 225, 230], true);
  }

  _drawIoVolcanicSurface(ctx, w, h) {
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;
    for (let y = 0; y < h; y++) {
      const v = y / h;
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const n = fbm(u * 10.0, v * 5.0, 4, 161);
        const s = fbm(u * 22.0, v * 11.0, 3, 171);
        const idx = (y * w + x) * 4;
        d[idx] = Math.min(255, Math.floor(210 + 45 * n));
        d[idx + 1] = Math.min(255, Math.floor(135 + 95 * s));
        d[idx + 2] = Math.min(255, Math.floor(25 + 55 * (1 - n)));
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Volcanic calderas (Pele, Loki, Prometheus) with dark silicate lava centers & red sulfur halos
    [[0.32, 0.48], [0.58, 0.55], [0.74, 0.38], [0.18, 0.62]].forEach(([ux, vy]) => {
      const cx = ux * w, cy = vy * h, r = w * 0.045;
      ctx.strokeStyle = 'rgba(195, 48, 18, 0.72)';
      ctx.lineWidth = Math.max(2, w / 110);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(28, 22, 18, 0.92)';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  _drawEuropaLineaeSurface(ctx, w, h) {
    this._drawRockyIcyWorld(ctx, w, h, [226, 236, 245], [192, 208, 224], [245, 250, 255], 181, false);
    // Intersecting reddish-brown tectonic lineae fractures
    ctx.strokeStyle = 'rgba(156, 92, 64, 0.62)';
    ctx.lineWidth = Math.max(1.2, w / 280);
    for (let i = 0; i < 42; i++) {
      const x1 = hash2D(i, 1, 191) * w;
      const y1 = (0.12 + 0.76 * hash2D(i, 2, 191)) * h;
      const x2 = x1 + (hash2D(i, 3, 191) - 0.5) * w * 0.55;
      const y2 = y1 + (hash2D(i, 4, 191) - 0.5) * h * 0.45;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo((x1 + x2) * 0.5, y1 + (hash2D(i, 5, 191) - 0.5) * 40, x2, y2);
      ctx.stroke();
    }
  }

  _drawGanymedeSurface(ctx, w, h) {
    this._drawRockyIcyWorld(ctx, w, h, [148, 136, 122], [92, 82, 72], [208, 202, 194], 201, true);
  }

  _drawCallistoSurface(ctx, w, h) {
    this._drawRockyIcyWorld(ctx, w, h, [96, 88, 78], [64, 58, 52], [218, 214, 206], 211, false);
    // Valhalla multi-ring impact basin + bright ice-rimmed craters
    this._addCratersAndRays(ctx, w, h, 110, 221, [58, 52, 46], [235, 238, 245], true);
  }

  _drawTitanAtmosphere(ctx, w, h) {
    for (let y = 0; y < h; y++) {
      const v = y / h;
      const northHood = Math.pow(Math.max(0, 1.0 - v * 2.5), 2.0);
      const band = Math.sin(v * Math.PI * 8.0) * 0.5 + 0.5;
      const r = Math.floor(218 + 20 * band - 45 * northHood);
      const g = Math.floor(152 + 18 * band - 32 * northHood);
      const b = Math.floor(48 + 16 * band + 18 * northHood);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, y, w, 1);
    }
  }

  _drawEnceladusSurface(ctx, w, h) {
    this._drawRockyIcyWorld(ctx, w, h, [238, 246, 255], [212, 228, 245], [255, 255, 255], 231, false);
    // Blue-cyan South Polar "Tiger Stripes" (Alexandria, Cairo, Baghdad, Damascus Sulci)
    ctx.strokeStyle = 'rgba(42, 168, 235, 0.85)';
    ctx.lineWidth = Math.max(1.5, w / 220);
    for (let i = 0; i < 4; i++) {
      const y = h * (0.82 + i * 0.035);
      ctx.beginPath();
      ctx.moveTo(w * 0.25, y);
      ctx.bezierCurveTo(w * 0.42, y - 6, w * 0.58, y + 6, w * 0.75, y);
      ctx.stroke();
    }
  }

  _drawTritonSurface(ctx, w, h) {
    this._drawRockyIcyWorld(ctx, w, h, [216, 204, 202], [176, 162, 158], [242, 228, 224], 241, false);
    // Dark nitrogen geyser wind streaks across south polar cap
    ctx.fillStyle = 'rgba(68, 56, 58, 0.65)';
    for (let i = 0; i < 24; i++) {
      const x = (0.1 + 0.8 * hash2D(i, 1, 245)) * w;
      const y = (0.65 + 0.28 * hash2D(i, 2, 245)) * h;
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.025, h * 0.007, -0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawCharonSurface(ctx, w, h) {
    this._drawRockyIcyWorld(ctx, w, h, [154, 158, 164], [112, 116, 122], [198, 202, 208], 251, true);
    // Mordor Macula reddish-brown tholin north polar cap
    const grad = ctx.createLinearGradient(0, 0, 0, h * 0.22);
    grad.addColorStop(0, 'rgba(138, 62, 42, 0.88)');
    grad.addColorStop(1, 'rgba(138, 62, 42, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h * 0.22);
  }

  _drawIapetusSurface(ctx, w, h) {
    // Dramatic Cassini Regio dark leading hemisphere vs Roncevaux Terra bright trailing hemisphere
    this._drawRockyIcyWorld(ctx, w, h, [224, 228, 234], [188, 192, 198], [245, 248, 252], 261, true);
    ctx.fillStyle = 'rgba(42, 32, 26, 0.88)';
    ctx.beginPath();
    ctx.ellipse(w * 0.35, h * 0.50, w * 0.24, h * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawRockyIcyWorld(ctx, w, h, baseRgb, darkRgb, highlightRgb, seed, withCraters) {
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;
    for (let y = 0; y < h; y++) {
      const v = y / h;
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const n = fbm(u * 12.0, v * 6.0, 4, seed);
        const idx = (y * w + x) * 4;
        d[idx] = Math.floor(darkRgb[0] * (1 - n) + baseRgb[0] * n);
        d[idx + 1] = Math.floor(darkRgb[1] * (1 - n) + baseRgb[1] * n);
        d[idx + 2] = Math.floor(darkRgb[2] * (1 - n) + baseRgb[2] * n);
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    if (withCraters) {
      this._addCratersAndRays(ctx, w, h, 55, seed + 7, darkRgb, highlightRgb, false);
    }
  }

  _addCratersAndRays(ctx, w, h, count, seed, floorRgb, rimRgb, addRays = false) {
    for (let i = 0; i < count; i++) {
      const cx = hash2D(i, 1, seed) * w;
      const cy = (0.1 + 0.8 * hash2D(i, 2, seed)) * h;
      const r = (2.5 + 14.0 * Math.pow(hash2D(i, 3, seed), 2.0)) * (w / 512);

      if (addRays && i % 9 === 0) {
        ctx.strokeStyle = `rgba(${rimRgb[0]}, ${rimRgb[1]}, ${rimRgb[2]}, 0.28)`;
        ctx.lineWidth = 1;
        for (let ray = 0; ray < 8; ray++) {
          const a = (ray / 8) * Math.PI * 2 + hash2D(i, ray, seed);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * r * 3.8, cy + Math.sin(a) * r * 3.8);
          ctx.stroke();
        }
      }

      ctx.fillStyle = `rgba(${floorRgb[0]}, ${floorRgb[1]}, ${floorRgb[2]}, 0.55)`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(${rimRgb[0]}, ${rimRgb[1]}, ${rimRgb[2]}, 0.65)`;
      ctx.lineWidth = Math.max(1, r * 0.14);
      ctx.stroke();
    }
  }
}
