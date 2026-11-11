# BEFORE US — Browser Edition Plan

Status: proposal, 2026-11-11. Replaces the Unreal plan as the active plan, because no machine capable of running Unreal is available. Nothing is built yet.

Technical claims here come from general knowledge and were **not** re-researched or tested on this laptop, unless marked otherwise. The first build step tests them.

## The constraint

Everything must be built, run and tested on the existing laptop: 4-core i7-8550U, 24 GB RAM, Radeon 2 GB, Ubuntu. No rented or new hardware. Only free, legally usable downloads.

## What "best" means under this constraint

Photorealism at the level of Red Dead Redemption 2 is not reachable on a 2 GB GPU in any engine. A beautiful game still is. Valheim, Firewatch and The Long Dark look striking with simple geometry because of lighting, fog, colour, composition, wind and sound.

**New visual target: painterly realism.** Natural proportions and colours, real geography, soft atmospheric light, dense moving grass, good water, strong silhouettes. Detail is spent where the eye goes: light, sky, water, motion.

Everything else in the vision stays: two players, the First Valley, real geography, a living ecosystem, earned progress.

## Platform decision

| Option | For | Against | Verdict |
|---|---|---|---|
| **Browser game: Three.js + TypeScript** | Runs on this laptop. Your friend joins by opening a link, with nothing to install. All code is text, so the assistant can write, run and check it here. Free hosting. Web skills you already have apply. | No ready-made editor; systems such as terrain and animation blending are built in code | **Recommended** |
| Godot 4 (desktop, optional web export) | Real editor, runs on this laptop, open source | New tool to learn; web export is limited to its simplest renderer; scene work is manual clicking the assistant cannot do for you | Runner-up |
| Unreal Engine 5 | Best visuals | Does not run on this hardware | Shelved |

## Technology

| Area | Choice | Notes |
|---|---|---|
| Rendering | Three.js on WebGL2 | WebGPU as a later optional upgrade; its Linux browser support is not assumed |
| Language, build | TypeScript, Vite | Node is already installed |
| Physics | Rapier (WebAssembly) | Character controller, collisions |
| Networking | WebRTC peer-to-peer; one player is host and decides all outcomes | No game server to pay for. Needs a small free signalling service to connect the two browsers |
| Saving | Host's browser storage (IndexedDB) plus export/import to a file | File backup protects against cleared browser data |
| Hosting | Static site (Vercel or GitHub Pages free tier) | Deployment needs your approval when the time comes |
| Audio | Web Audio: positional sound, layered ambience | |
| Tests | Vitest for game logic; browser checks for rendering | |

## How the valley still obeys real geography

The terrain is generated offline by a script: a base shape (or real elevation data), then simulated water erosion, then computed water flow. The river is placed along the computed flow path, so it cannot run uphill. The same data (height, slope, wetness, facing) decides where each plant type grows, exactly as in GEOGRAPHY_AND_MAP_BIBLE.md, which remains valid.

## Visual techniques that fit a 2 GB GPU

- Terrain blended from a few textures by slope, height and wetness.
- Tens of thousands of grass blades drawn as GPU instances, bending in wind.
- Trees and rocks as instanced models with simplified distant versions.
- Sky with physically based scattering, sun and moon, stars, time of day.
- Height and distance fog; morning mist on the valley floor.
- Water shader: depth colour, reflections, foam at edges, flow direction.
- One shadow-casting sun with cascaded shadows; firelight as the only other strong light.
- Colour grading and soft bloom.
- Render resolution scaling to hold the frame rate.

Target on this laptop: 30 fps or better at 720p–1080p. This is an untested estimate.

## Characters

MetaHuman is out. Options:

| Source | Look | Licence | Verdict |
|---|---|---|---|
| **MPFB2 / MakeHuman** (free Blender add-on) | Realistic proportions; male and female; adjustable faces | Output is CC0 | **Recommended base**; we add hide clothing and hair |
| Mixamo characters | Varied, some stylised | Free for commercial use; raw files may not be redistributed. A browser game serves its files to players, so this needs a licence read before use | Animations yes, with that check |
| Quaternius, Kenney | Low-poly stylised | CC0 | Placeholders |

The two leads will be good-looking, natural and expressive at gameplay distance. They will not have film-quality skin and hair in close-up.

Movement: motion-capture clips blended by speed and direction, with foot placement on slopes and upper-body layering for tools. Smooth and weighty is achievable; full motion matching is not planned.

## Free asset sources

| Need | Source | Licence |
|---|---|---|
| Ground, rock, bark textures; sky images; some models | Poly Haven, ambientCG | CC0 |
| Animals with animations | Quaternius animal packs | CC0; stylised, so they set the art style |
| Human animation | Mixamo; CMU motion capture | See above; CMU needs credit |
| Sound | Sonniss GDC bundles, Freesound (CC0 only) | Commercial use allowed |
| Trees and plants | Poly Haven; generated procedurally in code or Blender | CC0 / ours |
| Megascans | Free on Fab since 2026-11-05 | Use outside Unreal not confirmed; do not use until checked |

Every download is checked on the day and logged in ASSET_AND_LICENSE_MANIFEST.md.

## Milestones

Each ends in something both players can open in a browser.

| # | Outcome | Rough length |
|---|---|---|
| B0 | Project created; a test scene runs on this laptop; frame rate measured | Days |
| B1 | The valley: eroded terrain, river, lake, sky, time of day, fog, grass | 2–3 weeks |
| B2 | A character walking, running and jumping with a third-person camera | 2 weeks |
| B3 | Two players in the same valley by sharing a link | 2 weeks |
| B4 | Gather, craft a stone axe, fell a tree, fire, cook, four needs, save and load | 4–6 weeks |
| B5 | Deer, rabbits and wolves with senses and daily habits | 3–4 weeks |
| B6 | Shelter building, full sound, rain, final characters, polish | 4–6 weeks |

Durations are estimates. Because the assistant can write and run this code directly, this path is likely faster than the Unreal one.

## What carries over from the Unreal documents

| Still valid | Replaced by this plan |
|---|---|
| Vision, game design, vertical slice content | Engine, rendering and hardware decisions |
| Geography rules and valley layout | Character pipeline (MetaHuman) |
| Wildlife behaviour design | Animation system (motion matching sample) |
| Survival, tools, building design | Asset download list |
| Host-decides multiplayer rules and save design | Unreal-specific tooling |
| Sound design goals and licence rules | |

## Risks

- Browser 3D performance on the 2 GB GPU is unmeasured. B0 measures it first.
- Peer-to-peer connections fail on some home networks without a relay server.
- Characters are the weakest area compared with the original ambition.
- Low-poly CC0 animals may clash with more realistic humans; the art style has to be unified deliberately.
- Browser storage can be cleared; hence file export.
