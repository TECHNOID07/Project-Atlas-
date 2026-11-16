/**
 * PROJECT ATLAS — Astronomy Laboratory & Offline Atlas Knowledge Guide
 * Operates 100% locally on bundled NASA datasets without overwriting base records.
 */

export class LaboratoryManager {
  constructor(solarSystem, scaleManager, datasets) {
    this.solarSystem = solarSystem;
    this.scaleManager = scaleManager;
    this.datasets = datasets;

    this.defaultState = {
      targetBodyId: 'earth',
      compareBodyId: 'jupiter',
      rotationSpeedMultiplier: 1.0,
      axialTiltOverrideDeg: 23.44,
      orbitalSpeedMultiplier: 1.0,
      planetScaleMultiplier: 1.0,
      distanceScaleMultiplier: 1.0,
      activeWhatIfScenario: 'baseline'
    };
    this.state = { ...this.defaultState };
  }

  applyExperiment(partial, rebuildCallback) {
    this.state = { ...this.state, ...partial };
    this.solarSystem.labOverrides.active = true;
    this.solarSystem.labOverrides.targetBodyId = this.state.targetBodyId;
    this.solarSystem.labOverrides.rotationSpeedMultiplier = Number(this.state.rotationSpeedMultiplier) || 1.0;
    this.solarSystem.labOverrides.axialTiltOverrideDeg = Number(this.state.axialTiltOverrideDeg);
    this.solarSystem.labOverrides.orbitalSpeedMultiplier = Number(this.state.orbitalSpeedMultiplier) || 1.0;

    const scaleChanged =
      this.scaleManager.planetScaleMultiplier !== Number(this.state.planetScaleMultiplier) ||
      this.scaleManager.distanceScaleMultiplier !== Number(this.state.distanceScaleMultiplier);

    this.scaleManager.planetScaleMultiplier = Number(this.state.planetScaleMultiplier) || 1.0;
    this.scaleManager.distanceScaleMultiplier = Number(this.state.distanceScaleMultiplier) || 1.0;

    if (scaleChanged && rebuildCallback) {
      rebuildCallback();
    }
  }

  applyWhatIfPreset(presetId, rebuildCallback) {
    if (presetId === 'fast-earth-spin') {
      this.applyExperiment({
        targetBodyId: 'earth',
        rotationSpeedMultiplier: 10.0,
        axialTiltOverrideDeg: 23.44,
        activeWhatIfScenario: presetId
      }, rebuildCallback);
    } else if (presetId === 'extreme-earth-tilt') {
      this.applyExperiment({
        targetBodyId: 'earth',
        rotationSpeedMultiplier: 1.0,
        axialTiltOverrideDeg: 90.0,
        activeWhatIfScenario: presetId
      }, rebuildCallback);
    } else if (presetId === 'zero-earth-tilt') {
      this.applyExperiment({
        targetBodyId: 'earth',
        rotationSpeedMultiplier: 1.0,
        axialTiltOverrideDeg: 0.0,
        activeWhatIfScenario: presetId
      }, rebuildCallback);
    } else if (presetId === 'hyper-orbits') {
      this.applyExperiment({
        orbitalSpeedMultiplier: 8.0,
        activeWhatIfScenario: presetId
      }, rebuildCallback);
    } else {
      this.resetExperiment(rebuildCallback);
    }
  }

  resetExperiment(rebuildCallback) {
    this.state = { ...this.defaultState };
    this.solarSystem.labOverrides.active = false;
    this.solarSystem.labOverrides.rotationSpeedMultiplier = 1.0;
    this.solarSystem.labOverrides.axialTiltOverrideDeg = null;
    this.solarSystem.labOverrides.orbitalSpeedMultiplier = 1.0;
    this.scaleManager.planetScaleMultiplier = 1.0;
    this.scaleManager.distanceScaleMultiplier = 1.0;
    if (rebuildCallback) rebuildCallback();
  }

  computeComparison(bodyAId, bodyBId) {
    const all = [
      this.datasets.planets.sun,
      ...this.datasets.planets.planets,
      ...this.datasets.dwarfPlanets.dwarfPlanets
    ];
    const a = all.find(x => x.id === bodyAId) || this.datasets.planets.planets[2];
    const b = all.find(x => x.id === bodyBId) || this.datasets.planets.planets[4];

    const dA = a.diameterKm?.value || 1;
    const dB = b.diameterKm?.value || 1;
    const mA = a.mass10_24Kg?.value;
    const mB = b.mass10_24Kg?.value;
    const gA = a.gravityMs2?.value;
    const gB = b.gravityMs2?.value;
    const pA = a.orbitalPeriodDays?.value;
    const pB = b.orbitalPeriodDays?.value;
    const distA = a.meanDistanceFromSunMkm?.value ?? 0;
    const distB = b.meanDistanceFromSunMkm?.value ?? 0;

    return {
      bodyA: a,
      bodyB: b,
      diameterRatioAB: +(dA / dB).toFixed(3),
      diameterRatioBA: +(dB / dA).toFixed(3),
      massRatioBA: (mA && mB) ? +(mB / mA).toFixed(3) : null,
      gravityRatioBA: (gA && gB) ? +(gB / gA).toFixed(2) : null,
      periodRatioBA: (pA && pB) ? +(pB / pA).toFixed(2) : null,
      distanceDiffMkm: Math.abs(distB - distA).toFixed(1),
      weightOf100NNativeA: gA ? +((gA / 9.80665) * 100).toFixed(1) : null,
      weightOf100NNativeB: gB ? +((gB / 9.80665) * 100).toFixed(1) : null
    };
  }
}

export class KnowledgeGuide {
  constructor(datasets) {
    this.datasets = datasets;
    this._buildSearchIndex();
  }

  _buildSearchIndex() {
    this.entries = [];

    // Index Sun
    const sun = this.datasets.planets.sun;
    this.entries.push({
      id: sun.id,
      name: sun.name,
      category: 'Star',
      classification: sun.classification,
      summary: `Diameter: ${sun.diameterKm.value.toLocaleString()} km | Mass: ${sun.mass10_24Kg.value.toLocaleString()} × 10²⁴ kg | Gravity: ${sun.gravityMs2.value} m/s² | Effective Temp: ${sun.temperatureC.kelvin} K (${sun.temperatureC.value} °C)`,
      facts: sun.facts,
      raw: sun
    });

    // Index 8 Classical Planets
    this.datasets.planets.planets.forEach(p => {
      this.entries.push({
        id: p.id,
        name: p.name,
        category: 'Planet',
        classification: p.classification,
        summary: `Diameter: ${p.diameterKm.value.toLocaleString()} km | Distance: ${p.meanDistanceFromSunMkm.value}M km (${p.meanDistanceFromSunMkm.au} AU) | Year: ${p.orbitalPeriodDays.value} days | Gravity: ${p.gravityMs2.value} m/s² | Moons: ${p.knownMoonsCount}`,
        facts: p.facts,
        raw: p
      });
    });

    // Index 5 Dwarf Planets
    this.datasets.dwarfPlanets.dwarfPlanets.forEach(d => {
      this.entries.push({
        id: d.id,
        name: d.name,
        category: 'Dwarf Planet',
        classification: d.classification,
        summary: `Diameter: ~${d.diameterKm.value.toLocaleString()} km | Distance: ${d.meanDistanceFromSunMkm.value}M km (${d.meanDistanceFromSunMkm.au} AU) | Year: ${d.orbitalPeriodDays.value.toLocaleString()} days | Moons: ${d.knownMoonsCount}`,
        facts: d.facts,
        raw: d
      });
    });

    // Index Moons
    this.datasets.moons.moons.forEach(m => {
      this.entries.push({
        id: m.id,
        name: m.name,
        category: 'Moon',
        classification: `Satellite of ${m.parentName}`,
        summary: `Parent: ${m.parentName} | Diameter: ${m.diameterKm.value} km | Distance from ${m.parentName}: ${m.distanceFromParentKm.value.toLocaleString()} km | Orbital Period: ${m.orbitalPeriodDays.value} days`,
        facts: m.facts,
        raw: m
      });
    });

    // Index Deep Space
    this.datasets.deepSpace.objects.forEach(o => {
      this.entries.push({
        id: o.id,
        name: `${o.name} (${o.catalogId})`,
        category: 'Deep Space',
        classification: o.type,
        summary: `Constellation: ${o.constellation} | Distance: ${o.distanceLy.display} | Apparent Magnitude: ${o.apparentMagnitude}`,
        facts: [o.description, `Visual Representation Note: ${o.representationNote}`],
        raw: o
      });
    });

    // Index Belt Regions
    this.datasets.orbitalData.beltRegions.forEach(b => {
      this.entries.push({
        id: b.id,
        name: b.name,
        category: 'Solar System Region',
        classification: b.rangeAU,
        summary: `Range: ${b.rangeAU} | Representative Objects: ${b.representativeObjects.join(', ')}`,
        facts: [b.description, b.visualizationNote],
        raw: b
      });
    });

    // Index Glossary Terms
    this.datasets.glossary.terms.forEach(t => {
      this.entries.push({
        id: `term-${t.term.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: t.term,
        category: 'Glossary Term',
        classification: t.category,
        summary: t.definition,
        facts: [t.definition],
        raw: t
      });
    });
  }

  search(query = '', categoryFilter = 'ALL') {
    const q = query.trim().toLowerCase();
    return this.entries.filter(item => {
      if (categoryFilter !== 'ALL' && item.category.toUpperCase() !== categoryFilter.toUpperCase()) {
        return false;
      }
      if (!q) return true;
      const hay = `${item.name} ${item.category} ${item.classification} ${item.summary} ${(item.facts || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }

  answerQuestion(rawQuestion = '') {
    const q = rawQuestion.trim().toLowerCase();
    if (!q) {
      return {
        supported: true,
        title: 'Offline Atlas Knowledge Guide Ready',
        answer: 'Select a predefined question or type an astronomy question or celestial body name above. All answers are generated strictly from locally bundled NASA NSSDCA and Hubble Messier datasets with zero online AI or internet requests.'
      };
    }

    // 1. Check predefined curated Q&A templates
    for (const qa of this.datasets.glossary.predefinedQA) {
      if (qa.question.toLowerCase() === q || qa.keywords.some(k => q.includes(k))) {
        return {
          supported: true,
          title: qa.question,
          answer: qa.answer,
          source: 'NASA NSSDCA Planetary Fact Sheet / Bundled Offline Knowledge Base'
        };
      }
    }

    // 2. Check dynamic two-planet comparison pattern ("compare X and Y" or "X vs Y")
    const allBodies = [
      this.datasets.planets.sun,
      ...this.datasets.planets.planets,
      ...this.datasets.dwarfPlanets.dwarfPlanets
    ];
    const mentioned = allBodies.filter(b => q.includes(b.name.toLowerCase()));
    if (mentioned.length >= 2 && (q.includes('compare') || q.includes('vs') || q.includes('bigger') || q.includes('difference'))) {
      const [a, b] = mentioned;
      const ratio = (a.diameterKm.value / b.diameterKm.value).toFixed(2);
      return {
        supported: true,
        title: `Comparison: ${a.name} vs. ${b.name}`,
        answer: `${a.name} has a diameter of ${a.diameterKm.value.toLocaleString()} km (${a.classification}), while ${b.name} has a diameter of ${b.diameterKm.value.toLocaleString()} km (${b.classification})—a diameter ratio of ${ratio}:1. Mean distance from Sun: ${a.name} (${a.meanDistanceFromSunMkm.value}M km) vs. ${b.name} (${b.meanDistanceFromSunMkm.value}M km). Orbital period: ${a.name} (${a.orbitalPeriodDays.value} days) vs. ${b.name} (${b.orbitalPeriodDays.value} days). Known moons: ${a.name} (${a.knownMoonsCount}) vs. ${b.name} (${b.knownMoonsCount}).`,
        source: 'NASA NSSDCA Planetary Fact Sheet - Metric'
      };
    }

    // 3. Check if asking for moons of a specific planet
    if (q.includes('moon') && mentioned.length === 1) {
      const p = mentioned[0];
      const pMoons = this.datasets.moons.moons.filter(m => m.parentId === p.id);
      const moonNames = pMoons.length > 0 ? pMoons.map(m => `${m.name} (${m.diameterKm.value} km)`).join(', ') : 'None featured in detailed 3D view';
      return {
        supported: true,
        title: `Moons of ${p.name}`,
        answer: `${p.name} has ${p.knownMoonsCount} confirmed moons in the bundled NASA dataset. Detailed satellites in ATLAS for ${p.name}: ${moonNames}.`,
        source: 'NASA NSSDCA Satellite Fact Sheets'
      };
    }

    // 4. Direct entity match in local index
    const matches = this.search(q, 'ALL');
    if (matches.length > 0) {
      const top = matches[0];
      return {
        supported: true,
        title: `${top.name} (${top.classification})`,
        answer: `${top.summary}. ${(top.facts || []).join(' ')}`,
        source: 'Bundled Local ATLAS Dataset'
      };
    }

    // 5. Honest offline fallback when outside bundled records
    return {
      supported: false,
      title: 'Topic Outside Offline Bundled Dataset',
      answer: 'This specific question is not available in the offline PROJECT ATLAS dataset. ATLAS operates 100% offline without generative AI or internet access to prevent fabricated facts. Try querying any of the 8 planets, 5 dwarf planets, 18 major moons, 9 Messier deep-space objects, 5 constellations, or astronomy glossary terms.'
    };
  }
}
