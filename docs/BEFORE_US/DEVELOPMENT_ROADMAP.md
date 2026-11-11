# Development Roadmap

Status: proposal, 2026-11-11. Durations are rough estimates for two beginners working part-time, not commitments. They have no data behind them yet and will be revised after M1.

Each milestone is bounded, ends in something both players can run together, and is tested and documented before the next begins.

## M0 — Foundations (1–2 weeks)

- Decide the editor machine (cloud PC, purchase, or borrowed). **Blocks everything visual.**
- Confirm your friend's hardware and operating system.
- Create a private repository with Git LFS, an Unreal `.gitignore`, and these docs.
- Install UE 5.8.x on the GPU machine. Record it in the manifest.
- Both of you complete Epic's beginner editor and C++ introductions.

**Done when:** an empty UE 5.8 C++ project compiles, opens, and is committed; both of you can clone and open it.

## M1 — Two people moving (4–6 weeks)

- Bring in the Game Animation Sample character (CharacterMovementComponent version).
- Third-person camera and input.
- Listen-server session: host and join on LAN or direct IP.
- Test with simulated latency; fix or work around remote-player jitter.
- Headless automated test setup on the laptop.

**Done when:** two players on two machines run, jump and vault around a grey test level and look smooth to each other at 100 ms latency.
**Why first:** it retires the two largest technical risks (movement quality and networking) before any art is made.

## M2 — The valley takes shape (4–6 weeks)

- Elevation data → erosion → 2 × 2 km landscape with data layers.
- Landscape material from Megascans surfaces.
- River, lake and waterfall.
- Sky, time of day, fog, first lighting pass.
- First PCG biome (mixed forest and meadow).

**Done when:** both players can walk from the waterfall to the lake through believable terrain at sunrise and it already looks like a place.

## M3 — The survival loop (6–8 weeks)

- Interaction system; pick up, carry, drop, give.
- Inventory and item data.
- Needs component: hunger, thirst, health, stamina.
- Stone axe crafting; tree felling.
- Fire: build, light, fuel; cooking.
- Drinking from the river.
- Save and load of the shared world, with crash-safe autosave.

**Done when:** two players can gather, craft, fell, light, cook and eat; quit; reload; and find everything as they left it. All of it covered by automated tests where possible.

## M4 — The two humans (4–6 weeks)

- Create both MetaHumans; sculpt toward the character bible.
- Hide clothing and hair.
- Retarget all animation; fix clipping.
- Optimise: card hair, LODs.
- Character selection: either player, either character.

**Done when:** both characters pass the acceptance criteria in CHARACTER_DESIGN_BIBLE.md and the frame budget holds with both on screen.

## M5 — Life in the valley (4–6 weeks)

- Deer herd, rabbits, wolves with senses, needs and schedules.
- Wind and scent.
- Hunting or trapping one animal; harvesting meat.
- Ambient birds and insects.
- Regional population counts.

**Done when:** WILDLIFE_AND_ECOSYSTEM_BIBLE.md acceptance criteria pass in co-op.

## M6 — Shelter, sound and polish (6–8 weeks)

- Lean-to building with carried materials; one two-person carry.
- Full sound pass.
- Rain and wet surfaces.
- Remaining biomes, cave, hand-finished hero locations.
- Performance profiling and quality tiers.
- Steam invites (requires the Steam fee) or EOS.
- Outside playtest.

**Done when:** FIRST_VERTICAL_SLICE.md definition of done is met.

## Rough total

About 30–40 weeks of part-time work if nothing goes badly wrong, so plan for **nine to twelve months**. Beginners typically take longer than planned on the first milestones and speed up later.

## After the slice

Decide, based on what the slice taught: continue toward the Camp era (spear, containers, temperature, swimming, storage, seasons), or revise the vision. Do not plan the later eras in detail until then.

## Working rules

- One milestone at a time. No starting M3 systems during M2.
- Every feature is built host-authoritative and tested with two players from the first day.
- Every milestone ends with: tests run, a short written record of what changed, what was tested, what is incomplete.
- Nothing is called working until someone has run it.
- Downloads, purchases, plugins and architecture changes need approval and a manifest entry.
