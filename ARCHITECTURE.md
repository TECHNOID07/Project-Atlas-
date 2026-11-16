# PROJECT ATLAS — Technical Architecture Document

## 1. System Overview & Hardware Tuning
PROJECT ATLAS is architected for deterministic 30+ FPS interactive performance on an **HP ProBook 640 G2** equipped with a 6th-Generation **Intel Core i5-6300U** dual-core CPU, **8 GB DDR4 RAM**, and **Intel HD Graphics 520** driving a 32–40 inch projector:
- **Zero Heavy Post-Processing or Ray Tracing**: Atmospheric halos and solar corona effects use lightweight additive-blended geometry (`THREE.AdditiveBlending`) with `depthWrite: false`.
- **Instanced Geometry (`THREE.InstancedMesh`)**: The Main Asteroid Belt (up to 600 bodies) and Kuiper Belt (up to 420 bodies) use instanced transformation matrices over shared low-poly icosahedron buffers rather than independent scene objects.
- **Point Cloud Batching (`THREE.Points`)**: Background stars, the Oort Cloud shell, Milky Way spiral arms, and deep-space nebula halos render in single-call `GL_POINTS` vertex buffers.
- **Resolution & Automatic Quality Scaling (`PerformanceManager`)**: Caps internal framebuffer height (`720p` in `LOW`, `900p` in `MEDIUM`, `1080p` in `HIGH`) and automatically steps down to `LOW` if sustained frame rates drop below 18 FPS.

## 2. Module & Directory Architecture
```text
PROJECT_ATLAS/
├── index.html                        # Application shell & HUD layout
├── package.json                      # Build, preview, test & offline audit scripts
├── vite.config.js                    # Relative-path offline build configuration
├── run_atlas.bat                     # Production launcher (127.0.0.1:8080)
├── setup_atlas.bat                   # Environment check & setup script
├── build_atlas.bat                   # Offline production bundler script
├── src/
│   ├── main.js                       # DOM bootstrapper
│   ├── app.js                        # Master UI & mode state controller
│   ├── config.js                     # Hardware presets & navigation mode definitions
│   ├── vendor/three.module.js        # Local bundled WebGL 3D engine & OrbitControls
│   ├── engine/engine.js              # Scene, Renderer, Camera, Raycaster & PerformanceManager
│   ├── solar-system/solarSystem.js   # Keplerian solver, ScaleManager, Planets, Moons & Belts
│   ├── deep-space/deepSpace.js       # Starfield, Constellations, Milky Way & Messier objects
│   ├── missions/missionManager.js    # 5 guided 3D trajectory missions & probe mesh
│   ├── knowledge/knowledgeAndLab.js  # Laboratory sandbox & deterministic Knowledge Guide
│   ├── ui/audioAndDemo.js            # Web Audio / WAV sound synthesizer & 13-step Demo Mode
│   └── styles/atlas.css              # Mission control HUD & Projector Mode styles
├── public/
│   ├── assets/textures/*.webp        # 20 compressed equirectangular planet & ring textures
│   ├── assets/audio/*.wav            # 6 local synthesized sound effects
│   ├── assets/models/atlas_probe.json# Local 3D probe geometry specification
│   ├── assets/fonts/atlas-fonts.css  # Local offline system font stack
│   └── data/*.json                   # 8 verified NASA scientific JSON datasets
├── tests/
│   ├── run-all-tests.js              # Dataset, math, lab, knowledge & offline audit suite
│   └── acceptance_report.json        # Real headless Chromium E2E test outcomes (Tests A–N)
└── dist/                             # Compiled production build + standalone HTML bundle
```

## 3. Mathematical & Scientific Modeling
- **Keplerian Orbit Solver**: Given J2000 mean orbital elements $(a, e, i, \Omega, \varpi, L_0)$ and orbital period $P$, mean anomaly at time $t$ (days since J2000.0) is $M(t) = M_0 + \frac{2\pi t}{P}$. Kepler's equation $M = E - e \sin E$ is solved via 5-step Newton-Raphson iteration, yielding true anomaly $\nu$ and heliocentric radius $r = a(1 - e \cos E)$, which is then rotated by $(\Omega, \omega, i)$ into 3D ecliptic coordinates.
- **Scale Transformations**:
  - *Presentation Scale (Mode A)*: Non-linear piecewise radial compression with enlarged planetary radii ($r \propto (R/R_\oplus)^{0.46}$) for projector legibility.
  - *Relative Scientific Scale (Mode B)*: True relative planetary diameter ratios ($R/R_\oplus$) with a minimum visibility floor for tiny bodies and power-law distance mapping $d = 28 \cdot \text{AU}^{0.85}$.
