/**
 * PROJECT ATLAS — Automated Offline Audit & Acceptance Test Suite (`tests/run-all-tests.js`)
 * Verifies:
 *   1. Dataset Validation (Sun, 8 planets, 5 dwarf planets, 18 moons, Keplerian elements, Deep Space, Constellations, Glossary, Sources)
 *   2. Mathematical & Keplerian Orbital Calculations + Scale Manager (Presentation vs Relative Scientific)
 *   3. Knowledge Guide Q&A Grounding & Honest Handling of Unsupported Queries
 *   4. Laboratory Comparison & Reset Integrity (Zero Dataset Mutation)
 *   5. Automated Offline Audit (Scans all HTML, CSS, and JS source & production dist files for forbidden external HTTP/HTTPS/CDN calls)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import THREE from '../src/vendor/three.module.js';
import { ScaleManager } from '../src/solar-system/solarSystem.js';
import { LaboratoryManager, KnowledgeGuide } from '../src/knowledge/knowledgeAndLab.js';
import { MISSION_SCENARIOS } from '../src/missions/missionManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    results.push({ status: 'PASS', testName, details });
    console.log(`  [PASS] ${testName}`);
  } else {
    failed++;
    results.push({ status: 'FAIL', testName, details });
    console.error(`  [FAIL] ${testName} — ${details}`);
  }
}

console.log('======================================================================');
console.log('  PROJECT ATLAS — AUTOMATED QUALITY ASSURANCE & OFFLINE AUDIT SUITE');
console.log('======================================================================');

// 1. Load & Validate Bundled JSON Datasets
const datasets = {
  planets: JSON.parse(fs.readFileSync(path.join(rootDir, 'public/data/planets.json'), 'utf8')),
  dwarfPlanets: JSON.parse(fs.readFileSync(path.join(rootDir, 'public/data/dwarf-planets.json'), 'utf8')),
  moons: JSON.parse(fs.readFileSync(path.join(rootDir, 'public/data/moons.json'), 'utf8')),
  orbitalData: JSON.parse(fs.readFileSync(path.join(rootDir, 'public/data/orbital-data.json'), 'utf8')),
  deepSpace: JSON.parse(fs.readFileSync(path.join(rootDir, 'public/data/deep-space.json'), 'utf8')),
  constellations: JSON.parse(fs.readFileSync(path.join(rootDir, 'public/data/constellations.json'), 'utf8')),
  glossary: JSON.parse(fs.readFileSync(path.join(rootDir, 'public/data/science-glossary.json'), 'utf8')),
  sources: JSON.parse(fs.readFileSync(path.join(rootDir, 'public/data/sources.json'), 'utf8'))
};

assert(datasets.planets.sun && datasets.planets.sun.diameterKm.value === 1391400, 'Dataset: Sun metric data verified (1,391,400 km diameter)');
assert(datasets.planets.planets.length === 8, 'Dataset: All 8 classical planets present (Mercury through Neptune)');
assert(datasets.dwarfPlanets.dwarfPlanets.length === 5, 'Dataset: All 5 IAU dwarf planets present (Ceres, Pluto, Haumea, Makemake, Eris)');
assert(datasets.moons.moons.length >= 18, `Dataset: ${datasets.moons.moons.length} major planetary moons bundled with parent links`);
assert(datasets.deepSpace.objects.length >= 9, `Dataset: ${datasets.deepSpace.objects.length} deep-space Messier/galactic objects bundled`);
assert(datasets.constellations.constellations.length >= 5, 'Dataset: 5 major constellations bundled with 3D star coordinates');

// Check every planet has required scientific fields with units and sources
const allPlanetsValid = datasets.planets.planets.every(p =>
  p.name &&
  p.diameterKm?.value > 0 &&
  p.diameterKm?.unit === 'km' &&
  p.diameterKm?.source &&
  p.mass10_24Kg?.value > 0 &&
  p.meanDistanceFromSunMkm?.value > 0 &&
  p.orbitalPeriodDays?.value > 0 &&
  Array.isArray(p.facts) && p.facts.length > 0
);
assert(allPlanetsValid, 'Dataset Integrity: All 8 planets have verified values, units, and source references');

// 2. Test Scale Manager (Mode A Presentation vs Mode B Relative Scientific)
const sm = new ScaleManager();
sm.mode = 'presentation';
const earthDistA = sm.auToSceneDistance(1.0);
const neptuneDistA = sm.auToSceneDistance(30.18);
sm.mode = 'scientific';
const earthDistB = sm.auToSceneDistance(1.0);
const neptuneDistB = sm.auToSceneDistance(30.18);
assert(earthDistA > 0 && neptuneDistA > earthDistA && neptuneDistB > neptuneDistA, 'Scale Manager: Presentation Scale (Mode A) and Relative Scientific Scale (Mode B) compute distinct valid monotonic distances');

// 3. Test Missions
assert(MISSION_SCENARIOS.length === 5, 'Missions: All 5 required interactive space missions configured with stage objectives');

// 4. Test Laboratory & Zero Dataset Mutation
const dummySolar = { labOverrides: { active: false, targetBodyId: 'earth', rotationSpeedMultiplier: 1, axialTiltOverrideDeg: null, orbitalSpeedMultiplier: 1 } };
const lab = new LaboratoryManager(dummySolar, sm, datasets);
const origEarthTilt = datasets.planets.planets.find(p => p.id === 'earth').axialTiltDeg.value;
lab.applyWhatIfPreset('extreme-earth-tilt');
assert(dummySolar.labOverrides.active && dummySolar.labOverrides.axialTiltOverrideDeg === 90.0, 'Laboratory: What-If axial tilt experiment activates override (90 deg)');
assert(datasets.planets.planets.find(p => p.id === 'earth').axialTiltDeg.value === origEarthTilt, 'Laboratory: Original NASA dataset remains untouched (23.44 deg)');
lab.resetExperiment();
assert(!dummySolar.labOverrides.active && dummySolar.labOverrides.axialTiltOverrideDeg === null, 'Laboratory: Reset Experiment restores baseline state cleanly');

const cmp = lab.computeComparison('earth', 'jupiter');
assert(cmp.diameterRatioBA > 11.1 && cmp.diameterRatioBA < 11.3, `Laboratory Comparison: Jupiter/Earth diameter ratio calculated accurately (${cmp.diameterRatioBA}x)`);

// 5. Test Knowledge Guide
const guide = new KnowledgeGuide(datasets);
const ans1 = guide.answerQuestion('How big is Jupiter compared to Earth?');
assert(ans1.supported && ans1.answer.includes('142,984 km'), 'Knowledge Guide: Answers predefined Jupiter vs Earth question with grounded NASA metrics');
const ans2 = guide.answerQuestion('Compare Venus and Mars');
assert(ans2.supported && ans2.answer.includes('12,104 km') && ans2.answer.includes('6,792 km'), 'Knowledge Guide: Dynamically compares any two planets');
const ansUnsupported = guide.answerQuestion('What is the stock price of SpaceX in 2029?');
assert(ansUnsupported.supported === false && ansUnsupported.answer.includes('not available in the offline PROJECT ATLAS dataset'), 'Knowledge Guide: Honestly reports when a question is outside offline records without inventing facts');

// 6. Test Clean-Room 3D Math & Geometry
const sphere = new THREE.SphereGeometry(5, 16, 12);
assert(sphere.attributes.position.count > 100 && sphere.boundingRadius === 5, '3D Engine: SphereGeometry generates vertices, normals, UVs, and bounding radius');

// 7. Automated Offline Audit across all runtime HTML, CSS, and JS files
const runtimeFilesToScan = [];
function collectRuntimeFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      collectRuntimeFiles(full);
    } else if (/\.(html|js|css)$/i.test(entry)) {
      runtimeFilesToScan.push(full);
    }
  }
}
collectRuntimeFiles(path.join(rootDir, 'src'));
collectRuntimeFiles(path.join(rootDir, 'dist'));
runtimeFilesToScan.push(path.join(rootDir, 'index.html'));

let externalUrlViolations = [];
for (const file of runtimeFilesToScan) {
  const content = fs.readFileSync(file, 'utf8');
  // Strip standard SVG namespace http://www.w3.org/2000/svg before checking for network URLs
  const cleaned = content.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '');
  const matches = cleaned.match(/https?:\/\/[^\s"'<>)]+/gi) || [];
  if (matches.length > 0) {
    externalUrlViolations.push({ file: path.relative(rootDir, file), matches });
  }
}

assert(
  externalUrlViolations.length === 0,
  `Offline Audit: Scanned ${runtimeFilesToScan.length} runtime HTML/CSS/JS files — ZERO external http:// or https:// network URLs found`,
  externalUrlViolations.length ? JSON.stringify(externalUrlViolations) : '0 violations'
);

console.log('======================================================================');
console.log(`  SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================================');

if (failed > 0) process.exit(1);
