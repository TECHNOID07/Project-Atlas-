/**
 * PROJECT ATLAS — Deep Space Explorer (Multi-Layer Spectral Starfield, Milky Way Spiral Disk,
 * Andromeda & Messier Catalogue, Constellations, and Subtle Shooting Stars)
 */
import THREE from '../vendor/three.module.js';

export class DeepSpaceExplorer {
  constructor(engine, datasets) {
    this.engine = engine;
    this.datasets = datasets;

    this.starfieldGroup = new THREE.Group();
    this.deepSpaceGroup = new THREE.Group();
    this.constellationGroup = new THREE.Group();

    this.engine.scene.add(this.starfieldGroup);
    this.engine.scene.add(this.deepSpaceGroup);
    this.engine.scene.add(this.constellationGroup);

    this.deepSpaceGroup.visible = false;
    this.showConstellations = true;
    this.objectNodes = new Map();
    this.twinkleLayers = [];
    this.shootingStar = null;
  }

  buildStarfield(preset) {
    this.starfieldGroup.clear();
    this.twinkleLayers = [];
    const totalCount = preset.starCount || 3800;

    // Authentic O/B/A/F/G/K/M stellar spectral classes
    const spectralPalette = [
      new THREE.Color('#9bb2ff'), // O/B Blue-white hot giant
      new THREE.Color('#cad8ff'), // B/A Blue-white main sequence
      new THREE.Color('#f8f7ff'), // A/F Pure white
      new THREE.Color('#fff4ea'), // F/G Yellow-white (Sun-like)
      new THREE.Color('#ffd2a1'), // K Orange star
      new THREE.Color('#ffcc6f'), // K/M Deep gold-orange
      new THREE.Color('#ff8c61')  // M Red dwarf / supergiant
    ];

    // 3 Depth & Twinkle Layers for 3D parallax and natural scintillation
    const layerSpecs = [
      { frac: 0.62, baseSize: 1.8, minR: 2200, maxR: 4800, baseOpacity: 0.85, speed: 1.4 },
      { frac: 0.28, baseSize: 2.8, minR: 1600, maxR: 3200, baseOpacity: 0.92, speed: 2.3 },
      { frac: 0.10, baseSize: 4.2, minR: 1300, maxR: 2400, baseOpacity: 0.96, speed: 3.1 }
    ];

    layerSpecs.forEach((ls, lIdx) => {
      const count = Math.max(80, Math.floor(totalCount * ls.frac));
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        const u = (i + 0.5) / count;
        // Concentrate ~35% of stars gently along an inclined galactic band
        let phi = Math.acos(1 - 2 * u);
        if (i % 3 === 0) {
          phi = Math.PI * 0.5 + (Math.sin(i * 19.1) * 0.28);
        }
        const theta = Math.PI * (1 + Math.sqrt(5)) * i + lIdx * 1.7;
        const r = ls.minR + ((i * 97) % 100) * ((ls.maxR - ls.minR) / 100);

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.cos(phi);
        positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

        const c = spectralPalette[(i + lIdx * 3) % spectralPalette.length];
        const lum = 0.72 + 0.28 * ((i * 31) % 17) / 16;
        colors[i * 3] = c.r * lum;
        colors[i * 3 + 1] = c.g * lum;
        colors[i * 3 + 2] = c.b * lum;

        sizes[i] = 0.65 + 0.95 * (((i * 53) % 19) / 18);
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geom.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

      const mat = new THREE.PointsMaterial({
        size: ls.baseSize,
        vertexColors: true,
        transparent: true,
        opacity: ls.baseOpacity,
        depthWrite: false
      });

      const pts = new THREE.Points(geom, mat);
      // Tilt galactic background band slightly for realism
      pts.rotation.x = 0.32;
      pts.rotation.z = -0.18;
      this.starfieldGroup.add(pts);
      this.twinkleLayers.push({ pts, mat, baseOpacity: ls.baseOpacity, speed: ls.speed, phase: lIdx * 2.1 });
    });

    this.backgroundStars = this.twinkleLayers[0]?.pts;

    // Subtle, rare distant shooting star (meteor streak)
    if (preset.shootingStarsEnabled !== false) {
      const sGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-42, -16, -24)
      ]);
      const sMat = new THREE.LineBasicMaterial({
        color: '#e0f2fe',
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sLine = new THREE.Line(sGeom, sMat);
      sLine.visible = false;
      this.starfieldGroup.add(sLine);
      this.shootingStar = {
        line: sLine,
        mat: sMat,
        active: false,
        cooldown: 5.5,
        elapsed: 0,
        duration: 0.85,
        vel: new THREE.Vector3(-420, -160, -240)
      };
    } else {
      this.shootingStar = null;
    }

    this._buildConstellations();
  }

  _buildConstellations() {
    this.constellationGroup.clear();
    const list = this.datasets.constellations?.constellations || [];
    list.forEach((con) => {
      const cGroup = new THREE.Group();
      const starVectors = con.stars.map(s => new THREE.Vector3(s.pos[0] * 12, s.pos[1] * 12, s.pos[2] * 12));

      con.lines.forEach(([a, b]) => {
        if (starVectors[a] && starVectors[b]) {
          const lGeom = new THREE.BufferGeometry().setFromPoints([starVectors[a], starVectors[b]]);
          const lMat = new THREE.LineBasicMaterial({
            color: '#00f0ff',
            transparent: true,
            opacity: 0.35
          });
          cGroup.add(new THREE.Line(lGeom, lMat));
        }
      });

      const sPos = new Float32Array(starVectors.length * 3);
      starVectors.forEach((v, idx) => {
        sPos[idx * 3] = v.x;
        sPos[idx * 3 + 1] = v.y;
        sPos[idx * 3 + 2] = v.z;
      });
      const sGeom = new THREE.BufferGeometry();
      sGeom.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3));
      const sMat = new THREE.PointsMaterial({ color: '#7de3f4', size: 4.5, transparent: true, opacity: 0.95 });
      cGroup.add(new THREE.Points(sGeom, sMat));
      this.constellationGroup.add(cGroup);
    });
    this.constellationGroup.visible = this.showConstellations;
  }

  buildDeepSpaceScene(preset) {
    this.deepSpaceGroup.clear();
    this.objectNodes.clear();

    // 1. Rich Multi-Component Barred Spiral Milky Way Galaxy Disk at origin (0, 0, 0)
    const mwGroup = new THREE.Group();
    const pCount = preset.galaxyParticles || 3400;
    const pos = new Float32Array(pCount * 3);
    const col = new Float32Array(pCount * 3);
    const sizes = new Float32Array(pCount);

    const bulgeColor = new THREE.Color('#ffdfa0');
    const barColor = new THREE.Color('#ffd080');
    const armBlue = new THREE.Color('#60a5fa');
    const hIIPink = new THREE.Color('#f472b6');
    const dustColor = new THREE.Color('#312e81');

    for (let i = 0; i < pCount; i++) {
      const frac = i / pCount;
      let x = 0, y = 0, z = 0;
      let c = armBlue;
      let sz = 1.0;

      if (frac < 0.18) {
        // Dense central Galactic Bulge & Bar
        const r = Math.pow(frac / 0.18, 0.7) * 22.0;
        const theta = i * 2.39996;
        const barStretch = 1.65;
        x = Math.cos(theta) * r * barStretch;
        z = Math.sin(theta) * r * 0.75;
        y = Math.sin(i * 7.3) * (6.5 * (1 - r / 26.0));
        c = i % 2 === 0 ? bulgeColor : barColor;
        sz = 1.35;
      } else {
        // 4 Logarithmic Spiral Arms + H-II Pink Star-Forming Knots + Dark Dust Lanes
        const arm = i % 4;
        const armFrac = (frac - 0.18) / 0.82;
        const radius = 14.0 + Math.pow(armFrac, 0.82) * 88.0;
        const spinAngle = radius * 0.135 + (arm * Math.PI * 0.5);
        const scatter = (Math.sin(i * 12.9898) * 5.2) * (0.22 + armFrac * 0.85);
        x = Math.cos(spinAngle) * radius + Math.cos(i * 3.1) * scatter;
        z = Math.sin(spinAngle) * radius + Math.sin(i * 3.1) * scatter;
        y = Math.sin(i * 7.7) * (3.6 * (1 - armFrac * 0.72));

        if (i % 11 === 0) {
          c = hIIPink; // Pink H-alpha star-forming nebula knot along spiral arm
          sz = 1.85;
        } else if (i % 7 === 0) {
          c = dustColor; // Outer dark dust lane contrast filament
          sz = 1.4;
        } else {
          c = armFrac < 0.35 ? barColor : armBlue;
          sz = 0.9 + 0.5 * (1 - armFrac);
        }
      }

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      sizes[i] = sz;
    }

    const mwGeom = new THREE.BufferGeometry();
    mwGeom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    mwGeom.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    mwGeom.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    const mwPoints = new THREE.Points(
      mwGeom,
      new THREE.PointsMaterial({ size: 2.8, vertexColors: true, transparent: true, opacity: 0.92, depthWrite: false })
    );
    mwGroup.add(mwPoints);

    // Galactic Center (Sagittarius A* Luminous Core + Halo)
    const coreMesh = new THREE.Mesh(
      new THREE.SphereGeometry(5.2, 24, 18),
      new THREE.MeshBasicMaterial({ color: '#fff3c4', emissive: '#ffaa22', emissiveIntensity: 0.75 })
    );
    const coreHalo = new THREE.Mesh(
      new THREE.SphereGeometry(11.5, 20, 14),
      new THREE.MeshBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    coreMesh.add(coreHalo);
    mwGroup.add(coreMesh);

    this.engine.registerSelectable(coreMesh, {
      id: 'milky-way',
      type: 'deep-space',
      name: 'Milky Way Galactic Center (Sagittarius A*)',
      data: this.datasets.deepSpace.milkyWay
    });

    // Solar System Approximate Location Marker (~26,000 ly from Galactic Center in Orion Spur)
    const solMarker = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 18, 14),
      new THREE.MeshBasicMaterial({ color: '#00f0ff', emissive: '#00f0ff', emissiveIntensity: 0.85 })
    );
    solMarker.position.set(26, 1.5, 18);
    mwGroup.add(solMarker);
    this.engine.registerSelectable(solMarker, {
      id: 'solar-neighborhood',
      type: 'deep-space',
      name: 'Solar System Location (Orion-Cygnus Arm, ~26,000 ly)',
      data: {
        id: 'solar-neighborhood',
        name: 'Solar System Galactic Location (Orion Spur)',
        type: 'Galactic Neighborhood Marker',
        constellation: 'Orion-Cygnus Arm',
        distanceLy: { value: 26000, display: '~26,000 light-years from Galactic Center', approx: true },
        representationNote: 'Approximate position marker inside the stylized Milky Way disk',
        description: 'Our Solar System resides in the Orion-Cygnus Arm (Local Spur), roughly 26,000 light-years from the Galactic Center, orbiting the Milky Way at ~220–230 km/s.'
      }
    });

    this.deepSpaceGroup.add(mwGroup);
    this.milkyWayGroup = mwGroup;
    this.objectNodes.set('milky-way', { group: mwGroup, mesh: coreMesh, pos: new THREE.Vector3(0, 0, 0) });
    this.objectNodes.set('solar-neighborhood', { group: mwGroup, mesh: solMarker, pos: solMarker.position.clone() });

    // 2. Curated Deep Space Catalogue Objects with Custom Morphological 3D Geometries
    const objects = this.datasets.deepSpace.objects || [];
    objects.forEach((objData, idx) => {
      const angle = (idx / objects.length) * Math.PI * 2;
      const dist = 210 + (idx % 2) * 35;
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(Math.cos(angle) * dist, ((idx % 3) - 1) * 24, Math.sin(angle) * dist);

      // Selectable translucent core
      const mainMesh = new THREE.Mesh(
        new THREE.SphereGeometry(4.2, 22, 16),
        new THREE.MeshBasicMaterial({
          color: objData.colorHex || '#38bdf8',
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      nodeGroup.add(mainMesh);

      this._buildCustomDeepSpaceStructure(nodeGroup, objData, preset);

      this.deepSpaceGroup.add(nodeGroup);
      this.engine.registerSelectable(mainMesh, {
        id: objData.id,
        type: 'deep-space',
        name: objData.name,
        data: objData
      });
      this.objectNodes.set(objData.id, { group: nodeGroup, mesh: mainMesh, pos: nodeGroup.position.clone(), data: objData });
    });
  }

  _buildCustomDeepSpaceStructure(nodeGroup, objData, preset) {
    const id = objData.id;
    const hCount = preset.textureWidth >= 1024 ? 680 : 440;
    const hPos = new Float32Array(hCount * 3);
    const hCol = new Float32Array(hCount * 3);
    const hSize = new Float32Array(hCount);

    const cPrimary = new THREE.Color(objData.colorHex || '#38bdf8');
    const cSecondary = new THREE.Color('#f472b6');
    const cGold = new THREE.Color('#fde68a');
    const cCyan = new THREE.Color('#22d3ee');

    for (let i = 0; i < hCount; i++) {
      const f = i / hCount;
      let x = 0, y = 0, z = 0;
      let col = cPrimary;
      let sz = 1.2;

      if (id === 'm31-andromeda') {
        // Inclined grand spiral disk with golden-white core & blue outer star-forming ring + M32/M110 satellites
        const arm = i % 2;
        const r = 1.5 + Math.pow(f, 0.8) * 22.0;
        const a = r * 0.28 + arm * Math.PI + Math.sin(i * 4.3) * 0.35;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
        y = x * 0.42 + Math.sin(i * 9.1) * 0.8; // 25-deg inclined pancake disk
        col = f < 0.28 ? cGold : cPrimary;
        sz = f < 0.2 ? 1.8 : 1.1;
      } else if (id === 'm51-whirlpool') {
        // 2-arm grand-design spiral + tidal bridge to companion galaxy NGC 5195
        if (f > 0.84) {
          // Companion NGC 5195 at (+16, +2, +10)
          const cr = ((f - 0.84) / 0.16) * 5.0;
          const ca = i * 2.4;
          x = 16 + Math.cos(ca) * cr;
          y = 2 + Math.sin(i * 3.1) * 0.8;
          z = 10 + Math.sin(ca) * cr;
          col = cGold;
          sz = 1.6;
        } else {
          const arm = i % 2;
          const r = 1.2 + (f / 0.84) * 16.0;
          const a = r * 0.35 + arm * Math.PI;
          x = Math.cos(a) * r;
          z = Math.sin(a) * r;
          y = Math.sin(i * 5.7) * 0.9;
          col = i % 6 === 0 ? cSecondary : cPrimary;
          sz = 1.25;
        }
      } else if (id === 'm104-sombrero') {
        // Brilliant bulbous white-gold core + edge-on equatorial dust ring
        if (f < 0.45) {
          const u = (i + 0.5) / (hCount * 0.45);
          const phi = Math.acos(1 - 2 * u);
          const theta = i * 2.399;
          const r = 2.0 + 7.5 * Math.pow(f / 0.45, 0.6);
          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.cos(phi) * 0.72;
          z = r * Math.sin(phi) * Math.sin(theta);
          col = cGold;
          sz = 1.5;
        } else {
          const r = 11.0 + ((f - 0.45) / 0.55) * 9.5;
          const a = i * 2.399;
          x = Math.cos(a) * r;
          z = Math.sin(a) * r;
          y = Math.sin(i * 4.1) * 0.45;
          col = new THREE.Color('#78350f');
          sz = 1.3;
        }
      } else if (id === 'pillars-of-creation' || id === 'm16-eagle') {
        // 3 towering vertical molecular gas columns + newborn stars at tips
        const colIdx = i % 3;
        const baseX = (colIdx - 1) * 5.2;
        const hFrac = f;
        const colHeight = (14.0 - colIdx * 2.5) * hFrac - 6.0;
        const rad = (2.6 - hFrac * 1.1) * (0.6 + 0.4 * Math.sin(i * 7.1));
        const a = i * 2.399;
        x = baseX + Math.cos(a) * rad + hFrac * 1.4;
        y = colHeight;
        z = Math.sin(a) * rad;
        col = hFrac > 0.82 ? cCyan : (i % 3 === 0 ? cGold : new THREE.Color('#b45309'));
        sz = hFrac > 0.85 ? 2.1 : 1.55;
      } else if (id === 'm1-crab') {
        // Supernova remnant filamentary cage + central pulsar polar jets
        if (f < 0.16) {
          // Bipolar pulsar wind jets
          const jetSign = i % 2 === 0 ? 1 : -1;
          const dJet = (f / 0.16) * 14.0;
          x = jetSign * dJet * 0.45;
          y = jetSign * dJet * 0.85;
          z = Math.sin(i) * 0.8;
          col = cCyan;
          sz = 1.65;
        } else {
          const u = ((f - 0.16) / 0.84);
          const phi = Math.acos(1 - 2 * u);
          const theta = i * 2.399;
          const r = 8.0 + 5.5 * Math.sin(theta * 5.0) * Math.cos(phi * 4.0);
          x = r * Math.sin(phi) * Math.cos(theta) * 1.25;
          y = r * Math.cos(phi) * 0.9;
          z = r * Math.sin(phi) * Math.sin(theta);
          col = i % 4 === 0 ? new THREE.Color('#fb7185') : cCyan;
          sz = 1.3;
        }
      } else if (id === 'm42-orion') {
        // Multi-colored magenta/teal ionization cavity + Trapezium 4-star core
        const u = (i + 0.5) / hCount;
        const phi = Math.acos(1 - 2 * u);
        const theta = i * 2.399;
        const r = 3.5 + f * 14.5 + Math.sin(theta * 3.0) * 2.8;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.cos(phi) * 0.85;
        z = r * Math.sin(phi) * Math.sin(theta);
        col = f < 0.25 ? cCyan : (i % 2 === 0 ? cSecondary : new THREE.Color('#a855f7'));
        sz = f < 0.08 ? 2.4 : 1.65;
      } else if (id === 'm45-pleiades') {
        // 7 brilliant blue-white sisters + wispy Merope reflection nebulosity
        const sevenSisters = [
          [-5, 3, 2], [-2, 4, -1], [2, 3, 1], [5, 1, -2],
          [-4, -2, 3], [1, -3, -2], [6, -2, 1]
        ];
        const sister = sevenSisters[i % 7];
        const spread = f < 0.06 ? 0.35 : (1.5 + f * 9.5);
        const a = i * 2.399;
        x = sister[0] + Math.cos(a) * spread;
        y = sister[1] + Math.sin(a * 1.7) * spread * 0.7;
        z = sister[2] + Math.sin(a) * spread;
        col = f < 0.06 ? new THREE.Color('#ffffff') : new THREE.Color('#38bdf8');
        sz = f < 0.06 ? 3.2 : 1.35;
      } else {
        // Globular cluster M13 (Dense core-concentrated spherical swarm of ancient gold/white stars)
        const u = (i + 0.5) / hCount;
        const phi = Math.acos(1 - 2 * u);
        const theta = i * 2.39996;
        const r = Math.pow(f, 1.65) * 16.0;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.cos(phi);
        z = r * Math.sin(phi) * Math.sin(theta);
        col = i % 3 === 0 ? cGold : new THREE.Color('#f8fafc');
        sz = f < 0.2 ? 1.8 : 1.1;
      }

      hPos[i * 3] = x;
      hPos[i * 3 + 1] = y;
      hPos[i * 3 + 2] = z;
      hCol[i * 3] = col.r;
      hCol[i * 3 + 1] = col.g;
      hCol[i * 3 + 2] = col.b;
      hSize[i] = sz;
    }

    const hGeom = new THREE.BufferGeometry();
    hGeom.setAttribute('position', new THREE.Float32BufferAttribute(hPos, 3));
    hGeom.setAttribute('color', new THREE.Float32BufferAttribute(hCol, 3));
    hGeom.setAttribute('size', new THREE.Float32BufferAttribute(hSize, 1));
    const hPts = new THREE.Points(
      hGeom,
      new THREE.PointsMaterial({
        size: 3.0,
        vertexColors: true,
        transparent: true,
        opacity: 0.86,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    nodeGroup.add(hPts);
  }

  update(dtSeconds) {
    const nowSec = performance.now() * 0.001;

    // Gentle stellar scintillation (twinkling) across starfield layers
    for (let i = 0; i < this.twinkleLayers.length; i++) {
      const layer = this.twinkleLayers[i];
      layer.mat.opacity = layer.baseOpacity + Math.sin(nowSec * layer.speed + layer.phase) * 0.08;
    }

    // Rare, subtle shooting star in deep background
    if (this.shootingStar) {
      const ss = this.shootingStar;
      if (!ss.active) {
        ss.cooldown -= dtSeconds;
        if (ss.cooldown <= 0) {
          ss.active = true;
          ss.elapsed = 0;
          ss.line.visible = true;
          const angle = (nowSec * 0.7) % (Math.PI * 2);
          ss.line.position.set(Math.cos(angle) * 1100, 320 + (Math.sin(nowSec) * 180), Math.sin(angle) * 1100);
        }
      } else {
        ss.elapsed += dtSeconds;
        const p = ss.elapsed / ss.duration;
        if (p >= 1.0) {
          ss.active = false;
          ss.line.visible = false;
          ss.mat.opacity = 0;
          ss.cooldown = 7.5 + (nowSec % 6.0);
        } else {
          ss.line.position.add(ss.vel.clone().multiplyScalar(dtSeconds));
          ss.mat.opacity = Math.sin(p * Math.PI) * 0.75;
        }
      }
    }

    if (this.milkyWayGroup && this.deepSpaceGroup.visible) {
      this.milkyWayGroup.rotation.y += dtSeconds * 0.04;
    }
  }
}
