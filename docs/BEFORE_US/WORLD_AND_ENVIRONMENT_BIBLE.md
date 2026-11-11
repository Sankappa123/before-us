# World and Environment Bible

Status: planning draft, 2026-11-11. Nothing is built.
Marking: **[V]** verified primary source; **[S]** secondary; **[U]** judgement or unverified.

## Look and atmosphere

Cold clear mornings with mist lying on the valley floor. Low sun through beech leaves. A river loud enough to hear from the camp. Rain that darkens rock and soil and beads on leaves. Peaks that turn pink at dusk. Nights that are properly dark away from the fire, with a bright moon and stars.

The palette is natural and slightly desaturated, with warm firelight as the one strong colour. No fantasy glow.

## Technology choices

| Area | Use | Status | Notes |
|---|---|---|---|
| Geometry | **Nanite** for rocks, cliffs, trees | Production | Lets film-quality scans render without manual LODs |
| Lighting | **Lumen** (Lite / High / hardware RT tiers) | Production; Lumen Lite new in 5.8 [S] | Fully dynamic, required for time of day |
| Shadows | **Virtual Shadow Maps** | Production [V] | Sharp, consistent shadows at all distances |
| Streaming | **World Partition** | Production | Loads the world in cells around players |
| Scatter | **PCG framework** | Production-ready since 5.7 [S] | Rule-based placement of plants and rocks |
| PCG Biome Core plugin | Start from it, copied into the project | Experimental [S] ([guide](https://dev.epicgames.com/documentation/en-us/unreal-engine/procedural-content-generation-pcg-biome-core-and-sample-plugins-reference-guide-in-unreal-engine)) | Epic itself recommends copying it for production |
| Terrain | **Classic Landscape** | Production | 5.8 Mesh Terrain is Experimental and reportedly not compatible with Water [S] |
| Trees | Standard Nanite/masked foliage with wind | Production | **Nanite Foliage + Megaplants** as an opt-in experiment: Experimental, with a reported tick cost [S] |
| Effects | **Niagara** | Production | Mist, splashes, embers, rain, insects, falling leaves |
| Water | **Water plugin** | Still Experimental [S] | Details below |
| Sky | Sky Atmosphere + Volumetric Clouds + height fog + local fog volumes | Production | Or Ultra Dynamic Sky (~$50) [S] |

## Vegetation pipeline

1. The terrain tool exports data layers: height, slope, facing, flow, deposit.
2. PCG graphs read those layers and place plants per biome (riparian, meadow, mixed forest, conifer, dry slope, scree, wetland). See GEOGRAPHY_AND_MAP_BIBLE.md for the rules.
3. Hero spots (camp clearing, waterfall pool, cave mouth) are then finished by hand. UE 5.8 allows manual edits on top of procedural output without breaking it. [S]

Wind: one global wind direction and strength drives foliage sway, grass waves, rain angle, particles, sound and animal scent, so everything agrees.

## Assets

| Asset | Cost | Notes |
|---|---|---|
| **Megascans** surfaces, cliffs, rocks, debris | **Free on Fab since 2026-11-05** [V] ([Quixel](https://quixel.com/news/update-megascans-are-going-free-again)) | The licence name and any engine restriction were not stated on that page; confirm on the listing |
| **Megaplants** (alder, aspen, beech, hazel, pine, willow…) | Free [S] | Requires experimental Nanite Foliage |
| Megascans Trees (hornbeam, alder) | Free | Non-experimental fallback |
| Poly Haven, ambientCG | Free, CC0 [S] | The only sources safe for a public repo |
| MAWI biome packs | ~$230–325 [S] | Optional; not needed with free Megascans |
| Ultra Dynamic Sky | from ~$50 [S] | Optional shortcut for weather |
| Electric Dreams sample | Free, Unreal-only | Study the PCG setup; do not import wholesale |

## Water

| Element | Approach |
|---|---|
| Lake, calm river reaches | Epic Water plugin: spline rivers, lakes, buoyancy, terrain carving [S] |
| Rapids | Custom spline mesh with a flow-mapped material and foam |
| Waterfall | Mesh sheets with a flowing material, Niagara mist and spray, foam and churn at the base, loud audio. The Water plugin has no native waterfalls [S] |
| Shoreline | Wet darkening on banks, shallow transparency, pebbles visible under water |
| Underwater | Post-process tint and blur, fog, caustics, muffled audio |
| Interaction | Ripples and splashes from characters and animals |
| Swimming | Depth query at the character switches to wade, then swim; current pushes the character along the river direction; replicated |

Paid alternative: Fluid Flux 3.0 (~$350, real-time shallow-water simulation) if flowing, reacting water becomes a core feature. [S]

Gameplay in the slice: drink from the river, wade across shallows, be pushed by current in deeper water. Full swimming, drowning, cold and wet clothing come after the slice.

## Sky, weather and time

- **Slice:** full day–night cycle; clear, overcast, mist and rain; wet surfaces and puddles in rain.
- **Later:** storms with lightning, snow at altitude, four seasons driven by one global "season" value that shifts leaf colour, leaf fall, snow line and plant density.

## Caves and cliffs

Landscapes cannot overhang. The standard method is a hole cut in the landscape with a cave built from Nanite rock meshes covering the seam; cliffs are Megascans rock assemblies placed on steep slope masks. [U] Voxel Plugin 2 is under active development and described as buggy; not for the slice. [S]

## Talks to study

| Talk | Link |
|---|---|
| GPU-Based Procedural Placement in Horizon Zero Dawn | https://www.guerrilla-games.com/read/gpu-based-procedural-placement-in-horizon-zero-dawn |
| Procedural Grass in Ghost of Tsushima | https://gdcvault.com/play/1027214/ |
| Simulating Wind in Ghost of Tsushima | https://gdcvault.com/play/1027350/Blowing-from-the-West-Simulating |
| Procedural World Generation of Far Cry 5 | https://gdcvault.com/play/1025557/Procedural-World-Generation-of-Far |
| Terrain Rendering in Far Cry 5 | https://gdcvault.com/play/1025480/Terrain-Rendering-in-Far-Cry |
| Creating the Atmospheric World of Red Dead Redemption 2 (SIGGRAPH 2019) | https://advances.realtimerendering.com/s2019/ |

## Performance

Dense foliage is the largest rendering cost in this kind of game. Controls: density per quality tier, cull distances, Nanite for trunks and rocks, limited overdraw on leaves, PCG runtime generation for small ground cover near the camera only.

## Acceptance criteria for the slice

- A screenshot from the start area at sunrise is not identifiable as "default Unreal" by an experienced viewer.
- No visible repetition of rocks or trees from any standing viewpoint.
- The river is continuous from waterfall to lake with no gaps, floating water or uphill flow.
- Rain visibly changes ground, rock, leaves and water surface.
- Frame budget is met on the recommended hardware tier.

## Risks

- Several attractive features (Nanite Foliage, Megaplants, Mesh Terrain, Water) are Experimental. The plan uses stable fallbacks by default.
- Art direction, not technology, decides whether the valley looks beautiful. Expect many lighting and composition passes.
