/**
 * PROJECT ATLAS — Solar System, Dwarf Planets, Scale Manager, Keplerian Orbits & Asteroid/Kuiper/Oort Belts
 */
import THREE from '../vendor/three.module.js';
import { ProceduralTextureFactory } from './proceduralTextures.js';

export class ScaleManager {
  constructor() {
    this.mode = 'presentation'; // 'presentation' | 'scientific'
    this.planetScaleMultiplier = 1.0;
    this.distanceScaleMultiplier = 1.0;
  }

  /**
   * Computes 3D scene distance from Sun (in scene units) given physical distance in AU.
   * Mode A (Presentation): Non-linear compressed spacing so all 8 planets + Kuiper Belt fit clearly on a projector.
   * Mode B (Relative Scientific): Power-law/linear proportional spacing preserving true astronomical order and relative gaps.
   */
  auToSceneDistance(au, orderIndex = 1) {
    if (au <= 0) return 0;
    let d;
    if (this.mode === 'presentation') {
      // Compressed projector-friendly spacing
      if (au <= 2.0) {
        d = 12 + au * 22;
      } else if (au <= 10.0) {
        d = 56 + (au - 2.0) * 10.5;
      } else {
        d = 140 + Math.pow(au - 10.0, 0.72) * 9.5;
      }
    } else {
      // Relative Scientific Scale: proportional power-law mapping (1 AU = 28 units, preserving outer solar system ratios)
      d = 28.0 * Math.pow(au, 0.85);
    }
    return d * this.distanceScaleMultiplier;
  }

  /**
   * Computes 3D sphere radius in scene units given diameter in km.
   */
  diameterToSceneRadius(diameterKm, isSun = false) {
    if (isSun) {
      return (this.mode === 'presentation' ? 7.2 : 9.5);
    }
    const earthRatio = diameterKm / 12756.0;
    let r;
    if (this.mode === 'presentation') {
      // Enlarged for clear visibility on a 32-40" projector
      r = Math.max(0.85, Math.min(4.8, 1.35 * Math.pow(earthRatio, 0.46)));
    } else {
      // Relative Scientific Scale: true relative diameters (with minimum visual floor of 0.28 for small terrestrial/dwarf bodies)
      r = Math.max(0.28, 0.72 * earthRatio);
    }
    return r * this.planetScaleMultiplier;
  }

  getScaleDescription() {
    if (this.mode === 'presentation') {
      return 'MODE A: PRESENTATION SCALE (Compressed Orbital Distances & Enlarged Planetary Radii for Projector Clarity)';
    }
    return 'MODE B: RELATIVE SCIENTIFIC SCALE (Realistic Relative Planetary Diameters & d = 28·AU^0.85 Distance Mapping)';
  }
}

export class SolarSystemExplorer {
  constructor(engine, datasets, scaleManager) {
    this.engine = engine;
    this.datasets = datasets;
    this.scaleManager = scaleManager;

    this.rootGroup = new THREE.Group();
    this.orbitsGroup = new THREE.Group();
    this.trailsGroup = new THREE.Group();
    this.beltsGroup = new THREE.Group();
    this.rootGroup.add(this.orbitsGroup);
    this.rootGroup.add(this.trailsGroup);
    this.rootGroup.add(this.beltsGroup);
    this.engine.scene.add(this.rootGroup);

    this.textureLoader = new THREE.TextureLoader();
    this.procTextures = new ProceduralTextureFactory();
    this.bodies = new Map(); // id -> { data, group, mesh, orbitLine, trailLine, trailPoints, moons: [] }

    // Simulation time state (Initialized to J2000 reference epoch + days offset to 2026-11-15)
    this.j2000EpochMs = Date.UTC(2000, 0, 1, 12, 0, 0);
    this.simDaysSinceJ2000 = (Date.UTC(2026, 10, 15, 12, 0, 0) - this.j2000EpochMs) / 86400000;
    this.isPlaying = true;
    this.simSpeedDaysPerSec = 5.0; // Default 5 Earth days per second

    this.showOrbits = true;
    this.showTrails = true;
    this.showLabels = true;
    this.showDwarfPlanets = true;
    this.showAsteroidBelt = true;
    this.showKuiperBelt = true;
    this.showOortCloud = false;
    this.beltDensityMultiplier = 1.0;

    // Lab override state (never mutates original datasets)
    this.labOverrides = {
      active: false,
      targetBodyId: 'earth',
      rotationSpeedMultiplier: 1.0,
      axialTiltOverrideDeg: null,
      orbitalSpeedMultiplier: 1.0
    };
  }

  build(preset) {
    this.rootGroup.clear();
    this.orbitsGroup.clear();
    this.trailsGroup.clear();
    this.beltsGroup.clear();
    this.rootGroup.add(this.orbitsGroup);
    this.rootGroup.add(this.trailsGroup);
    this.rootGroup.add(this.beltsGroup);
    this.bodies.clear();

    const [segW, segH] = preset.sphereSegments || [36, 24];
    const [heroW, heroH] = preset.heroSphereSegments || [48, 32];
    const texW = preset.textureWidth || 512;

    // 1. Build Ultra-Detailed Dynamic Sun
    const sunData = this.datasets.planets.sun;
    const sunRadius = this.scaleManager.diameterToSceneRadius(sunData.diameterKm.value, true);
    const sunGeom = new THREE.SphereGeometry(sunRadius, heroW, heroH);
    const sunTex = this.procTextures.getBodyTexture('sun', texW);
    const sunMat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      emissive: '#ffaa22',
      emissiveIntensity: 0.38,
      map: sunTex
    });
    const sunMesh = new THREE.Mesh(sunGeom, sunMat);
    sunMesh.name = 'Sun';

    // Counter-rotating turbulent chromosphere shell
    const chromoGeom = new THREE.SphereGeometry(sunRadius * 1.025, 28, 20);
    const chromoMat = new THREE.MeshBasicMaterial({
      color: '#ffcc33',
      map: sunTex,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const chromoMesh = new THREE.Mesh(chromoGeom, chromoMat);
    sunMesh.add(chromoMesh);

    // Multi-layered translucent solar corona shells (inner white-gold, mid amber, outer deep crimson-gold)
    const coronaShells = [];
    const coronaSpecs = [
      { scale: 1.12, color: '#fff3b0', opacity: 0.26 },
      { scale: 1.28, color: '#ff9911', opacity: 0.16 },
      { scale: 1.52, color: '#ff5500', opacity: 0.08 }
    ];
    coronaSpecs.forEach((cs) => {
      const cMesh = new THREE.Mesh(
        new THREE.SphereGeometry(sunRadius * cs.scale, 24, 16),
        new THREE.MeshBasicMaterial({
          color: cs.color,
          transparent: true,
          opacity: cs.opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      sunMesh.add(cMesh);
      coronaShells.push(cMesh);
    });

    // Animated solar plasma prominence arches around solar limb
    const prominenceLoops = [];
    if (preset.prominencesEnabled !== false) {
      for (let pIdx = 0; pIdx < 4; pIdx++) {
        const loopGeom = new THREE.TorusGeometry(sunRadius * 0.24, sunRadius * 0.022, 8, 24, Math.PI);
        const loopMat = new THREE.MeshBasicMaterial({
          color: pIdx % 2 === 0 ? '#ff7722' : '#ffbb33',
          transparent: true,
          opacity: 0.68,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const loopMesh = new THREE.Mesh(loopGeom, loopMat);
        const ang = (pIdx / 4) * Math.PI * 2 + 0.4;
        loopMesh.position.set(
          Math.cos(ang) * (sunRadius * 0.96),
          (pIdx % 2 === 0 ? 1 : -1) * sunRadius * 0.18,
          Math.sin(ang) * (sunRadius * 0.96)
        );
        loopMesh.rotation.y = -ang + Math.PI * 0.5;
        loopMesh.rotation.z = (pIdx - 1.5) * 0.25;
        sunMesh.add(loopMesh);
        prominenceLoops.push(loopMesh);
      }
    }

    const sunGroup = new THREE.Group();
    sunGroup.add(sunMesh);
    this.rootGroup.add(sunGroup);
    this.engine.registerSelectable(sunMesh, { id: 'sun', type: 'star', name: 'Sun', data: sunData });
    this.bodies.set('sun', {
      id: 'sun',
      data: sunData,
      group: sunGroup,
      mesh: sunMesh,
      chromoMesh,
      coronaShells,
      prominenceLoops,
      moons: []
    });

    // 2. Build 8 Classical Planets + 5 Dwarf Planets
    const allBodies = [
      ...this.datasets.planets.planets,
      ...this.datasets.dwarfPlanets.dwarfPlanets
    ];

    allBodies.forEach((bData, idx) => {
      const isDwarf = bData.category === 'dwarf-planet';
      const isHero = ['earth', 'jupiter', 'saturn', 'venus', 'mars', 'uranus', 'neptune'].includes(bData.id);
      const radius = this.scaleManager.diameterToSceneRadius(bData.diameterKm.value, false);
      const geom = new THREE.SphereGeometry(radius, isHero ? heroW : segW, isHero ? heroH : segH);
      const tex = this.procTextures.getBodyTexture(bData.id, texW);

      const rimConfigs = {
        earth:   { rimColor: '#38bdf8', rimStrength: 0.55, spec: 0.48, night: true },
        venus:   { rimColor: '#fbbf24', rimStrength: 0.42, spec: 0.16, night: false },
        mars:    { rimColor: '#fb923c', rimStrength: 0.28, spec: 0.12, night: false },
        jupiter: { rimColor: '#fed7aa', rimStrength: 0.26, spec: 0.18, night: false },
        saturn:  { rimColor: '#fde68a', rimStrength: 0.30, spec: 0.18, night: false },
        uranus:  { rimColor: '#67e8f9', rimStrength: 0.38, spec: 0.22, night: false },
        neptune: { rimColor: '#60a5fa', rimStrength: 0.44, spec: 0.26, night: false }
      };
      const rc = rimConfigs[bData.id] || { rimColor: bData.colorHex, rimStrength: 0.14, spec: 0.12, night: false };

      const mat = new THREE.MeshStandardMaterial({
        color: '#ffffff',
        map: tex,
        emissive: bData.colorHex,
        emissiveIntensity: 0.06,
        specularStrength: rc.spec,
        rimColor: rc.rimColor,
        rimStrength: rc.rimStrength,
        nightLights: rc.night
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.name = bData.name;

      // Apply Axial Tilt (Obliquity)
      const tiltDeg = bData.axialTiltDeg?.value || 0;
      mesh.rotation.z = (tiltDeg * Math.PI) / 180;

      // Haumea ellipsoidal elongation
      if (bData.id === 'haumea') {
        mesh.scale.set(1.38, 0.82, 0.96);
      }

      // Separate rotating translucent cloud sphere for Earth (and super-rotating upper haze for Venus)
      let cloudMesh = null;
      if (bData.id === 'earth' && preset.cloudsEnabled !== false) {
        const cloudGeom = new THREE.SphereGeometry(radius * 1.022, heroW, heroH);
        const cloudTex = this.procTextures.getBodyTexture('earth_clouds', texW);
        const cloudMat = new THREE.MeshStandardMaterial({
          color: '#ffffff',
          map: cloudTex,
          transparent: true,
          opacity: 0.82,
          depthWrite: false,
          rimColor: '#7dd3fc',
          rimStrength: 0.35
        });
        cloudMesh = new THREE.Mesh(cloudGeom, cloudMat);
        mesh.add(cloudMesh);
      } else if (bData.id === 'venus' && preset.cloudsEnabled !== false) {
        const vCloudGeom = new THREE.SphereGeometry(radius * 1.02, segW, segH);
        const vCloudMat = new THREE.MeshStandardMaterial({
          color: '#fde68a',
          map: tex,
          transparent: true,
          opacity: 0.38,
          depthWrite: false,
          rimColor: '#fbbf24',
          rimStrength: 0.35
        });
        cloudMesh = new THREE.Mesh(vCloudGeom, vCloudMat);
        mesh.add(cloudMesh);
      }

      // Planetary atmospheric scattering halo shell
      if (['earth', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].includes(bData.id) && preset.glowEnabled) {
        const atmoGeom = new THREE.SphereGeometry(radius * 1.065, 22, 16);
        const atmoMat = new THREE.MeshBasicMaterial({
          color: rc.rimColor,
          transparent: true,
          opacity: bData.id === 'earth' ? 0.16 : 0.11,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        mesh.add(new THREE.Mesh(atmoGeom, atmoMat));
      }

      // Axial tilt indicator pole line (visible in Laboratory or Planet Detail)
      const polePts = [new THREE.Vector3(0, -radius * 1.65, 0), new THREE.Vector3(0, radius * 1.65, 0)];
      const poleGeom = new THREE.BufferGeometry().setFromPoints(polePts);
      const poleLine = new THREE.Line(poleGeom, new THREE.LineBasicMaterial({ color: '#00f0ff', transparent: true, opacity: 0.65 }));
      poleLine.visible = false;
      mesh.add(poleLine);

      // Saturn, Uranus, Neptune, and Haumea Multi-Layer Ring Systems
      if (bData.id === 'saturn') {
        const ringSegs = preset.textureWidth >= 1024 ? 128 : 96;
        const ringGeom = new THREE.RingGeometry(radius * 1.22, radius * 2.52, ringSegs);
        const ringTex = this.procTextures.getBodyTexture('saturn_rings', texW);
        // Primary lit ring disc (reacts to solar illumination)
        const ringMat = new THREE.MeshStandardMaterial({
          color: '#fff8e7',
          map: ringTex,
          emissive: '#d8b880',
          emissiveIntensity: 0.16,
          transparent: true,
          opacity: 0.94,
          side: THREE.DoubleSide,
          depthWrite: false,
          specularStrength: 0.32
        });
        const ringMesh = new THREE.Mesh(ringGeom, ringMat);
        mesh.add(ringMesh);

        // Secondary subtle ice-crystal forward-scatter sheen layer
        if (preset.glowEnabled) {
          const sheenGeom = new THREE.RingGeometry(radius * 1.48, radius * 2.38, 64);
          const sheenMat = new THREE.MeshBasicMaterial({
            color: '#fef3c7',
            map: ringTex,
            transparent: true,
            opacity: 0.22,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
          });
          const sheenMesh = new THREE.Mesh(sheenGeom, sheenMat);
          sheenMesh.position.y = 0.01;
          mesh.add(sheenMesh);
        }
      } else if (bData.id === 'uranus' || bData.id === 'haumea' || bData.id === 'neptune') {
        const ringGeom = new THREE.RingGeometry(radius * 1.42, radius * 1.76, 56);
        const ringMat = new THREE.MeshBasicMaterial({
          color: bData.id === 'neptune' ? '#60a5fa' : '#7de3f4',
          transparent: true,
          opacity: bData.id === 'neptune' ? 0.14 : 0.26,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const ringMesh = new THREE.Mesh(ringGeom, ringMat);
        mesh.add(ringMesh);
      }

      const bodyGroup = new THREE.Group();
      bodyGroup.add(mesh);
      if (isDwarf) bodyGroup.visible = this.showDwarfPlanets;
      this.rootGroup.add(bodyGroup);

      this.engine.registerSelectable(mesh, {
        id: bData.id,
        type: bData.category,
        name: bData.name,
        data: bData
      });

      // Build Keplerian Orbit Path Line
      const orbitLine = this._createOrbitLine(bData, isDwarf);
      this.orbitsGroup.add(orbitLine);

      // Build Moons orbiting this body
      const bodyMoons = this.datasets.moons.moons.filter(m => m.parentId === bData.id);
      const moonEntries = [];
      bodyMoons.forEach((mData, mIdx) => {
        const mRadius = Math.max(0.18, radius * (0.14 + 0.04 * Math.min(3, mData.diameterKm.value / 1500)));
        const mGeom = new THREE.SphereGeometry(mRadius, 22, 16);
        const mTex = this.procTextures.getBodyTexture(mData.id, Math.max(256, Math.floor(texW / 2)));
        const mMat = new THREE.MeshStandardMaterial({
          color: '#ffffff',
          map: mTex,
          emissive: mData.colorHex || '#cccccc',
          emissiveIntensity: 0.08,
          rimColor: mData.id === 'titan' ? '#f59e0b' : (mData.id === 'europa' || mData.id === 'enceladus' ? '#7dd3fc' : '#94a3b8'),
          rimStrength: mData.id === 'titan' ? 0.55 : 0.24
        });
        const mMesh = new THREE.Mesh(mGeom, mMat);
        if (mData.id === 'titan' && preset.glowEnabled) {
          const titanHaze = new THREE.Mesh(
            new THREE.SphereGeometry(mRadius * 1.09, 18, 12),
            new THREE.MeshBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false })
          );
          mMesh.add(titanHaze);
        }
        mMesh.name = mData.name;
        const orbitDist = radius * (1.85 + mIdx * 0.72) + (bData.id === 'saturn' ? radius * 1.15 : 0);

        // Moon orbit ring around parent planet
        const mOrbitPts = [];
        for (let s = 0; s <= 48; s++) {
          const ang = (s / 48) * Math.PI * 2;
          mOrbitPts.push(new THREE.Vector3(Math.cos(ang) * orbitDist, 0, Math.sin(ang) * orbitDist));
        }
        const mOrbitLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(mOrbitPts),
          new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.28 })
        );
        bodyGroup.add(mOrbitLine);
        bodyGroup.add(mMesh);

        this.engine.registerSelectable(mMesh, {
          id: mData.id,
          type: 'moon',
          name: mData.name,
          parentId: bData.id,
          data: mData
        });

        moonEntries.push({
          id: mData.id,
          data: mData,
          mesh: mMesh,
          orbitLine: mOrbitLine,
          orbitDist,
          phaseOffset: mIdx * 1.35
        });
      });

      this.bodies.set(bData.id, {
        id: bData.id,
        data: bData,
        isDwarf,
        group: bodyGroup,
        mesh,
        cloudMesh,
        poleLine,
        orbitLine,
        trailPoints: [],
        trailLine: null,
        moons: moonEntries
      });
    });

    // 3. Build Asteroid Belt, Kuiper Belt & Conceptual Oort Cloud
    this._buildBelts(preset);

    // Position all bodies at initial epoch
    this.updatePositions(0);
  }

  _createOrbitLine(bData, isDwarf) {
    const elem = this.datasets.orbitalData.elementsJ2000[bData.id] || {
      aAU: bData.meanDistanceFromSunMkm.au || 1,
      e: bData.orbitalEccentricity?.value || 0,
      iDeg: bData.orbitalInclinationDeg?.value || 0,
      omegaNodeDeg: 0,
      wPerihelionDeg: 0
    };
    const pts = [];
    const steps = 128;
    for (let s = 0; s <= steps; s++) {
      const meanAnomaly = (s / steps) * Math.PI * 2;
      pts.push(this._keplerPositionFromAnomaly(elem, meanAnomaly));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: isDwarf ? '#fbbf24' : bData.colorHex,
      transparent: true,
      opacity: isDwarf ? 0.26 : 0.42
    });
    const line = new THREE.Line(geom, mat);
    line.userData = { isDwarf };
    return line;
  }

  /**
   * Solves Kepler's Equation M = E - e*sin(E) via Newton-Raphson iteration
   * and transforms orbital plane coordinates into 3D ecliptic scene coordinates.
   */
  _keplerPositionFromAnomaly(elem, M) {
    const e = Math.min(0.85, elem.e || 0);
    let E = M;
    for (let iter = 0; iter < 5; iter++) {
      E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    const xv = elem.aAU * (Math.cos(E) - e);
    const yv = elem.aAU * (Math.sqrt(1 - e * e) * Math.sin(E));
    const v = Math.atan2(yv, xv);
    const rAU = Math.hypot(xv, yv);
    const rScene = this.scaleManager.auToSceneDistance(rAU);

    const iRad = ((elem.iDeg || 0) * Math.PI) / 180;
    const nodeRad = ((elem.omegaNodeDeg || 0) * Math.PI) / 180;
    const periRad = (((elem.wPerihelionDeg || 0) - (elem.omegaNodeDeg || 0)) * Math.PI) / 180;
    const u = v + periRad;

    const x = rScene * (Math.cos(nodeRad) * Math.cos(u) - Math.sin(nodeRad) * Math.sin(u) * Math.cos(iRad));
    const z = rScene * (Math.sin(nodeRad) * Math.cos(u) + Math.cos(nodeRad) * Math.sin(u) * Math.cos(iRad));
    const y = rScene * (Math.sin(u) * Math.sin(iRad));
    return new THREE.Vector3(x, y, z);
  }

  _buildBelts(preset) {
    this.beltsGroup.clear();
    const density = this.beltDensityMultiplier;

    // Main Asteroid Belt (2.1 - 3.3 AU) using Three.js InstancedMesh
    const astCount = Math.max(40, Math.floor((preset.asteroidCount || 300) * density));
    const astGeom = new THREE.IcosahedronGeometry(0.32, 0);
    const astMat = new THREE.MeshStandardMaterial({ color: '#9ca3af', emissive: '#4b5563', emissiveIntensity: 0.1 });
    this.asteroidInstancedMesh = new THREE.InstancedMesh(astGeom, astMat, astCount);
    const dummyMat = new THREE.Matrix4();

    for (let i = 0; i < astCount; i++) {
      const au = 2.15 + (i / astCount) * 1.12 + (Math.sin(i * 19.7) * 0.08);
      const rScene = this.scaleManager.auToSceneDistance(au);
      const theta = (i * 2.39996) % (Math.PI * 2);
      const y = Math.sin(i * 7.13) * 2.2;
      const s = 0.45 + (i % 5) * 0.22;
      dummyMat.compose(
        new THREE.Vector3(Math.cos(theta) * rScene, y, Math.sin(theta) * rScene),
        new THREE.Vector3(i * 0.4, i * 0.7, 0),
        new THREE.Vector3(s, s * 0.75, s)
      );
      this.asteroidInstancedMesh.setMatrixAt(i, dummyMat);
    }
    this.asteroidInstancedMesh.visible = this.showAsteroidBelt;
    this.beltsGroup.add(this.asteroidInstancedMesh);

    // Highlighted Representative Asteroid: 4 Vesta (Selectable in Asteroid Belt)
    const vestaRadius = 0.65;
    const vestaMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(vestaRadius, 1),
      new THREE.MeshStandardMaterial({ color: '#d1d5db', emissive: '#38bdf8', emissiveIntensity: 0.22 })
    );
    const vestaR = this.scaleManager.auToSceneDistance(2.36);
    vestaMesh.position.set(Math.cos(1.1) * vestaR, 0.8, Math.sin(1.1) * vestaR);
    this.beltsGroup.add(vestaMesh);
    this.engine.registerSelectable(vestaMesh, {
      id: 'vesta-asteroid',
      type: 'belt-object',
      name: '4 Vesta (Representative Main-Belt Asteroid)',
      data: {
        id: 'vesta-asteroid',
        name: '4 Vesta (Representative Asteroid)',
        classification: 'Main-Belt Asteroid (Protoplanet)',
        diameterKm: { value: 525, unit: 'km', approx: true, source: 'NASA NSSDCA Asteroid Fact Sheet (local sources.json)' },
        meanDistanceFromSunMkm: { value: 353, au: 2.36, unit: '10^6 km', approx: true },
        orbitalPeriodDays: { value: 1325, unit: 'days', approx: true },
        rotationPeriodHours: { value: 5.34, unit: 'hours', approx: false },
        facts: [
          '4 Vesta is the second-most-massive body in the Main Asteroid Belt after dwarf planet Ceres, explored by NASA\'s Dawn spacecraft in 2011–2012.',
          'The Main Asteroid Belt lies between Mars and Jupiter (2.1 to 3.3 AU) and is rendered in ATLAS using instanced geometry for optimal GPU frame rates.'
        ]
      }
    });

    // Kuiper Belt (30 - 50 AU) using InstancedMesh
    const kuiperCount = Math.max(40, Math.floor((preset.kuiperCount || 220) * density));
    const kuiperGeom = new THREE.IcosahedronGeometry(0.42, 0);
    const kuiperMat = new THREE.MeshStandardMaterial({ color: '#7dd3fc', emissive: '#0284c7', emissiveIntensity: 0.18 });
    this.kuiperInstancedMesh = new THREE.InstancedMesh(kuiperGeom, kuiperMat, kuiperCount);

    for (let i = 0; i < kuiperCount; i++) {
      const au = 31.0 + (i / kuiperCount) * 19.0;
      const rScene = this.scaleManager.auToSceneDistance(au);
      const theta = (i * 3.883) % (Math.PI * 2);
      const y = Math.cos(i * 5.3) * 6.5;
      const s = 0.55 + (i % 4) * 0.25;
      dummyMat.compose(
        new THREE.Vector3(Math.cos(theta) * rScene, y, Math.sin(theta) * rScene),
        new THREE.Vector3(i * 0.2, i * 0.5, 0),
        new THREE.Vector3(s, s, s)
      );
      this.kuiperInstancedMesh.setMatrixAt(i, dummyMat);
    }
    this.kuiperInstancedMesh.visible = this.showKuiperBelt;
    this.beltsGroup.add(this.kuiperInstancedMesh);

    // Conceptual Oort Cloud Spherical Shell (Clearly Labeled Conceptual Visualization)
    const oortCount = Math.max(80, Math.floor((preset.oortCount || 400) * density));
    const oortPositions = new Float32Array(oortCount * 3);
    const oortColors = new Float32Array(oortCount * 3);
    const baseShellR = this.scaleManager.auToSceneDistance(82);

    for (let i = 0; i < oortCount; i++) {
      const u = (i + 0.5) / oortCount;
      const phi = Math.acos(1 - 2 * u);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = baseShellR + (i % 7) * 8.0;
      oortPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      oortPositions[i * 3 + 1] = r * Math.cos(phi);
      oortPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      oortColors[i * 3] = 0.48;
      oortColors[i * 3 + 1] = 0.82;
      oortColors[i * 3 + 2] = 0.98;
    }
    const oortGeom = new THREE.BufferGeometry();
    oortGeom.setAttribute('position', new THREE.Float32BufferAttribute(oortPositions, 3));
    oortGeom.setAttribute('color', new THREE.Float32BufferAttribute(oortColors, 3));
    const oortMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.45
    });
    this.oortCloudPoints = new THREE.Points(oortGeom, oortMat);
    this.oortCloudPoints.visible = this.showOortCloud;
    this.beltsGroup.add(this.oortCloudPoints);
  }

  rebuildForScaleOrPreset(preset) {
    this.engine.clearSelectables();
    this.build(preset);
  }

  updatePositions(dtSeconds) {
    if (this.isPlaying && dtSeconds > 0) {
      const speedMult = this.labOverrides.active ? this.labOverrides.orbitalSpeedMultiplier : 1.0;
      this.simDaysSinceJ2000 += dtSeconds * this.simSpeedDaysPerSec * speedMult;
    }

    // Animate Sun photosphere, counter-rotating chromosphere, pulsing corona shells & prominence loops
    const sunEntry = this.bodies.get('sun');
    if (sunEntry && sunEntry.mesh) {
      sunEntry.mesh.rotation.y += dtSeconds * 0.14;
      if (sunEntry.chromoMesh) {
        sunEntry.chromoMesh.rotation.y -= dtSeconds * 0.09;
        sunEntry.chromoMesh.rotation.x += dtSeconds * 0.04;
      }
      const pulsePhase = performance.now() * 0.0022;
      if (sunEntry.coronaShells) {
        sunEntry.coronaShells.forEach((cMesh, idx) => {
          const s = (1.12 + idx * 0.18) * (1.0 + Math.sin(pulsePhase + idx * 1.3) * 0.025);
          cMesh.scale.set(s / (1.12 + idx * 0.18), s / (1.12 + idx * 0.18), s / (1.12 + idx * 0.18));
        });
      }
      if (sunEntry.prominenceLoops) {
        sunEntry.prominenceLoops.forEach((loop, idx) => {
          const pScale = 0.92 + 0.16 * Math.sin(pulsePhase * 1.4 + idx * 1.7);
          loop.scale.set(pScale, pScale, 1.0);
        });
      }
    }

    this.bodies.forEach((entry, id) => {
      if (id === 'sun') return;
      const elem = this.datasets.orbitalData.elementsJ2000[id];
      if (!elem) return;

      const period = elem.periodDays || 365.256;
      const M0 = ((elem.L0Deg || 0) - (elem.wPerihelionDeg || 0)) * (Math.PI / 180);
      const meanAnomaly = M0 + ((this.simDaysSinceJ2000 / period) * Math.PI * 2);
      const pos = this._keplerPositionFromAnomaly(elem, meanAnomaly);
      entry.group.position.copy(pos);

      // Apply lab axial tilt or default axial tilt
      let tiltDeg = entry.data.axialTiltDeg?.value || 0;
      if (this.labOverrides.active && this.labOverrides.targetBodyId === id && this.labOverrides.axialTiltOverrideDeg !== null) {
        tiltDeg = this.labOverrides.axialTiltOverrideDeg;
      }
      entry.mesh.rotation.z = (tiltDeg * Math.PI) / 180;
      if (entry.poleLine) {
        entry.poleLine.visible = this.labOverrides.active && this.labOverrides.targetBodyId === id;
      }

      // Sidereal rotation animation
      const rotHours = entry.data.rotationPeriodHours?.value || 24;
      const rotDir = rotHours < 0 ? -1 : 1;
      const labRotMult = (this.labOverrides.active && this.labOverrides.targetBodyId === id)
        ? this.labOverrides.rotationSpeedMultiplier
        : 1.0;
      entry.mesh.rotation.y += dtSeconds * rotDir * (24 / Math.max(4, Math.abs(rotHours))) * 0.65 * labRotMult;
      if (entry.cloudMesh) {
        entry.cloudMesh.rotation.y += dtSeconds * 0.18 * labRotMult;
      }

      // Update orbiting moons around parent planet
      entry.moons.forEach((m) => {
        const mPeriod = Math.max(0.3, m.data.orbitalPeriodDays?.value || 5);
        const dir = m.data.orbitalPeriodDays?.retrograde ? -1 : 1;
        const mAngle = m.phaseOffset + dir * ((this.simDaysSinceJ2000 / mPeriod) * Math.PI * 0.35);
        m.mesh.position.set(
          Math.cos(mAngle) * m.orbitDist,
          Math.sin(mAngle * 0.5) * (m.orbitDist * 0.06),
          Math.sin(mAngle) * m.orbitDist
        );
      });
    });

    if (this.asteroidInstancedMesh) {
      this.asteroidInstancedMesh.rotation.y += dtSeconds * 0.025;
    }
    if (this.kuiperInstancedMesh) {
      this.kuiperInstancedMesh.rotation.y += dtSeconds * 0.008;
    }
  }

  getSimulationDateISO() {
    const ms = this.j2000EpochMs + this.simDaysSinceJ2000 * 86400000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return '2026-11-15';
    return d.toISOString().slice(0, 10);
  }

  jumpToDate(dateStr) {
    const parsed = Date.parse(dateStr);
    if (!Number.isNaN(parsed)) {
      this.simDaysSinceJ2000 = (parsed - this.j2000EpochMs) / 86400000;
      this.updatePositions(0);
      return true;
    }
    return false;
  }
}
