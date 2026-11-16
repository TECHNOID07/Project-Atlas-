/**
 * PROJECT ATLAS — Main Application Controller (`src/app.js`)
 * Coordinates the 3D Engine, Solar System, Moons, Deep Space, Missions, Laboratory,
 * Offline Knowledge Guide, Audio, Projector Presentation Mode, and Dynamic UI Panels.
 */
import THREE from './vendor/three.module.js';
import { ATLAS_CONFIG } from './config.js';
import { EngineManager, PerformanceManager } from './engine/engine.js';
import { ScaleManager, SolarSystemExplorer } from './solar-system/solarSystem.js';
import { DeepSpaceExplorer } from './deep-space/deepSpace.js';
import { MissionManager, MISSION_SCENARIOS } from './missions/missionManager.js';
import { LaboratoryManager, KnowledgeGuide } from './knowledge/knowledgeAndLab.js';
import { AudioManager, PROJECTOR_DEMO_STEPS } from './ui/audioAndDemo.js';

export class AtlasApp {
  constructor() {
    this.datasets = {};
    this.currentMode = 'HOME';
    this.selectedObject = null;
    this.projectorMode = false;
    this.cinematicMode = false;
    this.cinematicMouseTimer = null;
    this.demoState = { active: false, stepIndex: 0, timer: null };
    this.labelElements = new Map();
  }

  async init() {
    this._bindLoadingControls();
    this._updateLoading(15, 'Loading bundled offline NASA planetary & deep-space datasets...');

    await this._loadAllLocalDatasets();
    this._updateLoading(45, 'Initializing WebGL 3D rendering engine & hardware profiler...');

    this.audio = new AudioManager();
    this.perfManager = new PerformanceManager((newPreset) => {
      this._applyGraphicsPreset(newPreset);
      this._renderRightPanel();
    });
    const initialPresetName = this.perfManager.detectInitialPreset();

    const canvas = document.getElementById('atlas-canvas');
    this.engine = new EngineManager(
      canvas,
      (objMeta, flyTo) => this.selectObjectByMeta(objMeta, flyTo),
      (hoverMeta, cx, cy) => this._updateHoverTooltip(hoverMeta, cx, cy)
    );

    this.scaleManager = new ScaleManager();
    this.solarSystem = new SolarSystemExplorer(this.engine, this.datasets, this.scaleManager);
    this.deepSpace = new DeepSpaceExplorer(this.engine, this.datasets);
    this.lab = new LaboratoryManager(this.solarSystem, this.scaleManager, this.datasets);
    this.knowledge = new KnowledgeGuide(this.datasets);
    this.missions = new MissionManager(
      this.engine,
      this.solarSystem,
      this.deepSpace,
      (mState) => this._onMissionUpdate(mState)
    );

    this._updateLoading(75, 'Constructing 3D Solar System, Moons, Belts & Deep Space Catalogue...');
    this._applyGraphicsPreset(initialPresetName);

    // Select Earth initially so the right inspector panel opens rich and grounded
    const earthEntry = this.solarSystem.bodies.get('earth');
    if (earthEntry) {
      this.selectedObject = { id: 'earth', type: 'planet', name: 'Earth', data: earthEntry.data };
    }

    this._buildUI();
    this._bindKeyboardShortcuts();
    this._updateLoading(100, 'PROJECT ATLAS Ready — 100% Offline Mode Verified.');

    setTimeout(() => this.dismissLoadingScreen(), 650);

    this.lastFrameTime = performance.now();
    const animate = (now) => {
      requestAnimationFrame(animate);
      const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000);
      this.lastFrameTime = now;

      this.perfManager.tick(now);
      this.solarSystem.updatePositions(dt);
      this.deepSpace.update(dt);
      this.missions.update(dt);
      this.engine.update(dt);

      this._update3DLabels();
      this._updateTelemetryBar();
    };
    requestAnimationFrame(animate);
  }

  async _loadAllLocalDatasets() {
    if (window.__ATLAS_BUNDLED_DATA__) {
      this.datasets = window.__ATLAS_BUNDLED_DATA__;
      return;
    }
    const files = {
      planets: './data/planets.json',
      dwarfPlanets: './data/dwarf-planets.json',
      moons: './data/moons.json',
      orbitalData: './data/orbital-data.json',
      deepSpace: './data/deep-space.json',
      constellations: './data/constellations.json',
      glossary: './data/science-glossary.json',
      sources: './data/sources.json'
    };
    const entries = await Promise.all(
      Object.entries(files).map(async ([k, url]) => {
        const res = await fetch(url);
        const data = await res.json();
        return [k, data];
      })
    );
    this.datasets = Object.fromEntries(entries);
  }

  _bindLoadingControls() {
    const skipBtn = document.getElementById('btn-skip-intro');
    if (skipBtn) skipBtn.addEventListener('click', () => this.dismissLoadingScreen());

    const muteIntroBtn = document.getElementById('btn-intro-mute');
    if (muteIntroBtn) {
      muteIntroBtn.addEventListener('click', () => {
        if (this.audio) {
          this.audio.muted = !this.audio.muted;
          muteIntroBtn.textContent = this.audio.muted ? '🔇 Audio Muted' : '🔊 Audio Enabled';
        }
      });
    }

    const motionIntroBtn = document.getElementById('btn-intro-motion');
    if (motionIntroBtn) {
      motionIntroBtn.addEventListener('click', () => {
        if (this.engine) {
          this.engine.reducedMotion = !this.engine.reducedMotion;
          motionIntroBtn.textContent = this.engine.reducedMotion ? '✓ Reduced Motion: ON' : 'Reduced Motion: OFF';
        }
      });
    }
  }

  _updateLoading(pct, msg) {
    const fill = document.getElementById('loading-bar-fill');
    const txt = document.getElementById('loading-status-text');
    if (fill) fill.style.width = `${pct}%`;
    if (txt) txt.textContent = msg;
  }

  dismissLoadingScreen() {
    const scr = document.getElementById('loading-screen');
    if (scr && !scr.classList.contains('hidden')) {
      scr.classList.add('hidden');
      if (this.audio) this.audio.play('startup');
      this.engine.flyToPosition(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 68, 155), 1400);
    }
  }

  _applyGraphicsPreset(presetName) {
    this.perfManager.setPreset(presetName);
    const preset = this.perfManager.getPreset();
    this.engine.applyGraphicsPreset(preset);
    this.solarSystem.rebuildForScaleOrPreset(preset);
    this.deepSpace.buildStarfield(preset);
    this.deepSpace.buildDeepSpaceScene(preset);
    this._syncSceneVisibilityForMode();
    this._rebuild3DLabelDOM();
  }

  _syncSceneVisibilityForMode() {
    const isDeep = this.currentMode === 'DEEP_SPACE' ||
      (this.currentMode === 'MISSIONS' && this.missions.activeMission?.modeRequired === 'DEEP_SPACE');
    this.solarSystem.rootGroup.visible = !isDeep;
    this.deepSpace.deepSpaceGroup.visible = isDeep;
  }

  switchMode(modeId, fromMission = false) {
    if (!ATLAS_CONFIG.navigationModes.some(m => m.id === modeId)) return;
    this.currentMode = modeId;
    if (this.audio && !fromMission) this.audio.play('navigate');

    if (modeId === 'DEEP_SPACE') {
      this.solarSystem.rootGroup.visible = false;
      this.deepSpace.deepSpaceGroup.visible = true;
      const mw = this.datasets.deepSpace.milkyWay;
      this.selectedObject = { id: 'milky-way', type: 'deep-space', name: mw.name, data: mw };
      this.engine.flyToPosition(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 115, 220), 1100);
    } else {
      this.solarSystem.rootGroup.visible = true;
      this.deepSpace.deepSpaceGroup.visible = false;
      if (modeId === 'MOONS' && (!this.selectedObject || this.selectedObject.type !== 'moon')) {
        const ioData = this.datasets.moons.moons.find(m => m.id === 'europa') || this.datasets.moons.moons[0];
        this.selectById(ioData.id, true);
      } else if (modeId === 'PLANETS' && (!this.selectedObject || this.selectedObject.type === 'deep-space')) {
        this.selectById('saturn', true);
      } else if (modeId === 'HOME' || modeId === 'SOLAR_SYSTEM') {
        if (!fromMission) this.engine.setViewPreset('default');
      }
    }

    this._renderLeftPanel();
    this._renderRightPanel();
    this._rebuild3DLabelDOM();
  }

  selectById(id, flyTo = true) {
    // Search Sun & Planets & Dwarf Planets
    if (this.solarSystem.bodies.has(id)) {
      const entry = this.solarSystem.bodies.get(id);
      this.selectObjectByMeta({
        id: entry.id,
        type: entry.id === 'sun' ? 'star' : entry.data.category,
        name: entry.data.name,
        data: entry.data
      }, flyTo);
      return;
    }
    // Search Moons
    for (const [, pEntry] of this.solarSystem.bodies) {
      const m = pEntry.moons?.find(mn => mn.id === id);
      if (m) {
        this.selectObjectByMeta({
          id: m.id,
          type: 'moon',
          name: m.data.name,
          parentId: pEntry.id,
          data: m.data
        }, flyTo);
        return;
      }
    }
    // Search Deep Space
    if (this.deepSpace.objectNodes.has(id)) {
      const node = this.deepSpace.objectNodes.get(id);
      const data = node.data || this.datasets.deepSpace.milkyWay;
      this.selectObjectByMeta({
        id,
        type: 'deep-space',
        name: data.name,
        data
      }, flyTo);
    }
  }

  selectObjectByMeta(meta, flyTo = true) {
    if (!meta) return;
    this.selectedObject = meta;
    if (this.audio) this.audio.play('select');

    this.engine.navigationHistory.push(meta.id);
    if (this.engine.navigationHistory.length > 20) this.engine.navigationHistory.shift();

    if (flyTo) {
      this.flyToSelected();
    }
    this._renderLeftPanel();
    this._renderRightPanel();
  }

  flyToSelected(surfaceCloseUp = false) {
    if (!this.selectedObject) return;
    const id = this.selectedObject.id;

    if (this.solarSystem.bodies.has(id)) {
      const entry = this.solarSystem.bodies.get(id);
      const pos = entry.mesh.getWorldPosition();
      const r = entry.mesh.geometry?.boundingRadius || 2.0;
      const distMult = surfaceCloseUp ? 1.85 : 3.8;
      this.engine.flyToPosition(
        pos,
        new THREE.Vector3(r * distMult * 0.7, r * distMult * 0.45, r * distMult),
        1000,
        entry.mesh
      );
      return;
    }

    for (const [, pEntry] of this.solarSystem.bodies) {
      const m = pEntry.moons?.find(mn => mn.id === id);
      if (m) {
        const pos = m.mesh.getWorldPosition();
        this.engine.flyToPosition(pos, new THREE.Vector3(2.8, 1.8, 3.6), 950, m.mesh);
        return;
      }
    }

    if (this.deepSpace.objectNodes.has(id)) {
      const node = this.deepSpace.objectNodes.get(id);
      const pos = node.pos.clone();
      const offset = id === 'milky-way' ? new THREE.Vector3(0, 95, 165) : new THREE.Vector3(0, 16, 36);
      this.engine.flyToPosition(pos, offset, 1050, node.mesh);
    }
  }

  _buildUI() {
    this._bindTopAndBottomControls();
    this._renderLeftPanel();
    this._renderRightPanel();
    this._rebuild3DLabelDOM();
  }

  _bindTopAndBottomControls() {
    // Top bar actions
    document.getElementById('btn-toggle-left')?.addEventListener('click', () => {
      document.getElementById('left-panel')?.classList.toggle('collapsed');
    });
    document.getElementById('btn-toggle-right')?.addEventListener('click', () => {
      document.getElementById('right-panel')?.classList.toggle('collapsed');
    });
    document.getElementById('btn-projector-mode')?.addEventListener('click', () => {
      this.toggleProjectorMode();
    });
    document.getElementById('btn-start-demo')?.addEventListener('click', () => {
      this.toggleDemoMode();
    });
    document.getElementById('btn-stop-demo')?.addEventListener('click', () => {
      this.stopDemoMode();
    });
    document.getElementById('btn-next-demo')?.addEventListener('click', () => {
      this.advanceDemoStep();
    });
    document.getElementById('btn-cinematic-view')?.addEventListener('click', () => {
      this.toggleCinematicMode(true);
    });
    document.getElementById('btn-restore-ui')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCinematicMode(false);
    });
    window.addEventListener('mousemove', () => {
      if (this.cinematicMode) {
        this._revealCinematicRestoreControl();
      }
    });
    document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
      this.toggleFullscreen();
    });
    document.getElementById('btn-help-modal')?.addEventListener('click', () => {
      this.openModal('controls');
    });
    document.getElementById('btn-dataset-modal')?.addEventListener('click', () => {
      this.openModal('datasets');
    });
    document.getElementById('btn-close-modal')?.addEventListener('click', () => {
      document.getElementById('atlas-modal')?.classList.remove('open');
    });

    // Bottom bar timeline & camera controls
    const playPauseBtn = document.getElementById('btn-play-pause');
    playPauseBtn?.addEventListener('click', () => {
      this.solarSystem.isPlaying = !this.solarSystem.isPlaying;
      playPauseBtn.textContent = this.solarSystem.isPlaying ? '⏸ Pause' : '▶ Play';
    });

    document.getElementById('btn-speed-slower')?.addEventListener('click', () => {
      this.solarSystem.simSpeedDaysPerSec = Math.max(0.1, +(this.solarSystem.simSpeedDaysPerSec * 0.5).toFixed(2));
      this._syncSpeedReadout();
    });
    document.getElementById('btn-speed-faster')?.addEventListener('click', () => {
      this.solarSystem.simSpeedDaysPerSec = Math.min(500, +(this.solarSystem.simSpeedDaysPerSec * 2.0).toFixed(1));
      this._syncSpeedReadout();
    });
    document.getElementById('btn-time-reset')?.addEventListener('click', () => {
      this.solarSystem.jumpToDate('2026-11-15');
    });
    document.getElementById('input-jump-date')?.addEventListener('change', (e) => {
      this.solarSystem.jumpToDate(e.target.value);
    });

    // Scale toggle (Mode A Presentation vs Mode B Relative Scientific)
    document.getElementById('btn-scale-mode')?.addEventListener('click', () => {
      this.scaleManager.mode = this.scaleManager.mode === 'presentation' ? 'scientific' : 'presentation';
      const preset = this.perfManager.getPreset();
      this.solarSystem.rebuildForScaleOrPreset(preset);
      this.deepSpace.buildDeepSpaceScene(preset);
      this._syncSceneVisibilityForMode();
      this._rebuild3DLabelDOM();
      this._syncScaleReadout();
      this._renderRightPanel();
    });

    document.getElementById('btn-toggle-orbits')?.addEventListener('click', (e) => {
      this.solarSystem.showOrbits = !this.solarSystem.showOrbits;
      this.solarSystem.orbitsGroup.visible = this.solarSystem.showOrbits;
      e.currentTarget.classList.toggle('active', this.solarSystem.showOrbits);
    });

    document.getElementById('btn-toggle-labels')?.addEventListener('click', (e) => {
      this.solarSystem.showLabels = !this.solarSystem.showLabels;
      const layer = document.getElementById('labels-layer');
      if (layer) layer.style.display = this.solarSystem.showLabels ? 'block' : 'none';
      e.currentTarget.classList.toggle('active', this.solarSystem.showLabels);
    });

    document.getElementById('btn-cam-reset')?.addEventListener('click', () => {
      this.engine.resetCamera();
    });
    document.getElementById('btn-cam-top')?.addEventListener('click', () => {
      this.engine.setViewPreset('top');
    });
    document.getElementById('btn-cam-side')?.addEventListener('click', () => {
      this.engine.setViewPreset('side');
    });
  }

  _syncSpeedReadout() {
    const el = document.getElementById('sim-speed-label');
    if (el) el.textContent = `${this.solarSystem.simSpeedDaysPerSec} d/s`;
  }

  _syncScaleReadout() {
    const btn = document.getElementById('btn-scale-mode');
    const pill = document.getElementById('telemetry-scale-pill');
    const isPres = this.scaleManager.mode === 'presentation';
    if (btn) {
      btn.textContent = isPres ? 'Scale: Mode A (Presentation)' : 'Scale: Mode B (Relative Scientific)';
    }
    if (pill) {
      pill.innerHTML = isPres
        ? 'SCALE: <strong>COMPRESSED (MODE A)</strong>'
        : 'SCALE: <strong>RELATIVE SCIENTIFIC (MODE B)</strong>';
    }
  }

  _renderLeftPanel() {
    const container = document.getElementById('left-panel-body');
    if (!container) return;

    const navHtml = ATLAS_CONFIG.navigationModes.map(m => `
      <button class="nav-mode-btn ${this.currentMode === m.id ? 'active' : ''}" data-mode="${m.id}">
        <span class="nav-mode-icon">${m.icon}</span>
        <span>
          <span class="nav-mode-label">${m.label}</span>
          <span class="nav-mode-desc">${m.desc}</span>
        </span>
      </button>
    `).join('');

    const planetsHtml = [this.datasets.planets.sun, ...this.datasets.planets.planets].map(p => `
      <button class="quick-chip ${this.selectedObject?.id === p.id ? 'active' : ''}" data-select-id="${p.id}">
        <span class="dot" style="background:${p.colorHex}"></span>
        <span>${p.name}</span>
      </button>
    `).join('');

    const dwarfsHtml = this.datasets.dwarfPlanets.dwarfPlanets.map(d => `
      <button class="quick-chip ${this.selectedObject?.id === d.id ? 'active' : ''}" data-select-id="${d.id}">
        <span class="dot" style="background:${d.colorHex}"></span>
        <span>${d.name}</span>
      </button>
    `).join('');

    const deepHtml = [
      { id: 'milky-way', name: 'Milky Way Core', colorHex: '#ffdd88' },
      { id: 'solar-neighborhood', name: 'Solar Location', colorHex: '#00f0ff' },
      ...this.datasets.deepSpace.objects
    ].map(o => `
      <button class="quick-chip ${this.selectedObject?.id === o.id ? 'active' : ''}" data-deep-id="${o.id}">
        <span class="dot" style="background:${o.colorHex}"></span>
        <span>${o.name}</span>
      </button>
    `).join('');

    container.innerHTML = `
      <div class="nav-mode-list">${navHtml}</div>
      <div class="selector-section-title">Sun & Classical Planets</div>
      <div class="quick-grid">${planetsHtml}</div>
      <div class="selector-section-title">5 IAU Dwarf Planets</div>
      <div class="quick-grid">${dwarfsHtml}</div>
      <div class="selector-section-title">Deep Space & Galaxy</div>
      <div class="quick-grid">${deepHtml}</div>
    `;

    container.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => this.switchMode(btn.getAttribute('data-mode')));
    });
    container.querySelectorAll('[data-select-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.currentMode === 'DEEP_SPACE') this.switchMode('SOLAR_SYSTEM', true);
        this.selectById(btn.getAttribute('data-select-id'), true);
      });
    });
    container.querySelectorAll('[data-deep-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.currentMode !== 'DEEP_SPACE') this.switchMode('DEEP_SPACE', true);
        this.selectById(btn.getAttribute('data-deep-id'), true);
      });
    });
  }

  _renderRightPanel() {
    const titleEl = document.getElementById('right-panel-title');
    const bodyEl = document.getElementById('right-panel-body');
    if (!bodyEl || !titleEl) return;

    titleEl.textContent = `${this.currentMode.replace('_', ' ')} INSPECTOR`;

    if (this.currentMode === 'MISSIONS') {
      this._renderMissionsPanel(bodyEl);
      return;
    }
    if (this.currentMode === 'LABORATORY') {
      this._renderLaboratoryPanel(bodyEl);
      return;
    }
    if (this.currentMode === 'KNOWLEDGE') {
      this._renderKnowledgePanel(bodyEl);
      return;
    }
    if (this.currentMode === 'SETTINGS') {
      this._renderSettingsPanel(bodyEl);
      return;
    }
    if (this.currentMode === 'MOONS') {
      this._renderMoonsPanel(bodyEl);
      return;
    }

    // Default: HOME, SOLAR_SYSTEM, PLANETS, DEEP_SPACE object inspector + regional controls
    this._renderObjectInspector(bodyEl);
  }

  _renderObjectInspector(bodyEl) {
    const sel = this.selectedObject;
    const scaleNote = this.scaleManager.getScaleDescription();

    let beltControlsHtml = '';
    if (this.currentMode === 'SOLAR_SYSTEM' || this.currentMode === 'HOME' || this.currentMode === 'PLANETS') {
      beltControlsHtml = `
        <div class="info-card">
          <h4>Solar System Belts & Scale Controls</h4>
          <p style="font-size:11px;color:#fcd34d;margin-bottom:8px;">${scaleNote}</p>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;">
            <button class="atlas-btn ${this.solarSystem.showAsteroidBelt ? 'active' : ''}" id="btn-belt-asteroid">Asteroid Belt (2.1–3.3 AU)</button>
            <button class="atlas-btn ${this.solarSystem.showKuiperBelt ? 'active' : ''}" id="btn-belt-kuiper">Kuiper Belt (30–50 AU)</button>
            <button class="atlas-btn ${this.solarSystem.showOortCloud ? 'active' : ''}" id="btn-belt-oort">Conceptual Oort Cloud</button>
          </div>
          <label style="font-size:11px;color:var(--ice);display:block;margin-bottom:4px;">
            Belt Particle Density: <strong>${Math.round(this.solarSystem.beltDensityMultiplier * 100)}%</strong>
          </label>
          <input type="range" min="0.25" max="1.75" step="0.25" value="${this.solarSystem.beltDensityMultiplier}" class="atlas-slider" id="slider-belt-density" />
          <div style="display:flex;gap:5px;margin-top:8px;">
            <button class="atlas-btn" id="btn-inspect-vesta">Select Asteroid 4 Vesta</button>
            <button class="atlas-btn" id="btn-inspect-pluto">Select Kuiper Body Pluto</button>
          </div>
        </div>
      `;
    }

    if (!sel || !sel.data) {
      bodyEl.innerHTML = beltControlsHtml + `<div class="info-card"><h4>Select Any Celestial Body</h4><p style="font-size:12px;">Click any planet, dwarf planet, moon, or deep-space object in the 3D viewport or left selector panel.</p></div>`;
      this._bindBeltControlListeners(bodyEl);
      return;
    }

    const d = sel.data;
    if (sel.type === 'deep-space') {
      bodyEl.innerHTML = `
        <div class="info-card amber-warn">
          <h4>Scientific Representation Disclosure</h4>
          <p style="font-size:11.5px;color:#fde68a;">${d.representationNote || 'Artistic 3D particle/volumetric representation grounded in NASA Hubble Messier Catalog distances and dimensions.'}</p>
        </div>
        <div class="info-card">
          <h4>${d.name} ${d.catalogId ? `(${d.catalogId})` : ''}</h4>
          <table class="spec-table">
            <tr><td>Classification</td><td>${d.type || 'Galactic Structure'}</td></tr>
            <tr><td>Constellation</td><td>${d.constellation || 'Sagittarius / Local'}</td></tr>
            <tr><td>Distance</td><td>${d.distanceLy?.display || (d.diameterLightYears ? `${d.diameterLightYears.value.toLocaleString()} ly span` : 'N/A')}</td></tr>
            ${d.apparentMagnitude !== undefined ? `<tr><td>Apparent Magnitude</td><td>${d.apparentMagnitude}</td></tr>` : ''}
            ${d.dimensions ? `<tr><td>Dimensions</td><td>${d.dimensions}</td></tr>` : ''}
          </table>
          <p style="font-size:12px;line-height:1.5;margin-top:8px;color:#e2e8f0;">${d.description || ''}</p>
          <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
            <button class="atlas-btn primary" id="btn-fly-selected">Fly To Object</button>
            <button class="atlas-btn" id="btn-mw-overview">Milky Way Overview</button>
            <button class="atlas-btn" id="btn-m31-mode">Andromeda (M31) Mode</button>
          </div>
        </div>
      `;
      bodyEl.querySelector('#btn-fly-selected')?.addEventListener('click', () => this.flyToSelected(false));
      bodyEl.querySelector('#btn-mw-overview')?.addEventListener('click', () => this.selectById('milky-way', true));
      bodyEl.querySelector('#btn-m31-mode')?.addEventListener('click', () => this.selectById('m31-andromeda', true));
      return;
    }

    // Planet, Dwarf Planet, Star, or Moon Inspector
    const diam = d.diameterKm ? `${d.diameterKm.value.toLocaleString()} km ${d.diameterKm.approx ? '(approx)' : '(mean)'}` : 'Unavailable';
    const mass = d.mass10_24Kg?.value != null
      ? `${d.mass10_24Kg.value.toLocaleString()} × 10²⁴ kg`
      : (d.massKg?.value || 'Unavailable in primary summary');
    const dist = d.meanDistanceFromSunMkm?.value != null
      ? `${d.meanDistanceFromSunMkm.value.toLocaleString()} × 10⁶ km (${d.meanDistanceFromSunMkm.au ?? ''} AU)`
      : (d.distanceFromParentKm ? `${d.distanceFromParentKm.value.toLocaleString()} km from ${d.parentName}` : '0 km');
    const orbPeriod = d.orbitalPeriodDays?.value != null
      ? `${d.orbitalPeriodDays.value.toLocaleString()} days ${d.orbitalPeriodDays.years ? `(${d.orbitalPeriodDays.years} yrs)` : ''}`
      : 'N/A';
    const rotPeriod = d.rotationPeriodHours?.value != null
      ? `${d.rotationPeriodHours.value} hours ${d.rotationPeriodHours.retrograde ? '(Retrograde)' : ''}`
      : (d.orbitalPeriodDays?.synchronous ? 'Synchronous (Tidally Locked)' : 'Unavailable');
    const tilt = d.axialTiltDeg?.value != null ? `${d.axialTiltDeg.value}°` : 'Unavailable';
    const grav = d.gravityMs2?.value != null ? `${d.gravityMs2.value} m/s²` : 'Unavailable';
    const temp = d.temperatureC?.value != null ? `${d.temperatureC.value} °C (${d.temperatureC.kelvin || ''} K)` : (d.temperatureC?.note || 'Unavailable');

    const atmoHtml = (d.atmosphereComposition || []).map(a => `<li><strong>${a.gas}:</strong> ${a.percentage}</li>`).join('');
    const factsHtml = (d.facts || []).map(f => `<li>${f}</li>`).join('');

    let saturnRingsHtml = '';
    if (d.id === 'saturn' && d.ringDetails) {
      const divs = d.ringDetails.divisions.map(r => `<li><strong>${r.name} (${r.rangeKm}):</strong> ${r.notes}</li>`).join('');
      saturnRingsHtml = `
        <div class="info-card" style="border-color:var(--cyan);">
          <h4>Saturn Ring Structure Inspector</h4>
          <p style="font-size:11.5px;margin-bottom:6px;"><strong>Composition:</strong> ${d.ringDetails.composition}</p>
          <ul class="fact-list">${divs}</ul>
        </div>
      `;
    }

    const relatedMoons = this.datasets.moons.moons.filter(m => m.parentId === d.id);
    const moonsChips = relatedMoons.map(m => `
      <button class="atlas-btn" data-moon-id="${m.id}" style="font-size:11px;padding:4px 8px;">☾ ${m.name}</button>
    `).join('');

    bodyEl.innerHTML = `
      <div class="info-card">
        <h4>${d.name} — ${d.classification || 'Celestial Body'}</h4>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;">
          <button class="atlas-btn primary" id="btn-focus-body">Fly To ${d.name}</button>
          <button class="atlas-btn" id="btn-closeup-body">Surface Close-Up (Illustrative)</button>
          <button class="atlas-btn" id="btn-return-overview">System Overview</button>
        </div>
        <table class="spec-table">
          <tr><td>Equatorial / Mean Diameter</td><td>${diam}</td></tr>
          <tr><td>Mass</td><td>${mass}</td></tr>
          <tr><td>Mean Distance</td><td>${dist}</td></tr>
          <tr><td>Sidereal Orbital Period</td><td>${orbPeriod}</td></tr>
          <tr><td>Rotation Period</td><td>${rotPeriod}</td></tr>
          <tr><td>Axial Tilt (Obliquity)</td><td>${tilt}</td></tr>
          <tr><td>Surface / 1-bar Gravity</td><td>${grav}</td></tr>
          <tr><td>Mean Temperature</td><td>${temp}</td></tr>
          ${d.knownMoonsCount !== undefined ? `<tr><td>Confirmed Moons (NASA)</td><td>${d.knownMoonsCount}</td></tr>` : ''}
        </table>
      </div>
      ${saturnRingsHtml}
      ${relatedMoons.length > 0 ? `
        <div class="info-card">
          <h4>Explore ${d.name}'s Featured Satellites</h4>
          <div style="display:flex;flex-wrap:wrap;gap:5px;">${moonsChips}</div>
        </div>
      ` : ''}
      ${atmoHtml ? `
        <div class="info-card">
          <h4>Atmospheric Composition</h4>
          <ul class="fact-list">${atmoHtml}</ul>
        </div>
      ` : ''}
      <div class="info-card">
        <h4>Verified Scientific Facts</h4>
        <ul class="fact-list">${factsHtml}</ul>
        <p style="font-size:10.5px;color:var(--muted);margin-top:6px;">Note: 3D sphere texture is an educational visualization, not a topographic laser terrain mesh.</p>
      </div>
      ${beltControlsHtml}
    `;

    bodyEl.querySelector('#btn-focus-body')?.addEventListener('click', () => this.flyToSelected(false));
    bodyEl.querySelector('#btn-closeup-body')?.addEventListener('click', () => this.flyToSelected(true));
    bodyEl.querySelector('#btn-return-overview')?.addEventListener('click', () => this.engine.resetCamera());
    bodyEl.querySelectorAll('[data-moon-id]').forEach(btn => {
      btn.addEventListener('click', () => this.selectById(btn.getAttribute('data-moon-id'), true));
    });
    this._bindBeltControlListeners(bodyEl);
  }

  _bindBeltControlListeners(bodyEl) {
    bodyEl.querySelector('#btn-belt-asteroid')?.addEventListener('click', () => {
      this.solarSystem.showAsteroidBelt = !this.solarSystem.showAsteroidBelt;
      if (this.solarSystem.asteroidInstancedMesh) {
        this.solarSystem.asteroidInstancedMesh.visible = this.solarSystem.showAsteroidBelt;
      }
      this._renderRightPanel();
    });
    bodyEl.querySelector('#btn-belt-kuiper')?.addEventListener('click', () => {
      this.solarSystem.showKuiperBelt = !this.solarSystem.showKuiperBelt;
      if (this.solarSystem.kuiperInstancedMesh) {
        this.solarSystem.kuiperInstancedMesh.visible = this.solarSystem.showKuiperBelt;
      }
      this._renderRightPanel();
    });
    bodyEl.querySelector('#btn-belt-oort')?.addEventListener('click', () => {
      this.solarSystem.showOortCloud = !this.solarSystem.showOortCloud;
      if (this.solarSystem.oortCloudPoints) {
        this.solarSystem.oortCloudPoints.visible = this.solarSystem.showOortCloud;
      }
      if (this.solarSystem.showOortCloud) {
        this.engine.setViewPreset('outer');
      }
      this._renderRightPanel();
    });
    bodyEl.querySelector('#slider-belt-density')?.addEventListener('input', (e) => {
      this.solarSystem.beltDensityMultiplier = parseFloat(e.target.value) || 1.0;
      this.solarSystem._buildBelts(this.perfManager.getPreset());
      this._renderRightPanel();
    });
    bodyEl.querySelector('#btn-inspect-vesta')?.addEventListener('click', () => {
      const vMesh = this.engine.selectableObjects.find(o => o.userData?.id === 'vesta-asteroid');
      if (vMesh) this.selectObjectByMeta(vMesh.userData, true);
    });
    bodyEl.querySelector('#btn-inspect-pluto')?.addEventListener('click', () => {
      this.selectById('pluto', true);
    });
  }

  _renderMoonsPanel(bodyEl) {
    const moons = this.datasets.moons.moons;
    const activeMoon = (this.selectedObject?.type === 'moon')
      ? this.selectedObject.data
      : moons[0];

    const groupedHtml = ['earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].map(pid => {
      const list = moons.filter(m => m.parentId === pid);
      const chips = list.map(m => `
        <button class="quick-chip ${activeMoon.id === m.id ? 'active' : ''}" data-moon-select="${m.id}">
          <span class="dot" style="background:${m.colorHex}"></span>
          <span>${m.name}</span>
        </button>
      `).join('');
      return `
        <div class="selector-section-title">${list[0]?.parentName || pid} System</div>
        <div class="quick-grid" style="margin-bottom:6px;">${chips}</div>
      `;
    }).join('');

    bodyEl.innerHTML = `
      <div class="info-card">
        <h4>Special Planetary System Views</h4>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="atlas-btn primary" id="btn-jovian-system">Jupiter System Tour</button>
          <button class="atlas-btn primary" id="btn-saturnian-system">Saturn System Tour</button>
        </div>
      </div>
      <div class="info-card">
        <h4>Selected Satellite: ${activeMoon.name}</h4>
        <table class="spec-table">
          <tr><td>Parent Body</td><td>${activeMoon.parentName}</td></tr>
          <tr><td>Mean Diameter</td><td>${activeMoon.diameterKm.value.toLocaleString()} km</td></tr>
          <tr><td>Distance from Parent</td><td>${activeMoon.distanceFromParentKm.value.toLocaleString()} km</td></tr>
          <tr><td>Orbital Period</td><td>${activeMoon.orbitalPeriodDays.value} days ${activeMoon.orbitalPeriodDays.retrograde ? '(Retrograde)' : '(Synchronous)'}</td></tr>
          <tr><td>Mean Density</td><td>${activeMoon.densityKgm3?.value || 'N/A'} kg/m³</td></tr>
        </table>
        <ul class="fact-list" style="margin-top:8px;">
          ${activeMoon.facts.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>
      <div class="info-card">
        <h4>All 18 Featured Planetary Moons</h4>
        ${groupedHtml}
      </div>
    `;

    bodyEl.querySelector('#btn-jovian-system')?.addEventListener('click', () => {
      this.selectById('jupiter', true);
    });
    bodyEl.querySelector('#btn-saturnian-system')?.addEventListener('click', () => {
      this.selectById('saturn', true);
    });
    bodyEl.querySelectorAll('[data-moon-select]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectById(btn.getAttribute('data-moon-select'), true);
      });
    });
  }

  _renderMissionsPanel(bodyEl) {
    const active = this.missions.activeMission;
    const pct = Math.round((this.missions.progress || 0) * 100);
    const currentObj = active ? active.objectives[Math.max(0, this.missions.currentStageIndex)] : null;

    const listHtml = MISSION_SCENARIOS.map(m => `
      <div class="info-card" style="border-color:${active?.id === m.id ? 'var(--cyan)' : 'var(--border-subtle)'}">
        <h4>${m.title}</h4>
        <p style="font-size:11.5px;color:var(--muted);margin-bottom:8px;">${m.subtitle}</p>
        <button class="atlas-btn primary" data-launch-mission="${m.id}">
          🚀 ${active?.id === m.id ? 'Restart Mission' : 'Launch Mission'}
        </button>
      </div>
    `).join('');

    bodyEl.innerHTML = `
      ${active ? `
        <div class="info-card amber-warn">
          <h4>Active Mission Telemetry (${pct}%)</h4>
          <p style="font-size:12px;font-weight:700;color:var(--white);margin-bottom:4px;">${active.title}</p>
          <div class="loading-progress-box" style="width:100%;margin:8px 0;">
            <div style="height:100%;width:${pct}%;background:var(--cyan);"></div>
          </div>
          <p style="font-size:11.5px;color:var(--cyan);margin-bottom:4px;">${currentObj ? currentObj.label : ''}</p>
          <p style="font-size:11.5px;color:#e2e8f0;margin-bottom:8px;">${currentObj ? currentObj.info : ''}</p>
          <p style="font-size:10.5px;color:#fde68a;margin-bottom:8px;">${active.disclaimer}</p>
          <div style="display:flex;gap:5px;flex-wrap:wrap;">
            <button class="atlas-btn" id="btn-mission-pause">${this.missions.isPlaying ? '⏸ Pause' : '▶ Resume'}</button>
            <button class="atlas-btn" id="btn-mission-restart">↺ Restart</button>
            <button class="atlas-btn amber" id="btn-mission-exit">✕ Exit Mission</button>
          </div>
        </div>
      ` : `
        <div class="info-card">
          <h4>Interactive Guided Space Missions</h4>
          <p style="font-size:12px;color:#e2e8f0;">Select any of the five interactive missions below to launch the ATLAS Explorer Probe along a simulated 3D trajectory.</p>
        </div>
      `}
      ${listHtml}
    `;

    bodyEl.querySelectorAll('[data-launch-mission]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.audio) this.audio.play('mission_launch');
        this.missions.startMission(btn.getAttribute('data-launch-mission'), (m, f) => this.switchMode(m, f));
        this._renderRightPanel();
      });
    });
    bodyEl.querySelector('#btn-mission-pause')?.addEventListener('click', () => {
      if (this.missions.isPlaying) this.missions.pause();
      else this.missions.resume();
      this._renderRightPanel();
    });
    bodyEl.querySelector('#btn-mission-restart')?.addEventListener('click', () => {
      this.missions.restart((m, f) => this.switchMode(m, f));
      this._renderRightPanel();
    });
    bodyEl.querySelector('#btn-mission-exit')?.addEventListener('click', () => {
      this.missions.exit();
      this._renderRightPanel();
    });
  }

  _onMissionUpdate() {
    if (this.currentMode === 'MISSIONS') {
      this._renderRightPanel();
    }
  }

  _renderLaboratoryPanel(bodyEl) {
    const st = this.lab.state;
    const allBodies = [
      this.datasets.planets.sun,
      ...this.datasets.planets.planets,
      ...this.datasets.dwarfPlanets.dwarfPlanets
    ];
    const cmp = this.lab.computeComparison(st.targetBodyId, st.compareBodyId);

    const optionsA = allBodies.map(b => `<option value="${b.id}" ${b.id === st.targetBodyId ? 'selected' : ''}>${b.name}</option>`).join('');
    const optionsB = allBodies.map(b => `<option value="${b.id}" ${b.id === st.compareBodyId ? 'selected' : ''}>${b.name}</option>`).join('');

    bodyEl.innerHTML = `
      <div class="info-card amber-warn">
        <h4>Hypothetical Sandbox Disclosure</h4>
        <p style="font-size:11px;color:#fde68a;">Experiments modify visual 3D parameters in real time without overwriting the verified NASA scientific dataset.</p>
        <button class="atlas-btn amber" id="btn-lab-reset" style="margin-top:6px;">↺ Reset Experiment to NASA Baseline</button>
      </div>

      <div class="info-card">
        <h4>"What If?" Quick Presets</h4>
        <div style="display:flex;flex-wrap:wrap;gap:5px;">
          <button class="atlas-btn" data-whatif="fast-earth-spin">What if Earth Rotated 10x Faster?</button>
          <button class="atlas-btn" data-whatif="extreme-earth-tilt">What if Earth Tilted 90° Like Uranus?</button>
          <button class="atlas-btn" data-whatif="zero-earth-tilt">What if Earth Had 0° Tilt (No Seasons)?</button>
          <button class="atlas-btn" data-whatif="hyper-orbits">8x Accelerated Keplerian Orbits</button>
        </div>
      </div>

      <div class="info-card">
        <h4>Interactive Parameter Controls</h4>
        <label style="font-size:11.5px;display:block;margin-bottom:4px;">Target Body:</label>
        <select class="atlas-select" id="lab-select-a" style="width:100%;margin-bottom:8px;">${optionsA}</select>

        <label style="font-size:11.5px;display:block;margin-bottom:2px;">
          Axial Tilt Override: <strong>${st.axialTiltOverrideDeg}°</strong>
        </label>
        <input type="range" min="0" max="180" step="0.5" value="${st.axialTiltOverrideDeg}" class="atlas-slider" id="lab-slider-tilt" />

        <label style="font-size:11.5px;display:block;margin:8px 0 2px;">
          Rotation Speed Multiplier: <strong>${st.rotationSpeedMultiplier}x</strong>
        </label>
        <input type="range" min="0.1" max="15" step="0.5" value="${st.rotationSpeedMultiplier}" class="atlas-slider" id="lab-slider-rot" />

        <label style="font-size:11.5px;display:block;margin:8px 0 2px;">
          Planetary Visual Size Scale: <strong>${st.planetScaleMultiplier}x</strong>
        </label>
        <input type="range" min="0.5" max="2.5" step="0.25" value="${st.planetScaleMultiplier}" class="atlas-slider" id="lab-slider-pscale" />
      </div>

      <div class="info-card">
        <h4>Scientific Side-by-Side Comparison</h4>
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;">
          <span style="font-size:11.5px;color:var(--ice);">Compare ${cmp.bodyA.name} with:</span>
          <select class="atlas-select" id="lab-select-b" style="flex:1;">${optionsB}</select>
        </div>
        <table class="spec-table">
          <tr><td>Metric</td><td>${cmp.bodyA.name} vs. ${cmp.bodyB.name}</td></tr>
          <tr><td>Diameter</td><td>${cmp.bodyA.diameterKm.value.toLocaleString()} vs ${cmp.bodyB.diameterKm.value.toLocaleString()} km (${cmp.diameterRatioBA}x)</td></tr>
          <tr><td>Mass (10²⁴ kg)</td><td>${cmp.bodyA.mass10_24Kg?.value ?? 'N/A'} vs ${cmp.bodyB.mass10_24Kg?.value ?? 'N/A'}</td></tr>
          <tr><td>Gravity (m/s²)</td><td>${cmp.bodyA.gravityMs2?.value ?? 'N/A'} vs ${cmp.bodyB.gravityMs2?.value ?? 'N/A'}</td></tr>
          <tr><td>100 kg Person Weight</td><td>${cmp.weightOf100NNativeA ?? 'N/A'} kgf vs ${cmp.weightOf100NNativeB ?? 'N/A'} kgf</td></tr>
          <tr><td>Orbital Period</td><td>${cmp.bodyA.orbitalPeriodDays.value} d vs ${cmp.bodyB.orbitalPeriodDays.value} d</td></tr>
          <tr><td>Distance Difference</td><td>${cmp.distanceDiffMkm} × 10⁶ km</td></tr>
        </table>
      </div>
    `;

    const rebuild = () => {
      this.solarSystem.rebuildForScaleOrPreset(this.perfManager.getPreset());
      this._rebuild3DLabelDOM();
    };

    bodyEl.querySelector('#btn-lab-reset')?.addEventListener('click', () => {
      if (this.audio) this.audio.play('confirm');
      this.lab.resetExperiment(rebuild);
      this._renderRightPanel();
    });

    bodyEl.querySelectorAll('[data-whatif]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.audio) this.audio.play('confirm');
        this.lab.applyWhatIfPreset(btn.getAttribute('data-whatif'), rebuild);
        this.selectById(this.lab.state.targetBodyId, true);
        this._renderRightPanel();
      });
    });

    bodyEl.querySelector('#lab-select-a')?.addEventListener('change', (e) => {
      const id = e.target.value;
      const b = allBodies.find(x => x.id === id);
      this.lab.applyExperiment({ targetBodyId: id, axialTiltOverrideDeg: b?.axialTiltDeg?.value || 0 });
      this.selectById(id, true);
      this._renderRightPanel();
    });

    bodyEl.querySelector('#lab-select-b')?.addEventListener('change', (e) => {
      this.lab.applyExperiment({ compareBodyId: e.target.value });
      this._renderRightPanel();
    });

    bodyEl.querySelector('#lab-slider-tilt')?.addEventListener('input', (e) => {
      this.lab.applyExperiment({ axialTiltOverrideDeg: parseFloat(e.target.value) });
      this._renderRightPanel();
    });

    bodyEl.querySelector('#lab-slider-rot')?.addEventListener('input', (e) => {
      this.lab.applyExperiment({ rotationSpeedMultiplier: parseFloat(e.target.value) });
      this._renderRightPanel();
    });

    bodyEl.querySelector('#lab-slider-pscale')?.addEventListener('change', (e) => {
      this.lab.applyExperiment({ planetScaleMultiplier: parseFloat(e.target.value) }, rebuild);
      this._renderRightPanel();
    });
  }

  _renderKnowledgePanel(bodyEl) {
    const qaList = this.datasets.glossary.predefinedQA;
    const initialAns = this._lastKnowledgeAnswer || this.knowledge.answerQuestion('How big is Jupiter compared to Earth?');
    const searchResults = this.knowledge.search(this._lastSearchQuery || '', this._lastSearchCategory || 'ALL');

    bodyEl.innerHTML = `
      <div class="info-card">
        <h4>Offline Atlas Knowledge Guide (No Cloud AI)</h4>
        <p style="font-size:11px;color:var(--muted);margin-bottom:8px;">100% deterministic local search & Q&A engine powered by bundled NASA datasets.</p>
        <div style="display:flex;gap:5px;margin-bottom:8px;">
          <input type="text" id="knowledge-q-input" class="atlas-input" placeholder="Ask a question or type 'Compare Earth and Mars'..." style="flex:1;" value="${this._lastQuestionText || ''}" />
          <button class="atlas-btn primary" id="btn-ask-knowledge">Ask</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${qaList.map(qa => `<button class="atlas-btn" data-qa="${qa.question}" style="font-size:10.5px;padding:4px 7px;">${qa.question}</button>`).join('')}
        </div>
      </div>

      <div class="info-card ${initialAns.supported ? '' : 'amber-warn'}">
        <h4>${initialAns.title}</h4>
        <p style="font-size:12px;line-height:1.5;color:#f1f5f9;">${initialAns.answer}</p>
      </div>

      <div class="info-card">
        <h4>Search Local Astronomy Database (${searchResults.length} records)</h4>
        <div style="display:flex;gap:5px;margin-bottom:8px;">
          <input type="text" id="knowledge-search-input" class="atlas-input" placeholder="Filter by name, property, keyword..." style="flex:1;" value="${this._lastSearchQuery || ''}" />
          <select id="knowledge-cat-select" class="atlas-select">
            <option value="ALL">All Categories</option>
            <option value="Planet" ${this._lastSearchCategory === 'Planet' ? 'selected' : ''}>Planets</option>
            <option value="Dwarf Planet" ${this._lastSearchCategory === 'Dwarf Planet' ? 'selected' : ''}>Dwarf Planets</option>
            <option value="Moon" ${this._lastSearchCategory === 'Moon' ? 'selected' : ''}>Moons</option>
            <option value="Deep Space" ${this._lastSearchCategory === 'Deep Space' ? 'selected' : ''}>Deep Space</option>
            <option value="Glossary Term" ${this._lastSearchCategory === 'Glossary Term' ? 'selected' : ''}>Glossary</option>
          </select>
        </div>
        <div style="max-height:240px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">
          ${searchResults.slice(0, 25).map(item => `
            <div style="padding:7px;background:rgba(3,7,18,0.65);border:1px solid var(--border-subtle);border-radius:5px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong style="font-size:12px;color:var(--cyan);">${item.name}</strong>
                <span style="font-size:10px;color:var(--ice);">${item.category}</span>
              </div>
              <p style="font-size:11px;color:#cbd5e1;margin-top:3px;">${item.summary}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const runQ = (qText) => {
      this._lastQuestionText = qText;
      this._lastKnowledgeAnswer = this.knowledge.answerQuestion(qText);
      this._renderRightPanel();
    };

    bodyEl.querySelector('#btn-ask-knowledge')?.addEventListener('click', () => {
      const val = bodyEl.querySelector('#knowledge-q-input')?.value || '';
      runQ(val);
    });
    bodyEl.querySelector('#knowledge-q-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runQ(e.target.value);
    });
    bodyEl.querySelectorAll('[data-qa]').forEach(btn => {
      btn.addEventListener('click', () => runQ(btn.getAttribute('data-qa')));
    });

    bodyEl.querySelector('#knowledge-search-input')?.addEventListener('input', (e) => {
      this._lastSearchQuery = e.target.value;
      this._renderRightPanel();
      const input = document.getElementById('knowledge-search-input');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
    bodyEl.querySelector('#knowledge-cat-select')?.addEventListener('change', (e) => {
      this._lastSearchCategory = e.target.value;
      this._renderRightPanel();
    });
  }

  _renderSettingsPanel(bodyEl) {
    const stats = this.perfManager.getMemoryStats(this.engine.renderer);
    const curPreset = this.perfManager.presetName;

    bodyEl.innerHTML = `
      <div class="info-card">
        <h4>Hardware & Live Performance Telemetry</h4>
        <table class="spec-table">
          <tr><td>Target Optimization</td><td>HP ProBook 640 (Core i5-6300U)</td></tr>
          <tr><td>Live Frame Rate</td><td>${stats.fps} FPS (${stats.frameTimeMs} ms)</td></tr>
          <tr><td>Active Graphics Preset</td><td>${stats.preset}</td></tr>
          <tr><td>Internal Render Resolution</td><td>${this.engine.renderer.width} × ${this.engine.renderer.height} px</td></tr>
          <tr><td>Draw Calls / Triangles</td><td>${stats.drawCalls} calls / ${stats.triangles} tris</td></tr>
          <tr><td>JS Heap Memory</td><td>${stats.heapMb ? `${stats.heapMb} MB` : 'Managed by Browser'}</td></tr>
        </table>
      </div>

      <div class="info-card">
        <h4>Graphics Quality Presets</h4>
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          <button class="atlas-btn ${curPreset === 'LOW' ? 'active' : ''}" data-preset="LOW">LOW (720p)</button>
          <button class="atlas-btn ${curPreset === 'MEDIUM' ? 'active' : ''}" data-preset="MEDIUM">MEDIUM</button>
          <button class="atlas-btn ${curPreset === 'HIGH' ? 'active' : ''}" data-preset="HIGH">HIGH</button>
        </div>
        <p style="font-size:11px;color:var(--muted);">
          <strong>LOW:</strong> 720p cap, 900 stars, 160 instanced asteroids, no glow (maximum frame rate on integrated GPU).<br/>
          <strong>MEDIUM:</strong> 900p cap, 2,000 stars, 340 asteroids, lightweight atmospheric glow.<br/>
          <strong>HIGH:</strong> 1080p cap, 3,800 stars, 600 asteroids, high sphere tessellation.
        </p>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;margin-top:8px;cursor:pointer;">
          <input type="checkbox" id="chk-auto-downgrade" ${this.perfManager.autoScaleEnabled ? 'checked' : ''} />
          Auto-downgrade quality if FPS drops below 18
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;margin-top:6px;cursor:pointer;">
          <input type="checkbox" id="chk-reduced-motion" ${this.engine.reducedMotion ? 'checked' : ''} />
          Reduced Motion (Instant camera transitions)
        </label>
      </div>

      <div class="info-card">
        <h4>Local Audio Synthesizer & Effects</h4>
        <label style="font-size:12px;display:block;margin-bottom:4px;">
          Master Volume: <strong>${Math.round(this.audio.masterVolume * 100)}%</strong>
        </label>
        <input type="range" min="0" max="1" step="0.05" value="${this.audio.masterVolume}" class="atlas-slider" id="slider-audio-vol" />
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="atlas-btn ${this.audio.muted ? 'amber' : ''}" id="btn-audio-mute">
            ${this.audio.muted ? '🔇 Muted' : '🔊 Audio Active'}
          </button>
          <button class="atlas-btn ${this.audio.reducedAudio ? 'active' : ''}" id="btn-audio-reduced">
            Reduced Audio: ${this.audio.reducedAudio ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div class="info-card">
        <h4>Projector Presentation Mode (32–40" Screen)</h4>
        <p style="font-size:11.5px;color:#e2e8f0;margin-bottom:8px;">Enlarges labels, boosts contrast, and supports the 13-step science fair demonstration sequence.</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="atlas-btn primary" id="btn-settings-projector">
            ${this.projectorMode ? '✓ Projector Mode ON' : 'Enable Projector Mode'}
          </button>
          <button class="atlas-btn amber" id="btn-settings-demo">
            ▶ Start 13-Step Demo Sequence
          </button>
        </div>
      </div>
    `;

    bodyEl.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._applyGraphicsPreset(btn.getAttribute('data-preset'));
        this._renderRightPanel();
      });
    });
    bodyEl.querySelector('#chk-auto-downgrade')?.addEventListener('change', (e) => {
      this.perfManager.autoScaleEnabled = e.target.checked;
    });
    bodyEl.querySelector('#chk-reduced-motion')?.addEventListener('change', (e) => {
      this.engine.reducedMotion = e.target.checked;
    });
    bodyEl.querySelector('#slider-audio-vol')?.addEventListener('input', (e) => {
      this.audio.masterVolume = parseFloat(e.target.value);
      this.audio.play('confirm');
      this._renderRightPanel();
    });
    bodyEl.querySelector('#btn-audio-mute')?.addEventListener('click', () => {
      this.audio.muted = !this.audio.muted;
      this._renderRightPanel();
    });
    bodyEl.querySelector('#btn-audio-reduced')?.addEventListener('click', () => {
      this.audio.reducedAudio = !this.audio.reducedAudio;
      this._renderRightPanel();
    });
    bodyEl.querySelector('#btn-settings-projector')?.addEventListener('click', () => {
      this.toggleProjectorMode();
      this._renderRightPanel();
    });
    bodyEl.querySelector('#btn-settings-demo')?.addEventListener('click', () => {
      this.toggleDemoMode();
    });
  }

  _rebuild3DLabelDOM() {
    const layer = document.getElementById('labels-layer');
    if (!layer) return;
    layer.innerHTML = '';
    this.labelElements.clear();

    if (this.currentMode === 'DEEP_SPACE') {
      this.deepSpace.objectNodes.forEach((node, id) => {
        const el = document.createElement('div');
        el.className = 'label-3d';
        el.textContent = node.data?.name || (id === 'milky-way' ? 'Milky Way Center' : 'Solar System (26k ly)');
        el.addEventListener('click', () => this.selectById(id, true));
        layer.appendChild(el);
        this.labelElements.set(id, { el, mesh: node.mesh });
      });
    } else {
      this.solarSystem.bodies.forEach((entry, id) => {
        const el = document.createElement('div');
        el.className = `label-3d ${entry.isDwarf ? 'dwarf' : ''}`;
        el.textContent = entry.data.name;
        el.addEventListener('click', () => this.selectById(id, true));
        layer.appendChild(el);
        this.labelElements.set(id, { el, mesh: entry.mesh });
      });
    }
  }

  _update3DLabels() {
    if (!this.solarSystem.showLabels || this.cinematicMode) return;
    const w = this.engine.canvas.clientWidth || window.innerWidth;
    const h = this.engine.canvas.clientHeight || window.innerHeight;

    this.labelElements.forEach(({ el, mesh }) => {
      if (!mesh || !mesh.visible) {
        el.style.display = 'none';
        return;
      }
      const worldPos = mesh.getWorldPosition();
      const proj = worldPos.clone().project(this.engine.camera);
      if (proj.z < -1 || proj.z > 1) {
        el.style.display = 'none';
        return;
      }
      const x = (proj.x * 0.5 + 0.5) * w;
      const y = (-proj.y * 0.5 + 0.5) * h;
      el.style.display = 'block';
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    });
  }

  _updateHoverTooltip(meta, cx, cy) {
    const tip = document.getElementById('hover-tooltip');
    if (!tip) return;
    if (!meta || this.cinematicMode) {
      tip.style.display = 'none';
      return;
    }
    tip.style.display = 'block';
    tip.style.left = `${cx + 14}px`;
    tip.style.top = `${cy + 14}px`;
    tip.innerHTML = `<strong>${meta.name}</strong> <span style="color:var(--ice)">(${meta.type.toUpperCase()})</span><br/><span style="font-size:10.5px;color:var(--muted)">Click to inspect • Double-click to fly</span>`;
  }

  _updateTelemetryBar() {
    const fpsEl = document.getElementById('telemetry-fps');
    if (fpsEl) fpsEl.textContent = `${this.perfManager.fps} FPS (${this.perfManager.presetName})`;

    const dateEl = document.getElementById('sim-date-display');
    if (dateEl) dateEl.textContent = this.solarSystem.getSimulationDateISO();

    const coordEl = document.getElementById('telemetry-coords');
    if (coordEl && this.engine) {
      const p = this.engine.camera.position;
      const dist = p.length().toFixed(1);
      coordEl.textContent = `CAM R:${dist} (${p.x.toFixed(0)}, ${p.y.toFixed(0)}, ${p.z.toFixed(0)})`;
    }
  }

  toggleProjectorMode() {
    this.projectorMode = !this.projectorMode;
    document.body.classList.toggle('projector-mode', this.projectorMode);
    const btn = document.getElementById('btn-projector-mode');
    if (btn) btn.classList.toggle('active', this.projectorMode);
  }

  toggleCinematicMode(forceState) {
    const nextState = typeof forceState === 'boolean' ? forceState : !this.cinematicMode;
    this.cinematicMode = nextState;
    document.body.classList.toggle('cinematic-mode', this.cinematicMode);

    const btn = document.getElementById('btn-cinematic-view');
    if (btn) btn.classList.toggle('active', this.cinematicMode);

    const restoreBtn = document.getElementById('btn-restore-ui');
    if (!this.cinematicMode) {
      if (this.cinematicMouseTimer) {
        clearTimeout(this.cinematicMouseTimer);
        this.cinematicMouseTimer = null;
      }
      if (restoreBtn) restoreBtn.classList.remove('visible');
    } else {
      const tip = document.getElementById('hover-tooltip');
      if (tip) tip.style.display = 'none';
      this._revealCinematicRestoreControl();
    }

    if (this.audio) this.audio.play('confirm');
    if (this.engine) {
      this.engine.resize();
      setTimeout(() => this.engine.resize(), 460);
    }
  }

  _revealCinematicRestoreControl() {
    if (!this.cinematicMode) return;
    const restoreBtn = document.getElementById('btn-restore-ui');
    if (restoreBtn) restoreBtn.classList.add('visible');
    if (this.cinematicMouseTimer) clearTimeout(this.cinematicMouseTimer);
    this.cinematicMouseTimer = setTimeout(() => {
      if (restoreBtn) restoreBtn.classList.remove('visible');
    }, 2500);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  toggleDemoMode() {
    if (this.demoState.active) {
      this.stopDemoMode();
    } else {
      this.demoState.active = true;
      this.demoState.stepIndex = 0;
      if (!this.projectorMode) this.toggleProjectorMode();
      document.getElementById('demo-banner')?.classList.add('active');
      this._executeDemoStep(0);
    }
  }

  stopDemoMode() {
    this.demoState.active = false;
    if (this.demoState.timer) clearTimeout(this.demoState.timer);
    this.demoState.timer = null;
    document.getElementById('demo-banner')?.classList.remove('active');
  }

  advanceDemoStep() {
    if (!this.demoState.active) return;
    if (this.demoState.timer) clearTimeout(this.demoState.timer);
    const next = (this.demoState.stepIndex + 1) % PROJECTOR_DEMO_STEPS.length;
    this._executeDemoStep(next);
  }

  _executeDemoStep(index) {
    if (!this.demoState.active) return;
    this.demoState.stepIndex = index;
    const stepObj = PROJECTOR_DEMO_STEPS[index];
    const titleEl = document.getElementById('demo-step-title');
    if (titleEl) titleEl.textContent = `DEMO (${stepObj.step}/13): ${stepObj.title}`;

    switch (stepObj.action) {
      case 'starfield':
        this.switchMode('HOME');
        this.engine.setViewPreset('top');
        break;
      case 'constellations':
        this.deepSpace.showConstellations = true;
        this.deepSpace.constellationGroup.visible = true;
        this.engine.setViewPreset('side');
        break;
      case 'solar_overview':
        this.switchMode('SOLAR_SYSTEM');
        this.engine.setViewPreset('default');
        break;
      case 'select_earth':
        this.switchMode('PLANETS');
        this.selectById('earth', true);
        break;
      case 'orbit_earth':
        this.flyToSelected(true);
        break;
      case 'compare_earth_jupiter':
        this.lab.applyExperiment({ targetBodyId: 'earth', compareBodyId: 'jupiter' });
        this.switchMode('LABORATORY');
        break;
      case 'select_saturn':
        this.switchMode('PLANETS');
        this.selectById('saturn', true);
        break;
      case 'saturn_rings':
        this.flyToSelected(true);
        break;
      case 'jupiter_moons':
        this.switchMode('MOONS');
        this.selectById('europa', true);
        break;
      case 'deep_space':
        this.switchMode('DEEP_SPACE');
        this.selectById('m42-orion', true);
        break;
      case 'milky_way':
        this.selectById('milky-way', true);
        break;
      case 'mission_mars':
        this.switchMode('MISSIONS');
        this.missions.startMission('mission-1-mars', (m, f) => this.switchMode(m, f));
        break;
      case 'cinematic_finish':
        this.missions.exit();
        this.switchMode('SOLAR_SYSTEM');
        this.engine.setViewPreset('default');
        break;
      default:
        break;
    }

    this.demoState.timer = setTimeout(() => {
      if (this.demoState.active) {
        const nextIdx = (index + 1) % PROJECTOR_DEMO_STEPS.length;
        this._executeDemoStep(nextIdx);
      }
    }, stepObj.durationMs);
  }

  openModal(type) {
    const modal = document.getElementById('atlas-modal');
    const title = document.getElementById('modal-title');
    const content = document.getElementById('modal-content');
    if (!modal || !title || !content) return;

    if (type === 'controls') {
      title.textContent = 'PROJECT ATLAS — Navigation & Keyboard Controls Guide';
      content.innerHTML = `
        <div class="info-card">
          <h4>Mouse Navigation</h4>
          <ul class="fact-list">
            <li><strong>Left-Click + Drag:</strong> Orbit / Rotate camera around current focus target</li>
            <li><strong>Scroll Wheel:</strong> Smooth Zoom in and out</li>
            <li><strong>Right-Click + Drag:</strong> Pan camera target across space</li>
            <li><strong>Single Click Object:</strong> Select celestial body and open scientific specifications</li>
            <li><strong>Double-Click Object:</strong> Smoothly fly camera to focus on selected body</li>
          </ul>
        </div>
        <div class="info-card">
          <h4>Keyboard Shortcuts</h4>
          <ul class="fact-list">
            <li><strong>W / A / S / D:</strong> Free-flight camera translation forward, left, backward, right</li>
            <li><strong>Q / E:</strong> Vertical elevation down / up</li>
            <li><strong>Shift (Hold):</strong> 2.6x faster free-flight navigation speed</li>
            <li><strong>Space:</strong> Pause / Resume orbital time simulation</li>
            <li><strong>R:</strong> Reset camera to Solar System overview</li>
            <li><strong>H:</strong> Toggle unobstructed Cinematic View (hides all UI panels & labels)</li>
            <li><strong>F:</strong> Toggle fullscreen presentation mode</li>
            <li><strong>Escape:</strong> Close active modal or collapse side panels</li>
            <li><strong>1 – 5:</strong> Quick camera presets (1: Overview, 2: Inner System, 3: Earth, 4: Saturn Rings, 5: Deep Space Milky Way)</li>
          </ul>
        </div>
      `;
    } else {
      title.textContent = 'PROJECT ATLAS — Bundled Offline Scientific Datasets & Sources';
      const srcRows = this.datasets.sources.sources.map(s => `
        <div class="info-card">
          <h4>${s.title}</h4>
          <p style="font-size:11.5px;color:var(--ice);margin-bottom:4px;">Author/Agency: ${s.author}</p>
          <p style="font-size:11.5px;color:#e2e8f0;margin-bottom:4px;">${s.usage}</p>
          <p style="font-size:10.5px;font-family:var(--font-mono);color:var(--muted);">Reference Citation: ${s.url}</p>
        </div>
      `).join('');
      const lims = this.datasets.sources.limitations.map(l => `<li>${l}</li>`).join('');
      content.innerHTML = `
        <div class="info-card amber-warn">
          <h4>Scientific Transparency & Data Limitations</h4>
          <ul class="fact-list">${lims}</ul>
        </div>
        ${srcRows}
      `;
    }
    modal.classList.add('open');
  }

  _bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.solarSystem.isPlaying = !this.solarSystem.isPlaying;
        const btn = document.getElementById('btn-play-pause');
        if (btn) btn.textContent = this.solarSystem.isPlaying ? '⏸ Pause' : '▶ Play';
      } else if (e.key === 'r' || e.key === 'R') {
        this.engine.resetCamera();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        this.toggleCinematicMode();
      } else if (e.key === 'f' || e.key === 'F') {
        this.toggleFullscreen();
      } else if (e.key === 'Escape') {
        const modal = document.getElementById('atlas-modal');
        if (modal && modal.classList.contains('open')) {
          modal.classList.remove('open');
        } else if (this.cinematicMode) {
          this.toggleCinematicMode(false);
        } else if (this.demoState.active) {
          this.stopDemoMode();
        }
      } else if (e.key === '1') {
        this.switchMode('SOLAR_SYSTEM');
      } else if (e.key === '2') {
        this.switchMode('SOLAR_SYSTEM');
        this.engine.setViewPreset('inner');
      } else if (e.key === '3') {
        this.switchMode('PLANETS');
        this.selectById('earth', true);
      } else if (e.key === '4') {
        this.switchMode('PLANETS');
        this.selectById('saturn', true);
      } else if (e.key === '5') {
        this.switchMode('DEEP_SPACE');
      }
    });
  }
}
