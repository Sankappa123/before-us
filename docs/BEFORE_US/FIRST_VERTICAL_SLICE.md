# First Vertical Slice

Status: plan, 2026-11-11. Nothing is built.

## Definition

A 20–30 minute two-player session in the First Valley that feels like a piece of the real game. Two people arrive at dawn with nothing and by nightfall are sitting under a shelter they built, by a fire they lit, eating food they found.

## The session, minute by minute

1. Both players appear on the meadow terrace at sunrise. Mist on the river, waterfall visible up-valley.
2. They explore: forest edge, river bank, gravel fan. Deer graze at a distance and bolt when approached upwind.
3. They gather sticks, stones and plant fibre.
4. One strikes two stones to make a sharp flake, then assembles a stone axe.
5. They fell a small tree and carry the wood together.
6. They build and light a fire as the light fails.
7. They drink at the river. One catches a rabbit or fish (or gathers berries if hunting is not ready) and cooks it.
8. They raise a lean-to by carrying poles and thatch to a frame.
9. Wolves are heard after dark and keep away from the fire.
10. They sleep; the world saves. On reload, everything is where they left it.

## Requirements and where each is designed

| # | Requirement | Document | Milestone |
|---|---|---|---|
| 1 | Beautiful prehistoric valley | WORLD_AND_ENVIRONMENT, GEOGRAPHY_AND_MAP | M2, M6 |
| 2 | Two high-quality human characters | CHARACTER_DESIGN | M4 |
| 3 | Both players in the same world | MULTIPLAYER_AND_PERSISTENCE | M1 |
| 4 | Natural movement and animation | CHARACTER_ANIMATION | M1 |
| 5 | Camera and character control | CHARACTER_ANIMATION | M1 |
| 6 | River and surroundings | WORLD_AND_ENVIRONMENT | M2 |
| 7 | A few believable animals | WILDLIFE_AND_ECOSYSTEM | M5 |
| 8 | Collect wood and stones | SURVIVAL_AND_GAMEPLAY | M3 |
| 9 | Craft one primitive tool | TOOLS_AND_WEAPONS | M3 |
| 10 | Start a fire | SURVIVAL_AND_GAMEPLAY | M3 |
| 11 | Prepare basic food | SURVIVAL_AND_GAMEPLAY | M3 |
| 12 | Build a small shelter | BUILDING_AND_CIVILIZATION | M6 |
| 13 | Hunger, thirst, health, stamina | SURVIVAL_AND_GAMEPLAY | M3 |
| 14 | Save and load the shared world | MULTIPLAYER_AND_PERSISTENCE | M3 |
| 15 | Both see the same world changes | MULTIPLAYER_AND_PERSISTENCE | Every milestone |

## Explicitly out of scope

Combat, bows, swimming beyond wading, temperature, injuries, seasons, farming, NPC people, more than one valley, a full UI, character customisation, dedicated servers, console builds.

Each of these is designed for later in its bible. Cutting them is what makes the slice achievable.

## Placeholder policy

Placeholders are allowed only during the milestone that validates the underlying system, and each is tracked:

| Placeholder | Replaced in |
|---|---|
| Mannequin characters | M4 |
| Grey terrain during networking tests | M2 |
| Untextured tool shapes | M3 art pass |
| Temporary sounds | M6 |

## Definition of done

- All fifteen requirements pass their acceptance criteria in the linked documents.
- Tested with two people on two machines over the internet, not only two windows on one PC.
- Save → quit → load reproduces the world; a forced crash does not corrupt the save.
- Meets the frame budget on the recommended hardware tier (measured, with the capture saved).
- A person who has never seen the project can complete the session unaided.
- No requirement is marked done unless someone has actually run it.

## Biggest risks to the slice

1. No capable editor machine yet.
2. Two beginners learning Unreal while building.
3. Motion-matched movement over a network with latency.
4. Tree felling: foliage instances, physics, replication and saving together.
5. Custom prehistoric clothing and making two faces feel like specific people.
6. Art direction: the valley looking exceptional, not merely assembled.
