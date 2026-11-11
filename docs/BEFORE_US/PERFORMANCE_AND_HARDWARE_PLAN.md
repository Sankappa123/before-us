# Performance and Hardware Plan

Status: planning draft, 2026-11-11.
Marking: **[V]** verified against a primary source during research; **[S]** secondary source; **[U]** estimate or inference.

## The development machine (measured on 2026-11-11)

| Part | Found | Epic's recommendation for the UE5 editor on Linux [V] |
|---|---|---|
| Model | Lenovo ThinkPad, type 20KN | — |
| CPU | Intel i7-8550U, 4 cores / 8 threads, 15 W laptop chip | Quad-core 2.5 GHz+; Epic notes 12–16 cores as a practical baseline for compiling |
| RAM | 24 GB | 32 GB |
| GPU | AMD Radeon 540/550-class, **2 GB VRAM** (plus Intel UHD 620) | GeForce 2080-class, **8 GB+ VRAM** |
| Disk | 512 GB SATA SSD, 388 GB free | NVMe; see sizes below |
| OS | Ubuntu 26.04, Wayland | Ubuntu 22.04 or Rocky 8 are the supported distros; 26.04 is not listed |

Source: [hardware specs](https://dev.epicgames.com/documentation/en-us/unreal-engine/hardware-and-software-specifications-for-unreal-engine), [Linux requirements](https://dev.epicgames.com/documentation/en-us/unreal-engine/linux-development-requirements-for-unreal-engine).

## Verdict

**This laptop cannot be the Unreal editor machine for BEFORE US.**

- 2 GB of video memory is a quarter of Epic's recommendation, and Epic's own Linux guide says the Vulkan renderer handles low video memory poorly. [V] ([quickstart](https://dev.epicgames.com/documentation/en-us/unreal-engine/linux-development-quickstart-for-unreal-engine))
- Lumen and MegaLights require RTX 2000 / RX 6000-class GPUs or newer; software Lumen needs at least a GTX 1070. [V] ([Lumen details](https://dev.epicgames.com/documentation/en-us/unreal-engine/lumen-technical-details-in-unreal-engine))
- Forum reports from similar 2–3 GB cards describe crashes and out-of-memory errors on empty projects. No report for this exact GPU was found. [S]
- MetaHuman work recommends an RTX 3070-class GPU with 8 GB VRAM and 32 GB RAM. [V] ([hardware](https://dev.epicgames.com/documentation/metahuman/hardware-requirements))

At best the editor might open an empty project on the lowest preset. That is an inference; nobody has tested it on this machine.

### What the laptop is still good for

- Writing C++ gameplay code and compiling project modules (slowly).
- Headless automated tests and commandlets (no graphics needed).
- Running a Linux dedicated server later.
- Documentation, data tables, version control.
- Blender blockout and low-poly work.
- Acting as the screen and keyboard for a remote or cloud PC.

## Options to get a capable machine

| Option | Typical cost | Good | Bad |
|---|---|---|---|
| **Flat-fee cloud PC** (e.g. Shadow PC Power, RTX A4500-class 20 GB VRAM) | about $44–55 per month [S] | Cheapest way to start; it is Windows, which also unlocks Gaea and Windows packaging | Hour caps and session limits; regional availability must be checked; plan details came from one secondary article |
| **Hourly cloud GPU** (Paperspace A4000 16 GB about $0.76/h; AWS g6.2xlarge about $1–1.35/h) | about $46–135 per month for 60–100 hours, plus storage [S] | Available in most regions; pay only when used | Costs grow with hours; setup effort |
| **Buy a desktop** | See tiers below | Best experience, no latency, no hour caps | Component prices are heavily inflated in late 2026 [S] |
| **Borrow or share a gaming PC** and stream to the laptop | Free | — | Depends on someone else's machine |

### Hardware tiers if buying

GPU and RAM street prices are sourced; CPU, board, SSD prices and totals are estimates. [S/U]

| Tier | CPU | RAM | GPU | Storage | Rough total |
|---|---|---|---|---|---|
| Minimum viable | 6-core (Ryzen 5 7600 class) | 32 GB | 12–16 GB VRAM (RX 9060 XT 16 GB, RTX 5060 Ti 16 GB, or used RTX 3060 12 GB) | 1 TB NVMe | $1,400–1,900 (about ₹1.3–1.8 lakh) |
| Comfortable | 8–12 core (Ryzen 7 9700X class) | 64 GB | 16 GB (RTX 5070 Ti / RX 9070 XT) | 2 TB NVMe | $3,000–3,800 |
| High-end | 16+ core | 96–128 GB | RTX 5080 / 5090 | 2 × 2 TB NVMe | $5,500–8,500+ |

Avoid 8 GB cards (that is Epic's floor) and prefer 16 GB over 12 GB.

**Recommendation:** rent a cloud PC for the first three to six months. It costs little, proves whether you and your friend stay committed, and avoids buying at inflated prices. Buy a "minimum viable" or "comfortable" desktop once the project has momentum. Your friend's hardware is unknown and matters equally; see OPEN_QUESTIONS.md.

## Disk budget

| Item | Size | Confidence |
|---|---|---|
| UE 5.8 installed build | ~39 GB download, roughly 60–100 GB extracted | [S/U] |
| Engine source build | 250–400 GB reported | [S]; avoid unless a dedicated server is needed |
| Game Animation Sample | ~5.6 GB | [S], one forum reply |
| City Sample | 93–100+ GB plus cache | [S]; do not download |
| MetaHumans | A few GB per character | [U] |
| Project cache (DDC) | 20–100+ GB | [U] |

Plan for 1 TB NVMe minimum; 2 TB is comfortable.

## Rendering plan and quality tiers

Build for the high tier and scale down, using Unreal's scalability groups.

| Player tier | Example GPU | Settings |
|---|---|---|
| Minimum | RTX 2060 / RX 6600, 8 GB | 1080p upscaled, Lumen Lite or Low, hair cards, reduced foliage density |
| Recommended | RTX 3060 Ti – 4060 Ti / RX 9060 XT | 1080p–1440p upscaled, Lumen High, Virtual Shadow Maps |
| High | 16 GB cards | Hardware ray-traced Lumen, MegaLights, strand hair on the nearest character |

Notes:
- **Nanite** (virtualized geometry) and **Virtual Shadow Maps** are production features. A Nanite-foliage world effectively makes a modern GPU the player minimum. [V/U]
- **Lumen Lite** arrived in 5.8 as a cheaper global-illumination tier. [S]
- **TSR** upscaling is built in; DLSS/FSR/XeSS come as vendor plugins (5.8 versions not re-verified).
- Steam survey, October 2026: 8 GB and 16 GB VRAM are roughly tied as most common. [S]

## Performance budgets for the slice (targets, to be measured)

- 60 fps at 1440p upscaled on the recommended tier; 30 fps on minimum.
- Two MetaHuman-quality characters on screen with card hair.
- All slice wildlife active with no measurable frame drop.

None of these are verified; they become real only when profiled with Unreal Insights on real hardware.

## Platform notes

- The Linux editor exists as a prebuilt download or a source build. Forum threads report Vulkan device-lost crashes on 5.7.x and at 5.8 launch, partly fixed in 5.8.1. [S]
- Windows builds cannot be packaged from Linux; only Windows → Linux cross-compiling exists. [V]
- Gaea and World Creator are Windows-only. [V/S]

Together these make **Windows the pragmatic choice for the editor machine**, with the Linux laptop as the code and test machine.
