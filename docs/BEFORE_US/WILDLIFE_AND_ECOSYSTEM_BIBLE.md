# Wildlife and Ecosystem Bible

Status: planning draft, 2026-11-11. Nothing here is implemented.
Marking: **[V]** verified against a source during research; **[U]** not re-checked.

## Goal

Animals that appear to live in the valley: they eat, drink, rest, notice the player, flee or hunt, and their numbers respond to what the players do. Not every animal needs expensive AI all the time.

## Species for the First Valley

A temperate valley with forest, grassland and river supports all eight species in the brief. For the slice we need three that show different behaviour:

| Species | Role | Habitat | In slice? |
|---|---|---|---|
| Deer | Herd prey, main food source | Forest edge, grassland at dawn and dusk | **Yes** |
| Rabbit | Small prey, easy first hunt | Grassland near cover | **Yes** |
| Wolf | Pack predator, threat at night | Forest, ranges widely | **Yes** (two or three animals) |
| Boar, fox, bear | Aggressive forager; scavenger; apex | Forest; edges; caves and river | Later |
| Birds | Ambience first, behaviour later | Everywhere | Ambient flocks and sound in slice |
| Fish | Food source | River pools, lake | Simple catchable fish if time allows |

## Behaviour model

**Senses**
- Sight and hearing: Unreal's built-in AI Perception. [U]
- Smell: built by us. Players, fires and carcasses emit scent that drifts along the global wind direction. Animals downwind detect at longer range. This is cheap and makes hunting a skill. [U]

**Decisions:** StateTree with needs-based scoring (hunger, thirst, fear, fatigue). Each animal picks the most pressing need and runs a small behaviour for it. [U]

**Groups**
- Herds: a leader plus simple flocking (stay close, don't collide) and a shared alert state. One deer raising its head alerts the rest.
- Packs: a territory anchor and simple roles (chase, flank).

**Daily schedule:** theHunter: Call of the Wild uses need zones and time-of-day schedules: animals drink at known spots at known hours. This is the closest published match to what we want and is cheap to implement. [V] ([Game Developer](https://www.gamedeveloper.com/design/thehunter-call-of-the-wild-designing-believable-simulated-animal-ai))

## Simulation levels (the optimization plan) [U]

| Distance from nearest player | What runs |
|---|---|
| Within ~150 m | Full AI, full animation |
| ~150–500 m | Reduced update rate, simplified animation |
| Beyond ~500 m | No individuals. Each region keeps a population count per species, updated slowly using a predator–prey model with a carrying capacity |

Individuals are spawned from and returned to the regional counts. Over-hunting a region lowers its count, so it stays emptier until it recovers. Mass Entity is not needed at this scale; ordinary actors with throttled updates handle herds of 10–50.

## Animation

Start with blend spaces plus foot IK and spine alignment to slopes. Motion matching for quadrupeds needs dense motion capture that store packs do not include. [U]

Research reference only: Zhang et al., "Mode-Adaptive Neural Networks for Quadruped Motion Control" (SIGGRAPH 2018), [code and data](https://github.com/sebastianstarke/AI4Animation). Check its licence before any commercial use.

## Asset options

| Pack | Contents | Price | Status |
|---|---|---|---|
| PROTOFACTOR Forest Animals | Bear, boar, doe, stag, fox, rabbit, wolf, with animations | $49.99 at original launch; current Fab price not confirmed | [V] historical ([forum](https://forums.unrealengine.com/t/protofactor-incs-animals-packs-work-in-progress/97219)) |
| AnimX: Forest Animals | Deer, bear, wolf, fox plus a controller; updated for UE 5.7 | INR 37,506 on the listing | [V] ([Fab](https://www.fab.com/listings/d2c4b03a-f38d-4366-a233-02a1d49796d5)) |
| Malbers Animal Controller | Creature framework | Primarily a Unity product; Unreal version not confirmed | Not recommended until confirmed |

Fab's Standard licence allows commercial use but not redistribution, so purchased animals stay out of any public repository. [V] ([Fab](https://www.fab.com/cla))

**Recommendation:** buy nothing yet. When we reach the wildlife milestone, check the current PROTOFACTOR price and quality first; it covers all seven mammals at a fraction of the AnimX cost.

## Ecology basis [U, textbook figures]

- Predator–prey cycles (Lotka–Volterra) drive regional counts.
- "Landscape of fear": prey avoid risky areas, which changes where they graze. In game terms, deer avoid areas near camp and near wolf territory.
- Real wolf territories are 100–1,000+ km²; ours must be scaled down heavily. This is an artistic assumption.
- Deer live in female-led groups with separate male groups outside the rut.

## Talks to study

- "Breathing Life into the Wild West: Animating the Animals of Red Dead Redemption 2", GDC 2020. [V] ([GDC](https://gdconf.com/article/learn-how-rockstar-breathed-life-into-the-wildlife-of-red-dead-redemption-2-at-gdc/))
- Nightingale AI Summit talk, GDC 2023. [V] ([Vault](https://gdcvault.com/play/1028813/AI-Summit-Living-in-Procedural))
- Rain World, Horizon, Far Cry and The Last Guardian talks exist but were not located during research. [U]

## Multiplayer

All animal AI runs on the host. The guest receives position, state and animation triggers.

## Acceptance criteria for the slice

- A deer herd grazes, drinks at the river at dawn, notices an upwind player and flees as a group.
- Approaching from downwind and crouched gets measurably closer.
- Wolves appear at night and can be driven off by fire.
- A hunted animal can be harvested for meat by either player, with the same result on both screens.
- Frame rate does not drop measurably with all slice animals active.

## Risks

- Store-bought animal animation rarely matches the quality of the human characters; the mismatch will be visible.
- Believable death, carcass handling and skinning need custom animation work on both the human and the animal.
