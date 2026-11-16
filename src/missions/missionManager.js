/**
 * PROJECT ATLAS — Interactive Space Missions Manager (5 Guided Educational Journeys)
 */
import THREE from '../vendor/three.module.js';

export const MISSION_SCENARIOS = [
  {
    id: 'mission-1-mars',
    number: 1,
    title: 'Mission 1: Earth to Mars Interplanetary Transfer',
    subtitle: 'Simulated Hohmann-Inspired Educational Journey from Earth to the Red Planet',
    disclaimer: 'EDUCATIONAL TRAJECTORY MODEL: Animated transfer curve and accelerated travel times are illustrative visual demonstrations, not mission-grade Lambert ephemerides.',
    durationSec: 18,
    originId: 'earth',
    destinationId: 'mars',
    modeRequired: 'SOLAR_SYSTEM',
    objectives: [
      { progress: 0.0, label: 'Stage 1: Departure from Low Earth Orbit (1.000 AU)', targetId: 'earth', info: 'Initializing ATLAS Explorer Probe at Earth (Diameter 12,756 km, Gravity 9.8 m/s²). Preparing trans-Mars injection burn.' },
      { progress: 0.35, label: 'Stage 2: Interplanetary Cruise & Time Acceleration', targetId: 'probe', info: 'Cruising across interplanetary space between 1.0 AU and 1.524 AU. Typical real-world Hohmann transfers take ~7 to 9 months.' },
      { progress: 0.78, label: 'Stage 3: Mars Approach & Phobos/Deimos Flyby', targetId: 'mars', info: 'Approaching Mars (Mean distance 228.0 million km) and its two captured-asteroid-like moons, Phobos (9,378 km) and Deimos (23,459 km).' },
      { progress: 1.0, label: 'Stage 4: Mars Orbital Insertion & Planetary Survey', targetId: 'mars', info: 'Arrived at Mars! Surface gravity is 3.73 m/s² (38% of Earth), atmosphere is 95.1% CO₂ (~6.36 mb), and solar day is 24.66 hours.' }
    ]
  },
  {
    id: 'mission-2-jupiter',
    number: 2,
    title: 'Mission 2: Explore Jupiter & Galilean Moons',
    subtitle: 'Survey the King of Planets, the Great Red Spot, and Europa\'s Ice Shell',
    disclaimer: 'EDUCATIONAL TRAJECTORY MODEL: Simplified transfer path and accelerated flight time for classroom and science fair exploration.',
    durationSec: 20,
    originId: 'earth',
    destinationId: 'jupiter',
    modeRequired: 'SOLAR_SYSTEM',
    objectives: [
      { progress: 0.0, label: 'Stage 1: Outer Solar System Departure toward 5.204 AU', targetId: 'earth', info: 'Departing Earth bound for Jupiter across the Main Asteroid Belt (2.1–3.3 AU).' },
      { progress: 0.35, label: 'Stage 2: Jovian Approach & Great Red Spot Inspection', targetId: 'jupiter', info: 'Approaching Jupiter (Diameter 142,984 km, Mass 317.8x Earth, 9.925-hour rotation) and inspecting its turbulent ammonia cloud bands and Great Red Spot.' },
      { progress: 0.70, label: 'Stage 3: Galilean Moon Tour (Io, Ganymede, Callisto)', targetId: 'jupiter', info: 'Surveying the four Galilean moons: volcanic Io (421,800 km), giant Ganymede (5,262.4 km diameter), and cratered Callisto (1,882,700 km).' },
      { progress: 1.0, label: 'Stage 4: Europa Close-Up & Subsurface Ocean Study', targetId: 'europa', info: 'Focused on Europa (Diameter 3,121.6 km, Albedo 0.68)—a premier astrobiology target hosting a global liquid saltwater ocean beneath its fractured ice shell.' }
    ]
  },
  {
    id: 'mission-3-saturn',
    number: 3,
    title: 'Mission 3: Saturn, Its Rings & Ocean Worlds',
    subtitle: 'Inspect the Main Ring System (D, C, B, Cassini Division, A, F), Titan & Enceladus',
    disclaimer: 'EDUCATIONAL TRAJECTORY MODEL: Illustrative tour sequence highlighting ring divisions and satellite orbits.',
    durationSec: 20,
    originId: 'jupiter',
    destinationId: 'saturn',
    modeRequired: 'SOLAR_SYSTEM',
    objectives: [
      { progress: 0.0, label: 'Stage 1: Cruise from Jupiter (5.2 AU) to Saturn (9.57 AU)', targetId: 'jupiter', info: 'Departing the Jovian system toward Saturn at a mean distance of 1,432 million km from the Sun.' },
      { progress: 0.35, label: 'Stage 2: Saturn Orbital Arrival & Ring Plane Inspection', targetId: 'saturn', info: 'Orbiting Saturn (Diameter 120,536 km, Density 687 kg/m³, 26.73° axial tilt) and inspecting the B Ring, Cassini Division, and A Ring (66,900–140,220 km).' },
      { progress: 0.72, label: 'Stage 3: Titan Atmospheric Flyby (1,221,870 km)', targetId: 'titan', info: 'Inspecting Titan (Diameter 5,150 km), the only moon with a dense nitrogen-methane atmosphere and surface liquid hydrocarbon seas.' },
      { progress: 1.0, label: 'Stage 4: Enceladus South Polar Plume Survey (238,020 km)', targetId: 'enceladus', info: 'Arrived at Enceladus (Diameter 504 km, Albedo 1.0), where cryovolcanic water-ice geysers vent from a subsurface ocean into Saturn\'s E Ring.' }
    ]
  },
  {
    id: 'mission-4-kuiper',
    number: 4,
    title: 'Mission 4: Beyond Neptune — Kuiper Belt & Oort Cloud',
    subtitle: 'Journey to the Ice Frontier: Neptune, Pluto-Charon, and the Conceptual Oort Cloud',
    disclaimer: 'EDUCATIONAL TRAJECTORY MODEL: Oort Cloud shell (5,000–100,000 AU) is a conceptual visualization; individual Oort objects are not directly mapped.',
    durationSec: 20,
    originId: 'neptune',
    destinationId: 'pluto',
    modeRequired: 'SOLAR_SYSTEM',
    objectives: [
      { progress: 0.0, label: 'Stage 1: Neptune & Retrograde Moon Triton (30.18 AU)', targetId: 'neptune', info: 'Starting at Neptune (4,515 million km) and its captured Kuiper Belt moon Triton (retrograde 5.88-day orbit).' },
      { progress: 0.40, label: 'Stage 2: Entering the Kuiper Belt (30–50 AU)', targetId: 'pluto', info: 'Crossing into the Kuiper Belt—an icy torus of planetesimals and dwarf planets (Pluto, Haumea, Makemake, Eris) preserved since 4.5 billion years ago.' },
      { progress: 0.75, label: 'Stage 3: Pluto & Charon Binary System Encounter (39.48 AU)', targetId: 'pluto', info: 'Inspecting Pluto (Diameter 2,376 km, nitrogen-methane ice plains) and its mutually tidally locked companion Charon (Diameter 1,212 km).' },
      { progress: 1.0, label: 'Stage 4: Conceptual Oort Cloud Overview (5,000–100,000 AU)', targetId: 'pluto', info: 'Activating Conceptual Oort Cloud shell visualization—marking the outer boundary of the Sun\'s gravitational sphere of influence.' }
    ]
  },
  {
    id: 'mission-5-galaxy',
    number: 5,
    title: 'Mission 5: Journey Through the Milky Way Galaxy',
    subtitle: 'Zoom Out from the Solar Neighborhood to the Galactic Disk & Andromeda',
    disclaimer: 'ARTISTIC SCIENTIFIC VISUALIZATION: Galactic disk and spiral arms are stylized 3D particle models grounded in astronomical scale (~100,000 ly diameter).',
    durationSec: 18,
    originId: 'solar-neighborhood',
    destinationId: 'milky-way',
    modeRequired: 'DEEP_SPACE',
    objectives: [
      { progress: 0.0, label: 'Stage 1: Departing the Solar Neighborhood (Orion-Cygnus Spur)', targetId: 'solar-neighborhood', info: 'Starting at the Solar System\'s approximate galactic position (~26,000 light-years from the Galactic Center in the Orion Arm).' },
      { progress: 0.40, label: 'Stage 2: Ascending Above the Galactic Disk (~100,000 ly Span)', targetId: 'milky-way', info: 'Zooming out to reveal the barred spiral structure of the Milky Way (~100–400 billion stars).' },
      { progress: 0.75, label: 'Stage 3: Inspecting the Galactic Center (Sagittarius A*)', targetId: 'milky-way', info: 'Focusing on the luminous central bulge and Sagittarius A*, the supermassive black hole at the core of our galaxy.' },
      { progress: 1.0, label: 'Stage 4: Local Group Perspective & Andromeda Galaxy (M31)', targetId: 'm31-andromeda', info: 'Surveying our nearest major spiral neighbor, Messier 31 (Andromeda Galaxy), located 2.5 million light-years away.' }
    ]
  }
];

export class MissionManager {
  constructor(engine, solarSystem, deepSpace, onMissionStateUpdate) {
    this.engine = engine;
    this.solarSystem = solarSystem;
    this.deepSpace = deepSpace;
    this.onMissionStateUpdate = onMissionStateUpdate;

    this.activeMission = null;
    this.progress = 0; // 0.0 to 1.0
    this.isPlaying = false;
    this.currentStageIndex = -1;

    this.missionGroup = new THREE.Group();
    this.engine.scene.add(this.missionGroup);
    this._buildSpacecraftMesh();
  }

  _buildSpacecraftMesh() {
    this.probeGroup = new THREE.Group();
    // Main spacecraft bus
    const bus = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.38, 1.3, 12),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', emissive: '#38bdf8', emissiveIntensity: 0.25 })
    );
    // High-gain dish antenna
    const dish = new THREE.Mesh(
      new THREE.ConeGeometry(0.68, 0.38, 16),
      new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#00f0ff', emissiveIntensity: 0.3 })
    );
    dish.position.set(0, 0.75, 0);
    // Solar array wings
    const wingGeom = new THREE.BoxGeometry(3.2, 0.06, 0.75);
    const wingMat = new THREE.MeshBasicMaterial({ color: '#0284c7', emissive: '#00f0ff', emissiveIntensity: 0.4 });
    const wings = new THREE.Mesh(wingGeom, wingMat);

    // Ion thruster glow
    const plume = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 0.8, 12),
      new THREE.MeshBasicMaterial({ color: '#00f0ff', transparent: true, opacity: 0.85 })
    );
    plume.position.set(0, -0.95, 0);

    this.probeGroup.add(bus);
    this.probeGroup.add(dish);
    this.probeGroup.add(wings);
    this.probeGroup.add(plume);
    this.probeGroup.visible = false;
    this.missionGroup.add(this.probeGroup);
  }

  startMission(missionId, switchModeCallback) {
    const scenario = MISSION_SCENARIOS.find(m => m.id === missionId) || MISSION_SCENARIOS[0];
    this.activeMission = scenario;
    this.progress = 0;
    this.isPlaying = true;
    this.currentStageIndex = -1;

    if (switchModeCallback) {
      switchModeCallback(scenario.modeRequired, true);
    }

    if (scenario.id === 'mission-4-kuiper') {
      this.solarSystem.showOortCloud = true;
      if (this.solarSystem.oortCloudPoints) this.solarSystem.oortCloudPoints.visible = true;
    }

    this._rebuildTrajectoryCurve();
    this.probeGroup.visible = true;
    this.update(0.016);
  }

  _getEndpointPosition(targetId) {
    if (this.activeMission?.modeRequired === 'DEEP_SPACE') {
      const node = this.deepSpace.objectNodes.get(targetId);
      if (node) return node.pos.clone();
      return new THREE.Vector3(0, 0, 0);
    }
    const body = this.solarSystem.bodies.get(targetId);
    if (body) return body.group.position.clone();
    // Check moons
    for (const [, pEntry] of this.solarSystem.bodies) {
      const m = pEntry.moons?.find(mn => mn.id === targetId);
      if (m) return m.mesh.getWorldPosition();
    }
    return new THREE.Vector3(0, 0, 0);
  }

  _rebuildTrajectoryCurve() {
    if (this.routeLine) {
      this.missionGroup.remove(this.routeLine);
      this.routeLine = null;
    }
    if (!this.activeMission) return;

    const pStart = this._getEndpointPosition(this.activeMission.originId);
    const pEnd = this._getEndpointPosition(this.activeMission.destinationId);
    const mid = pStart.clone().lerp(pEnd, 0.5);
    const span = pStart.distanceTo(pEnd);
    mid.y += Math.max(6, span * 0.14);
    mid.x += span * 0.12;

    this.curve = new THREE.CatmullRomCurve3([pStart, mid, pEnd]);
    const pts = this.curve.getPoints(64);
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: '#00f0ff', transparent: true, opacity: 0.78 });
    this.routeLine = new THREE.Line(geom, mat);
    this.missionGroup.add(this.routeLine);
  }

  pause() {
    this.isPlaying = false;
    this._notify();
  }

  resume() {
    if (this.activeMission) {
      if (this.progress >= 1.0) this.progress = 0;
      this.isPlaying = true;
      this._notify();
    }
  }

  restart(switchModeCallback) {
    if (this.activeMission) {
      this.startMission(this.activeMission.id, switchModeCallback);
    }
  }

  exit() {
    this.activeMission = null;
    this.isPlaying = false;
    this.progress = 0;
    this.probeGroup.visible = false;
    if (this.routeLine) {
      this.missionGroup.remove(this.routeLine);
      this.routeLine = null;
    }
    this._notify();
  }

  update(dtSeconds) {
    if (!this.activeMission) return;

    if (this.isPlaying) {
      this.progress = Math.min(1.0, this.progress + dtSeconds / this.activeMission.durationSec);
      if (this.progress >= 1.0) {
        this.isPlaying = false;
      }
    }

    this._rebuildTrajectoryCurve();
    if (this.curve) {
      const pos = this.curve.getPoint(this.progress);
      this.probeGroup.position.copy(pos);
      this.probeGroup.rotation.y += dtSeconds * 1.4;

      // Smoothly guide camera along spacecraft trajectory
      if (this.isPlaying) {
        this.engine.controls.target.lerp(pos, 0.12);
        const desiredCam = pos.clone().add(new THREE.Vector3(12, 9, 18));
        this.engine.camera.position.lerp(desiredCam, 0.08);
        this.engine.camera.lookAt(this.engine.controls.target);
        this.engine.controls.syncFromCamera();
      }
    }

    // Determine active stage objective
    let stageIdx = 0;
    const objs = this.activeMission.objectives;
    for (let i = 0; i < objs.length; i++) {
      if (this.progress >= objs[i].progress) stageIdx = i;
    }
    if (stageIdx !== this.currentStageIndex || this.isPlaying) {
      this.currentStageIndex = stageIdx;
      this._notify();
    }
  }

  _notify() {
    if (this.onMissionStateUpdate) {
      this.onMissionStateUpdate({
        mission: this.activeMission,
        progress: this.progress,
        isPlaying: this.isPlaying,
        stageIndex: this.currentStageIndex,
        currentObjective: this.activeMission ? this.activeMission.objectives[this.currentStageIndex] : null
      });
    }
  }
}
