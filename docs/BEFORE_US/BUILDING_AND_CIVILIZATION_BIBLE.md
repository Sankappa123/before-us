# Building and Civilization Bible

Status: planning draft, 2026-11-11. Nothing here is implemented.
Marking: **[V]** verified against a source during research; **[U]** not re-checked.

## Building approach

| Approach | Example | Trade-off | Verdict |
|---|---|---|---|
| Snap-together modular pieces | Valheim, Medieval Dynasty | Simplest to replicate and save. Valheim adds a support value that spreads up from the ground. | **Base system** |
| Log-by-log free-form | Sons of the Forest | Fits the era and feels physical, but needs many placement rules and more saved state | Borrow the *feel*, not the system |
| Voxel terrain and building | Enshrouded | Needs a custom voxel engine | Out of scope |

**Recommendation:** snap pieces with physical construction. The player places a ghost frame; then both players carry logs, stone and thatch to it by hand. This gives the weight of Sons of the Forest with the reliability of a snap system. [U]

Technical shape:
- Each piece is a data asset plus a replicated actor on the host. Cheap, numerous pieces can later become instanced meshes backed by a replicated array.
- Saved as type, transform, health and parent ID.
- Structural support, destruction and ownership are deferred past the slice.
- Reference to read, not adopt: Easy Building System V10, free on Fab, Blueprint, replicated, server save. [V] ([Fab](https://www.fab.com/listings/b2c5a428-e9af-4c6a-9daf-d10b8b04bddf)). Its licence field was blank on the listing.

Slice scope: one lean-to shelter made of a frame, poles and thatch.

## Civilization progression

| Stage | What unlocks it | Milestone |
|---|---|---|
| 1. Temporary shelter, fire | Gathering, first tools | **Vertical slice** |
| 2. Camp | Storage, drying rack, water containers | After slice |
| 3. Permanent home | Better tools, seasonal pressure | Later |
| 4. Workstations | Pottery, kiln, hide working | Later |
| 5. Farms, livestock | Observation of wild plants; tamed animals | Much later |
| 6+. Village → town → kingdom | Other people | Needs a population system; see below |

### The two-person problem

Two humans cannot become a kingdom. The design needs an answer before stage 6, and the choice changes the whole late game. Options:

| Option | Effect |
|---|---|
| NPC tribe members who are found, helped or born, and join | Turns the late game into settlement management |
| Generational time skips | Players become their own descendants; the settlement grows between eras |
| Both combined | Recommended direction; decide after the slice |

This is recorded in OPEN_QUESTIONS.md. It does not affect the vertical slice.

## Historical grounding

Use these to order the tech tree so progress feels earned. Only the bow row was verified during research; the rest are textbook figures to confirm before they appear in game text.

| Milestone | Approximate date | Status |
|---|---|---|
| Habitual fire control | Claimed ~790,000 years ago; widespread by ~400,000 | [U], contested |
| Hafted tools, birch-tar adhesive | ~200,000–500,000 years ago | [U], debated |
| Bow and arrow | ~64,000 years ago (Sibudu, South Africa; inferred from stone points) | [V] ([Antiquity](https://www.cambridge.org/core/journals/antiquity/article/abs/indications-of-bow-and-stonetipped-arrow-use-64-000-years-ago-in-kwazulunatal-south-africa/89AF638BE5E64CEAC63363EFDD4D5E8F)) |
| Dog domestication | ~15,000–40,000 years ago | [U] |
| Pottery | ~20,000 years ago (Xianrendong, China), made by hunter-gatherers before farming | [U] |
| Göbekli Tepe | ~9500 BCE, monumental building by foragers | [U] |
| Plant and animal domestication | ~9500–8000 BCE, Fertile Crescent | [U] |
| Çatalhöyük | ~7400–6000 BCE | [U] |

Two useful surprises for design: pottery and monuments both came **before** farming. The tech tree does not have to be a straight line from hut to farm.

Practical build references [U]: the Primitive Technology channel (kilns, charcoal, bow drill) and experimental archaeology centres (Butser Ancient Farm, Lejre, EXARC).

### Artistic liberties we are taking

- Compressing several hundred thousand years into one playthrough.
- One lineage inventing everything.
- Farming shown as an upgrade. Historically it was slow, regional and often worse for health.
- Taming wolves within a lifetime.

Eldoria is fictional, so these are acceptable, but the game should not present them as history.

## Peaceful path

Every stage above can be reached without warfare. Combat and diplomacy with other groups are optional later branches and are not designed yet.

## Acceptance criteria for the slice

- Both players can carry materials to one shared frame and see it complete piece by piece.
- The finished shelter persists through save/load and is identical for host and guest.
- Sleeping in it has one gameplay effect (for example, triggers autosave and passes the night).
