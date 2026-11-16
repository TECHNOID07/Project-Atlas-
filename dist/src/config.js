/**
 * PROJECT ATLAS — Global Configuration & Hardware Presets
 * Tuned specifically for HP ProBook 640 (Intel Core i5-6300U, 8 GB DDR4, Integrated Graphics)
 */

export const ATLAS_CONFIG = {
  appName: 'PROJECT ATLAS',
  subtitle: 'INTERACTIVE UNIVERSE EXPLORER',
  version: '2.0.0-CINEMATIC-ULTRA',
  targetHardware: 'HP ProBook 640 (Intel Core i5-6300U, 8 GB DDR4, Integrated GPU)',
  referenceEpoch: 'J2000.0 (2000-01-01T12:00:00Z)',
  defaultScaleMode: 'presentation', // 'presentation' | 'scientific'
  defaultGraphicsPreset: 'MEDIUM',  // Auto-detected on startup ('LOW' | 'MEDIUM' | 'HIGH')
  presets: {
    LOW: {
      label: 'LOW (720p Target / Integrated GPU Safe)',
      maxHeight: 720,
      pixelRatio: 0.85,
      starCount: 1600,
      asteroidCount: 180,
      kuiperCount: 140,
      oortCount: 250,
      galaxyParticles: 1600,
      sphereSegments: [24, 16],
      heroSphereSegments: [32, 22],
      textureWidth: 256,
      glowEnabled: true,
      cloudsEnabled: true,
      prominencesEnabled: true,
      shootingStarsEnabled: true,
      trailsEnabled: false,
      targetFps: 30
    },
    MEDIUM: {
      label: 'MEDIUM (Balanced ProBook 640 / Projector Recommended)',
      maxHeight: 900,
      pixelRatio: 1.0,
      starCount: 3800,
      asteroidCount: 360,
      kuiperCount: 260,
      oortCount: 480,
      galaxyParticles: 3400,
      sphereSegments: [36, 24],
      heroSphereSegments: [48, 32],
      textureWidth: 512,
      glowEnabled: true,
      cloudsEnabled: true,
      prominencesEnabled: true,
      shootingStarsEnabled: true,
      trailsEnabled: true,
      targetFps: 30
    },
    HIGH: {
      label: 'HIGH (Cinematic Ultra Detail & Particle Density)',
      maxHeight: 1080,
      pixelRatio: 1.25,
      starCount: 6800,
      asteroidCount: 640,
      kuiperCount: 460,
      oortCount: 850,
      galaxyParticles: 5800,
      sphereSegments: [48, 32],
      heroSphereSegments: [64, 44],
      textureWidth: 1024,
      glowEnabled: true,
      cloudsEnabled: true,
      prominencesEnabled: true,
      shootingStarsEnabled: true,
      trailsEnabled: true,
      targetFps: 30
    }
  },
  navigationModes: [
    { id: 'HOME', label: '1. HOME', icon: '◈', desc: 'Overview & Launch Console' },
    { id: 'SOLAR_SYSTEM', label: '2. SOLAR SYSTEM', icon: '☉', desc: 'Planets, Dwarf Planets & Orbits' },
    { id: 'PLANETS', label: '3. PLANETS', icon: '🪐', desc: 'Planetary Detail & Ring Inspector' },
    { id: 'MOONS', label: '4. MOONS', icon: '☾', desc: 'Planetary Satellite Systems' },
    { id: 'DEEP_SPACE', label: '5. DEEP SPACE', icon: '✦', desc: 'Milky Way, Galaxies & Nebulae' },
    { id: 'MISSIONS', label: '6. MISSIONS', icon: '🚀', desc: '5 Guided Space Journeys' },
    { id: 'LABORATORY', label: '7. LABORATORY', icon: '⚛', desc: 'Interactive Physics & What-If Sandbox' },
    { id: 'KNOWLEDGE', label: '8. KNOWLEDGE', icon: '📖', desc: 'Offline Atlas Knowledge Guide' },
    { id: 'SETTINGS', label: '9. SETTINGS', icon: '⚙', desc: 'Graphics, Audio & Projector Controls' }
  ]
};
