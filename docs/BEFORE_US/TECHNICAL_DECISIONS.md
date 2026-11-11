# Technical Decisions

Status: **all decisions below are proposals awaiting approval**, 2026-11-11. Nothing is installed or implemented.
Marking: **[V]** verified primary source; **[S]** secondary source; **[U]** judgement or unverified.

Each entry: decision, reason in plain language, alternatives, and when to revisit. Detailed evidence lives in the topic bibles and RESEARCH_LOG.md.

## TD-01 Engine: Unreal Engine 5.8.x (latest hotfix)

- **Why:** latest stable release (June 2026) [S]. It has production-ready PCG (since 5.7), MegaLights, Substrate, the in-engine MetaHuman Creator, Lumen Lite, and Epic's own experimental AI-agent (MCP) plugin.
- **Not 5.9:** it is Preview only as of 2026-11-09. [V] ([notes](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-9-release-notes?lang=en-US))
- **UE6 risk:** Epic calls 5.8 the last large UE5 release and targets UE6 early access for late 2027. Reports that UE6 changes the programming model are unverified. Plan to finish on UE5; keep logic in clean C++ modules with thin Blueprint layers to limit any future migration. [S/U]
- **Alternatives:** Godot 4.6 runs on the laptop but lacks the geometry, streaming, character and foliage stack for this visual target. Unity 6 HDRP does not solve the hardware problem and is weaker for this genre. O3DE is not suitable for a newcomer. [U]

## TD-02 Editor machine: Windows GPU machine (cloud first), laptop for code and tests

See PERFORMANCE_AND_HARDWARE_PLAN.md. **Needs your decision.**

## TD-03 Language split: C++ core, thin Blueprint content layer

- **Why:** C++ is text, so it can be diffed, reviewed, tested headlessly and written well by an AI assistant. Blueprints are binary files; published experiments show automated Blueprint editing gets messy. [S]
- Blueprints are used for content: character and item subclasses, animation graphs, UI layout.

## TD-04 Rendering: Nanite + Lumen + Virtual Shadow Maps, scalable

- Lumen Lite/High/hardware-RT as quality tiers; TSR upscaling.
- **Nanite Foliage** and the Procedural Vegetation Editor are Experimental; use standard foliage with wind in the slice and try Megaplants as an opt-in experiment. [S]
- **Mesh Terrain** (5.8) is Experimental and reportedly incompatible with the Water plugin; use the classic Landscape. [S]

## TD-05 World: real elevation data → erosion tool → Landscape + World Partition + PCG

See GEOGRAPHY_AND_MAP_BIBLE.md and WORLD_AND_ENVIRONMENT_BIBLE.md.

## TD-06 Water: Epic Water plugin + mesh/Niagara waterfall

- The plugin is still in the Experimental folder but is free and gives rivers, lakes, buoyancy and terrain carving. [S]
- Buy Fluid Flux (~$350) only if interactive flow becomes a core feature.

## TD-07 Characters: MetaHuman for both leads, card hair by default

See CHARACTER_DESIGN_BIBLE.md. Placeholder mannequins until a capable machine exists.

## TD-08 Movement: Game Animation Sample (motion matching) on CharacterMovementComponent

- Mover stays off; Epic staff called it experimental in September 2026. [V]
- Known risk: remote-player jitter under latency in the sample; test early. [S]

## TD-09 Multiplayer: listen server, legacy replication, Steam relay

See MULTIPLAYER_AND_PERSISTENCE.md.

## TD-10 Gameplay stats: plain replicated component first, GAS later

See SURVIVAL_AND_GAMEPLAY_BIBLE.md.

## TD-11 AI: StateTree + AI Perception + custom scent; actors, not Mass

See WILDLIFE_AND_ECOSYSTEM_BIBLE.md.

## TD-12 Audio: native Unreal audio (MetaSounds, Soundscape)

See SOUND_AND_IMMERSION_BIBLE.md.

## TD-13 Version control: private repository; licensed content never public

- **Fact:** Fab's licence summary allows sharing assets with collaborators only "via a private repository" and forbids standalone redistribution. [V] ([Fab](https://www.fab.com/eula)). The Unreal EULA allows distributing Epic content only to other engine licensees (read from an older EULA version; current wording not verified). [S]
- **Decision:** start with a **private** repository. Layout keeps licensed content in one separable folder (`Content/Licensed/`) so the code could be made public later.
- **Storage:** GitHub's free Git LFS quota is 10 GiB storage and 10 GiB bandwidth per month [V] ([GitHub](https://docs.github.com/en/billing/concepts/product-billing/git-lfs)). Unreal content outgrows that quickly. Options for content: Diversion (free for 5 users, 100 GB) [S], self-hosted Perforce (free up to 5 users) [S], or paid LFS.
- **Proposed split:** Git (GitHub private) for code, config and docs now; choose the content store when real content exists.

## TD-14 AI-assistant tooling

See CLAUDE_CODE_TOOLS_AND_SKILLS.md. Start with headless command-line builds and tests; add Epic's MCP plugin only on the GPU machine.

## Decisions explicitly postponed

Dedicated server, Iris, Mover, Mass Entity, GAS, voxel terrain, strand hair, cloth simulation, seasons, Steam Audio, Wwise/FMOD, console platforms.
