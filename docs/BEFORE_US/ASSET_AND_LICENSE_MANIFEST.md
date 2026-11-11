# Asset and License Manifest

Status: 2026-11-11. Free assets downloaded so far are listed in the "Acquired" table at the bottom; nothing has been purchased. The sections above it list candidates and the rules. Every item actually added to the project gets a row in the "Acquired" table at the bottom.

Marking: **[V]** verified primary source; **[S]** secondary; **[U]** unverified.

## Licence rules in plain language

| Licence | Use in a commercial game | Modify | Commit to a **public** repo | Attribution |
|---|---|---|---|---|
| Fab Standard (third-party packs) | Yes | Yes | **No**; collaborators only via a private repository [V] ([Fab](https://www.fab.com/eula)) | No |
| Epic "UE-Only Content" (samples, GASP, Lyra, Electric Dreams) | Yes, in Unreal products only [V for Lyra's tag] | Yes | **No** (assume) | No |
| MetaHuman | Yes, under the Unreal licence since 5.6 [V] | Yes | **No** [S; older EULA text] | No |
| Megascans / Megaplants on Fab | Yes; free since 2026-11-05 [V] | Yes | **No** (inferred) | No |
| Mixamo | Yes, royalty-free [S] | Yes | No raw files [S] | No |
| CC0 (Poly Haven, ambientCG, Freesound CC0) | Yes | Yes | **Yes** | No |
| CC-BY | Yes | Yes | Yes | **Required** |
| CC-BY-NC, research datasets (AMASS, LaFAN1, Bandai Namco) | **No** | — | — | — |
| BBC Sound Effects | **No** [S] | — | — | — |
| Sonniss GDC bundles | Yes [V] | Yes | No raw files | No |
| Copernicus DEM | Yes [S] | Yes | Derived terrain yes | **Required** |
| Unreal Engine itself | Free until $1M revenue, then royalty | — | Never commit engine files | — |

Two rules follow:
1. **The repository stays private** while it contains any Fab, Epic, MetaHuman, Megascans or Mixamo content.
2. **"Free to download" is not "free to redistribute".** Check the licence on the listing on the day of download and record it here.

The full Fab EULA and current Unreal EULA texts could not be fetched during research. The table rests on the Fab summary page, Epic FAQ, an older EULA PDF and forum quotes. Read the current texts before any public release.

## Download plan (ordered; each needs your approval before it happens)

### Essential now

| # | Item | Source | Cost | Size | Where | Why |
|---|---|---|---|---|---|---|
| 1 | Unreal Engine 5.8.x | Epic launcher (Windows) or unrealengine.com/linux | Free | ~39 GB download, 60–100 GB installed [S] | **GPU machine** | The engine |
| 2 | Git LFS | Distribution package | Free | Small | Laptop + GPU machine | Large-file version control |
| 3 | Game Animation Sample | Fab | Free | ~5.6 GB [S] | GPU machine | Locomotion base |

### Useful for the first vertical slice

| # | Item | Source | Cost | Size | Why |
|---|---|---|---|---|---|
| 4 | Megascans: selected surfaces, rocks, cliffs, forest debris | Fab | Free [V] | 10–30 GB selectively [U] | Terrain and rock realism |
| 5 | Megascans trees / Megaplants (alder, beech, hazel, pine, willow) | Fab | Free [S] | Multi-GB each [U] | Forest |
| 6 | Elevation data for one reference valley | Copernicus or USGS 3DEP | Free | Under 1 GB | Believable terrain base |
| 7 | QGIS + GDAL | qgis.org | Free, GPL | ~1 GB | Convert elevation data |
| 8 | Gaea 2 Community → Indie | quadspinner.com | Free to learn (non-commercial); $99 Indie [V/S] | Small | Erosion; **Windows only** |
| 9 | Blender | blender.org | Free, GPL | ~1 GB | Tools, clothing, props |
| 10 | Sonniss GameAudioGDC bundle (one year) | sonniss.com | Free [V] | Tens of GB [U] | Ambience and impacts |
| 11 | Survival animation pack | Fab (Nikoff or RBStudio) | Paid; price to check | Under 2 GB [U] | Chop, carry, craft |
| 12 | Forest animals pack | Fab (PROTOFACTOR) | ~$50 historically [S] | A few GB [U] | Deer, rabbit, wolf |

### Useful later

Ultra Dynamic Sky (~$50), Fluid Flux (~$350), Marvelous Designer, Steam Direct fee ($100), mining/skinning animation pack, MAWI biomes, Houdini Indie.

### Research reference only (study; do not build on)

Lyra Starter Game (~10 GB), Electric Dreams (large), Cropout (small), Project Titan, ActionRoguelike (GitHub), tranek GASDocumentation, ALS-Refactored, Easy Building System V10.

### Not recommended

| Item | Reason |
|---|---|
| City Sample | ~93–100 GB, wrong genre, heavy hardware [S] |
| ALS-Community | Maintainers call the techniques outdated [V] |
| Engine source build | 250–400 GB; only needed for a dedicated server |
| Voxel Plugin 2 | Under development, described as buggy [S] |
| BBC Sound Effects, AMASS, LaFAN1, Bandai Namco motion data | Non-commercial |
| Malbers Animal Controller | Unreal version not confirmed |
| AI-generated 3D models for hero assets | Not photoreal quality; licence and ownership unclear |

## Per-asset record template

Every acquired asset gets these fields: name; official source URL; what it provides; free or paid (price, date); licence; Unreal compatibility and engine version; quality note; size; hardware need; modifiable; commercial use; attribution; public-repo allowed; why we need it; who approved and when.

## Acquired

| Date | Item | Version | Source | Licence | Cost | Stored where | Approved by |
|---|---|---|---|---|---|---|---|
| 2026-11-11 | Universal Base Characters [Standard]: male and female bodies, hair, eyebrows, beard | Standard (free) | https://quaternius.itch.io/universal-base-characters | CC0 1.0 (licence file in pack) | Free | `downloads/quaternius/chars`; used files in `game/public/models` (textures reduced to 1024 px) | User, 2026-11-11 ("you can download") |
| 2026-11-11 | Universal Animation Library [Standard]: 43 animations on the same skeleton | Standard (free) | https://quaternius.itch.io/universal-animation-library | CC0 1.0 (licence file in pack) | Free | `downloads/quaternius/anims`; `game/public/models/UAL1_Standard.glb` | User, 2026-11-11 |
| 2026-11-11 | Modular Character Outfits - Fantasy [Standard]: Ranger and Peasant outfits, male and female, same skeleton | Standard (free) | https://quaternius.itch.io/modular-character-outfits-fantasy | CC0 1.0 (licence file in pack) | Free | `downloads/quaternius/outfits`; `Female_Ranger` in `game/public/models` (textures reduced to 1024 px, tunic recoloured brown) | User, 2026-11-11 |
| 2026-11-11 | Ultimate Animated Animals (July 2021): Deer, Stag, Wolf used (Fox, Cow also stored); glTF with Idle, Eating, Walk, Gallop, Death and other clips; no textures | July 2021 (free) | https://quaternius.com/packs/ultimateanimatedanimals.html (download button opens the author's Google Drive folder) | CC0 1.0 (`License.txt` in the pack folder; pack page also states CC0) | Free | `downloads/quaternius/animals`; `Deer.gltf`, `Stag.gltf`, `Wolf.gltf` and the licence in `game/public/models/animals` (unmodified) | User, 2026-11-11 |
| 2026-11-11 | three, peerjs, vite, vitest, typescript (npm) | 0.187 / 1.5.5 / 8.3 / 5.1 / 7.0 | npm registry | MIT / Apache-2.0 (as published) | Free | `game/node_modules` | Needed to build the browser game |

CC0 means these can be used commercially, modified, shipped, and kept in a public repository, with no attribution required.

## Attribution list (to ship with the game)

*(empty; add Copernicus and any CC-BY items here when used)*
