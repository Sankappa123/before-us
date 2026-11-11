# Research Log

Newest entries first. Each entry records what was looked at, what was found, and how sure we are.

Marking used across all documents: **[V]** verified against a primary source; **[S]** secondary source (press, forum, search summary); **[U]** general knowledge, estimate or judgement, not checked.

---

## 2026-11-11 — Initial inspection and research pass

### Inspection (measured directly)

- Project folder was empty: no git repository, no Unreal project, no code or assets.
- Machine: ThinkPad 20KN, i7-8550U, 24 GB RAM, Radeon 540/550-class 2 GB VRAM, 512 GB SATA SSD (388 GB free), Ubuntu 26.04, Wayland.
- Installed: git, Python, Node, Docker. Not installed: Unreal, Blender, clang, cmake, git-lfs.

### Method

Five parallel web-research passes: engine and hardware; characters and animation; world, water and asset licensing; gameplay, wildlife, multiplayer and audio; AI-assistant tooling. No software was downloaded or installed. Only these documents were written.

### Pages that could not be read

Epic's 5.7/5.8 news posts and release-note bodies, unrealengine.com/linux, the current Unreal EULA, the full Fab EULA, metahuman.com/license, Adobe's Mixamo FAQ, Shadow's offers page, voxelplugin.com, and several Fab listings returned errors or empty pages. Claims depending on them are marked [S] or [U].

### Key findings

| # | Finding | Mark | Source |
|---|---|---|---|
| 1 | UE 5.8 released June 2026; described as the last large UE5 release; UE6 early access targeted for late 2027 | [S] | [forum](https://forums.unrealengine.com/t/unreal-engine-5-8-released/2729274), [gamefromscratch](https://gamefromscratch.com/unreal-engine-5-8-released/) |
| 2 | UE 5.9 is Preview only (notes dated 2026-11-09) | [V] | [notes](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-9-release-notes?lang=en-US) |
| 3 | Epic recommends 32 GB RAM and 8 GB+ VRAM for the editor; the Linux Vulkan renderer handles low VRAM poorly | [V] | [specs](https://dev.epicgames.com/documentation/en-us/unreal-engine/hardware-and-software-specifications-for-unreal-engine), [quickstart](https://dev.epicgames.com/documentation/en-us/unreal-engine/linux-development-quickstart-for-unreal-engine) |
| 4 | Lumen needs RTX 2000 / RX 6000 class; software Lumen needs GTX 1070 minimum | [V] | [Lumen](https://dev.epicgames.com/documentation/en-us/unreal-engine/lumen-technical-details-in-unreal-engine) |
| 5 | Megascans became free on Fab again on 2026-11-05 | [V] | [Quixel](https://quixel.com/news/update-megascans-are-going-free-again) |
| 6 | MetaHuman is under the standard Unreal licence since 5.6; Creator runs on Linux since 5.7; recommended hardware RTX 3070-class, 8 GB VRAM | [V] | [5.7 notes](https://dev.epicgames.com/documentation/metahuman/metahuman-5-7-release-notes), [hardware](https://dev.epicgames.com/documentation/metahuman/hardware-requirements) |
| 7 | Game Animation Sample updated for 5.8 on 2026-08-12; includes a CharacterMovement character and an experimental Mover character | [V] | [blog](https://www.unrealengine.com/tech-blog/download-the-latest-game-animation-sample-project-now-updated-for-ue-5-8) |
| 8 | Mover still experimental per Epic staff, 2026-09-17 | [V] | [thread](https://forums.unrealengine.com/t/requesting-an-eta-on-iris-mover-network-prediction-plugin-compatibility-ue-5-8-2/2841863) |
| 9 | Iris was beta and off by default in 5.7; legacy replication not being deprecated | [V] | [thread](https://forums.unrealengine.com/t/5-7-iris-strategy/2699685) |
| 10 | Fab licence summary: commercial use and modification allowed; no standalone redistribution; collaborators via private repository | [V] | [Fab](https://www.fab.com/eula) |
| 11 | PCG production-ready since 5.7; Nanite Foliage and Procedural Vegetation Editor experimental | [S] | [forum](https://forums.unrealengine.com/t/unreal-engine-5-7-released/2673913) |
| 12 | UE 5.8 Mesh Terrain is experimental; Water compatibility unconfirmed | [S] | [cgchannel](https://www.cgchannel.com/?p=176531) |
| 13 | Gaea 2 is Windows-only; Indie $99 | [V/S] | [FAQ](https://quadspinner.com/support/faq) |
| 14 | Epic ships an experimental MCP plugin in 5.8 and an official Claude Code plugin (MIT) | [V] | [repo](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin) |
| 15 | Steam Direct fee $100, recoupable; EOS free | [V] | [Steam](https://partner.steamgames.com/doc/gettingstarted/appfee), [EOS](https://onlineservices.epicgames.com/licensing) |
| 16 | Sonniss GDC bundle: royalty-free commercial use | [V] | [licence](https://sonniss.com/gdc-bundle-license/) |
| 17 | AMASS, LaFAN1, Bandai Namco motion datasets are non-commercial | [V] | [AMASS](https://amass.is.tue.mpg.de/license.html) |
| 18 | No prehistoric clothing pack found on Fab | [S] | Search only |
| 19 | GitHub free LFS quota: 10 GiB storage and bandwidth | [V] | [GitHub](https://docs.github.com/en/billing/concepts/product-billing/git-lfs) |
| 20 | Windows builds cannot be packaged from Linux | [V] | [Linux requirements](https://dev.epicgames.com/documentation/en-us/unreal-engine/linux-development-requirements-for-unreal-engine) |

### Conflicts between sources

| Topic | Source A | Source B | Position taken |
|---|---|---|---|
| Mover in 5.8 | A third-party blog says Beta | Epic staff (Sept 2026) say experimental | Experimental; do not use |
| Iris in 5.8 | A search summary says production-ready | Forum posts disagree; 5.7 status was beta | Leave off |
| Latest 5.8 hotfix | 5.8.1 / 5.8.2 seen | A thread references 5.8.4 | Use whatever is latest at install time |
| MetaHuman use outside Unreal | Press says allowed | A vendor blog disputes it | Irrelevant to us; we stay in Unreal |

### Decisions proposed from this pass

See TECHNICAL_DECISIONS.md (TD-01 to TD-14). None is final until approved.

### Not researched yet

- Epic's beginner learning path (which courses, in what order).
- Current prices and review of the specific animation and animal packs.
- Linux editor behaviour on Ubuntu 26.04.
- Swimming and bow animation sources.
- Scientific sources for the ecology and archaeology figures.
- Assassin's Creed and Rockstar public animation material (none found so far).
