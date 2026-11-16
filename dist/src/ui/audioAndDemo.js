/**
 * PROJECT ATLAS — Local Audio Manager & Automated 13-Step Projector Demo Mode
 */

export class AudioManager {
  constructor() {
    this.masterVolume = 0.65;
    this.muted = false;
    this.reducedAudio = false;
    this.ctx = null;
    this.audioFiles = {
      startup: './assets/audio/startup.wav',
      select: './assets/audio/select.wav',
      navigate: './assets/audio/navigate.wav',
      mission_launch: './assets/audio/mission_launch.wav',
      arrival: './assets/audio/arrival.wav',
      confirm: './assets/audio/confirm.wav'
    };
  }

  _ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch (_e) {
          this.ctx = null;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  play(effectName) {
    if (this.muted || this.masterVolume <= 0) return;
    if (this.reducedAudio && (effectName === 'navigate' || effectName === 'startup')) return;

    // Synthesize clean futuristic telemetry tone via Web Audio API (with local WAV fallback)
    this._ensureContext();
    if (this.ctx) {
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const map = {
          startup: { f1: 220, f2: 440, dur: 0.55, type: 'sine' },
          select: { f1: 587, f2: 880, dur: 0.12, type: 'sine' },
          navigate: { f1: 330, f2: 494, dur: 0.18, type: 'triangle' },
          mission_launch: { f1: 196, f2: 523, dur: 0.42, type: 'sine' },
          arrival: { f1: 440, f2: 659, dur: 0.35, type: 'sine' },
          confirm: { f1: 659, f2: 987, dur: 0.10, type: 'sine' }
        };
        const spec = map[effectName] || map.select;
        osc.type = spec.type;
        osc.frequency.setValueAtTime(spec.f1, now);
        osc.frequency.exponentialRampToValueAtTime(spec.f2, now + spec.dur);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.15 * this.masterVolume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + spec.dur + 0.02);
        return;
      } catch (_e) {
        // Fallback to local HTML5 Audio element
      }
    }

    const src = this.audioFiles[effectName];
    if (src) {
      try {
        const a = new Audio(src);
        a.volume = Math.max(0, Math.min(1, this.masterVolume));
        a.play().catch(() => {});
      } catch (_e) {
        // Ignore if no audio device is present
      }
    }
  }
}

export const PROJECTOR_DEMO_STEPS = [
  { step: 1, title: '1. Launch ATLAS & Starfield Initialization', durationMs: 4500, action: 'starfield' },
  { step: 2, title: '2. Display Procedural Starfield & Constellations', durationMs: 4500, action: 'constellations' },
  { step: 3, title: '3. Zoom into the Solar System Overview', durationMs: 5000, action: 'solar_overview' },
  { step: 4, title: '4. Select Earth & Inspect Terrestrial Data', durationMs: 5000, action: 'select_earth' },
  { step: 5, title: '5. Fly Around Earth & Lunar Orbit', durationMs: 5000, action: 'orbit_earth' },
  { step: 6, title: '6. Compare Earth with Jupiter in Laboratory', durationMs: 5500, action: 'compare_earth_jupiter' },
  { step: 7, title: '7. Travel to Saturn', durationMs: 5000, action: 'select_saturn' },
  { step: 8, title: '8. Explore Saturn\'s Ring System (D, C, B, Cassini, A, F)', durationMs: 5500, action: 'saturn_rings' },
  { step: 9, title: '9. Enter the Jupiter Galilean Moon System', durationMs: 5500, action: 'jupiter_moons' },
  { step: 10, title: '10. Open Deep Space Catalogue (Messier Nebulae & Galaxies)', durationMs: 5500, action: 'deep_space' },
  { step: 11, title: '11. Explore the Milky Way Spiral Disk & Solar Location', durationMs: 5500, action: 'milky_way' },
  { step: 12, title: '12. Launch Mission 1: Earth-to-Mars Transfer', durationMs: 6500, action: 'mission_mars' },
  { step: 13, title: '13. Finish in Cinematic Universe Overview', durationMs: 5000, action: 'cinematic_finish' }
];
