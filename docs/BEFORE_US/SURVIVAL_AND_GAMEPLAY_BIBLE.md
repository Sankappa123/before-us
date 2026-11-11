# Survival and Gameplay Bible

Status: planning draft, 2026-11-11. Nothing here is implemented.
Marking: **[V]** verified against a source during research; **[U]** not re-checked.

## Design principles

These are standard lessons from the genre. They were not re-sourced during research, so treat them as design opinion [U].

1. **Needs shape plans; they do not interrupt them.** The Long Dark turns calories, cold and daylight into a budget for each trip.
2. **Progress comes from exploration and knowledge**, not grinding. Subnautica gates by depth and blueprints.
3. **Reward good upkeep more than you punish neglect.** In Valheim, eating well raises maximum health and stamina; nobody starves to death.
4. **The body is the interface.** Green Hell's limb inspection and Sons of the Forest's physical inventory keep the player in the world.
5. **Discovery is systemic.** Ancestors: The Humankind Odyssey teaches by experiment. Its weakness is also a warning: repetition without new decisions becomes a chore.
6. **Seasons and preservation create long arcs.** Preparing for winter gives the year a shape.
7. **Solved problems get automated or retired.** Storage, drying racks and later tribe members take over old chores.
8. **Few meters, strong interactions.** Wet plus wind gives cold; cold raises calorie burn.

## Systems in the first vertical slice

| System | Player experience | Implementation | In slice? |
|---|---|---|---|
| Hunger | Slow drain; eating cooked food gives a lasting bonus | Replicated needs component | Yes |
| Thirst | Faster drain; river water is drinkable but risky until boiled (risk can be stubbed) | Same component | Yes |
| Health | Lost to falls, animals, starvation; recovers when fed and rested | Same component | Yes |
| Stamina | Spent on sprinting, swimming, chopping; maximum is lowered by hunger | Same component | Yes |
| Gathering | Pick up sticks and stones; fell a small tree | Interaction interface + server validation | Yes |
| Crafting | One tool: stone axe from stone, stick, plant fibre | Recipe data assets | Yes |
| Fire | Build, light, feed; gives warmth, light, cooking | Replicated actor with fuel state | Yes |
| Cooking | Raw meat or fish on the fire becomes cooked | Item transformation over time | Yes |
| Shelter | A small lean-to built from carried materials | See Building bible | Yes |
| Temperature, wetness | — | — | Next milestone |
| Injuries, infection, fatigue, sleep | — | — | Later |
| Farming, livestock, preservation, trade | — | — | Much later |

## Framework decision: plain component now, GAS later

| Option | For | Against | Verdict |
|---|---|---|---|
| Plain replicated `UActorComponent` + Gameplay Tags | Easy to read and debug; a beginner can own every line | Buff/debuff stacking must be hand-written | **Use for the slice** |
| Gameplay Ability System (GAS) | Built-in replication, prediction, effect stacking; suits hunger/thirst/temperature well | Steep learning curve; attribute sets need C++; one to two weeks of study first ([tranek GASDocumentation](https://github.com/tranek/GASDocumentation)) | Adopt when injuries, buffs and abilities multiply |

The component will be written so that its public interface (get value, apply change, listen for threshold) can later sit in front of GAS without touching callers.

## Data-driven content [U]

- One `UPrimaryDataAsset` per item, recipe, species and build piece.
- Data Tables for bulk tuning numbers.
- Gameplay Tags as the shared vocabulary (`Item.Tool.Axe`, `State.Wet`, `Surface.Mud`).

This means new items and recipes are added as data, not code.

## Reuse or build?

Build inventory, crafting and needs ourselves in C++. They are small, they are the core of the game, and large Blueprint kits are hard to save and replicate in our own way. Read Lyra's inventory and Easy Building System for patterns only.

## Ideas beyond the brief (recommended for later milestones)

1. **Learn by observation.** Watching lightning start a fire or birds crack nuts unlocks an insight the player must then reproduce by hand.
2. **Cave painting as knowledge and save.** Painting records recipes and the map; the cave is the in-world save point.
3. **Generational time skips.** At milestones the world jumps years ahead; descendants inherit painted knowledge and the landscape shows regrowth or depletion. This is also the honest answer to "how do two people become a kingdom".
4. **Tribe members join over generations** and take over solved chores.
5. **Ecological memory.** Over-hunting collapses a region's population and shifts predators toward camp.
6. **Season-driven migration.** Follow the herds or store food and settle.
7. **Two-person actions.** Carry a log or carcass together, bow-drill, drive game into a partner's ambush.
8. **Wind and scent hunting.** Approach from downwind; smoke and blood attract or repel animals.

Items 7 and 8 are cheap and distinctive; one two-person carry is proposed for the slice.

## Multiplayer implications

Every stat change, pickup and craft is decided by the host. See MULTIPLAYER_AND_PERSISTENCE.md.

## Acceptance criteria for the slice

- A new player can, without a tutorial screen, gather, craft an axe, light a fire, cook and eat within about 20 minutes.
- Ignoring food and water for a full in-game day has visible consequences; managing them well gives a visible benefit.
- All of it works identically for host and guest and survives save/load.
