# PROJECT ATLAS — Scientific Sources, Asset Provenance & Credits

## 1. Scientific Datasets (`public/data/*.json`)
All astronomical values bundled in `public/data/` were verified against official NASA educational and archival publications. No network requests are made to these URLs at runtime:

| Dataset File | Primary Scientific Source | Author / Curator | Reference URL (Citation Only) |
| :--- | :--- | :--- | :--- |
| `planets.json` | NASA NSSDCA Planetary Fact Sheet - Metric & Sun Fact Sheet | Dr. David R. Williams, NASA Goddard Space Flight Center | `https://nssdc.gsfc.nasa.gov/planetary/factsheet/` & `https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html` |
| `dwarf-planets.json` | NASA Science Dwarf Planets & NSSDCA Pluto Fact Sheet | NASA Science Editorial Team & Dr. David R. Williams | `https://science.nasa.gov/dwarf-planets/` & `https://nssdc.gsfc.nasa.gov/planetary/factsheet/plutofact.html` |
| `moons.json` | NASA NSSDCA Jovian, Saturnian, Uranian, Neptunian, Martian & Lunar Fact Sheets | Dr. David R. Williams, NASA GSFC | `https://nssdc.gsfc.nasa.gov/planetary/planetfact.html` |
| `orbital-data.json` | NASA NSSDCA J2000 Mean Orbital Elements & Solar System Facts | NASA GSFC / JPL Solar System Dynamics | `https://nssdc.gsfc.nasa.gov/planetary/factsheet/` & `https://science.nasa.gov/solar-system/solar-system-facts/` |
| `deep-space.json` | NASA Science — Hubble's Messier Catalog (M1, M13, M16, M31, M42, M45, M51, M104) | NASA / ESA / STScI | `https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/` |
| `constellations.json` | IAU / NASA Skywatching Reference | NASA Science | `https://science.nasa.gov/universe/glossary/` |
| `science-glossary.json` | NASA Planetary Fact Sheet Notes & Universe Glossary | NASA GSFC & NASA Science | `https://nssdc.gsfc.nasa.gov/planetary/factsheet/planetfact_notes.html` |

*Disclaimer*: PROJECT ATLAS is an independent educational science fair application and is not endorsed by or affiliated with NASA. NASA logos and protected insignia are not used.

## 2. Local Visual, Texture, Model & Audio Assets (`public/assets/`)
To guarantee 100% offline reliability, compact storage footprint (`< 3 MB` total), and zero third-party copyright restrictions, all textures, icons, models, and sound effects were procedurally generated and stored locally inside the project:

| Asset Path | Type | Provenance / Licence | Size |
| :--- | :--- | :--- | :--- |
| `public/assets/textures/sun.webp` .. `venus.webp` (20 files) | 512×256 Equirectangular WebP Planetary & Ring Textures | Original procedural textures generated locally (`generate_atlas_data_and_assets.py`) calibrated to NASA color & albedo profiles (MIT / Public Domain Dedication) | ~332 KB total |
| `public/assets/audio/startup.wav` .. `confirm.wav` (6 files) | 22.05 kHz 16-bit PCM WAV Sound Effects | Original synthesized harmonic telemetry audio generated locally (MIT / Public Domain Dedication) | ~140 KB total |
| `public/assets/icons/favicon.svg`, `compass.svg` | Vector SVG UI Icons | Original clean-room SVG artwork | ~2 KB |
| `public/assets/models/atlas_probe.json` | 3D Spacecraft Geometry Specification | Original procedural 3D probe specification | ~1 KB |
| `src/vendor/three.module.js` | Local WebGL 3D Engine & OrbitControls | Original clean-room Three.js-compatible WebGL rendering engine bundled locally | ~26 KB |
