# Game Design Document

Status: planning draft, 2026-11-11. This is the overview; each system's detail is in its bible.

## Summary

| | |
|---|---|
| Title | BEFORE US |
| Genre | Third-person co-op survival, exploration, crafting, civilization |
| Players | Two, online co-op; one hosts |
| Camera | Third person, over the shoulder, close enough to see faces |
| Setting | Eldoria, a fictional temperate region at the end of an ice age |
| First location | The First Valley |
| Engine | Unreal Engine 5.8 (proposed) |
| Platform | Windows PC first |
| Tone | Grounded, quiet, hopeful |

## Core loop

**Observe → gather → make → use → the world changes → observe again.**

A session-sized example: notice deer drink at dawn → make a spear → wait downwind at the river → eat well → stamina improves → climb to the cave you could not reach yesterday.

## Player verbs

| Slice | Soon after | Later |
|---|---|---|
| Walk, run, jump, vault, climb ledges | Crouch, sneak, wade, swim | Free climb, ride |
| Pick up, carry, drop, give | Throw, store | Trade |
| Strike, chop, assemble | Hunt, skin, fish, dig | Farm, tame, herd |
| Light, feed and cook on a fire | Boil water, dry food | Fire pottery, smelt |
| Place and build a shelter | Build storage and workstations | Build a village |
| Drink, eat, sleep | Treat injuries, keep warm | Lead and teach others |

## Systems and where they are designed

| System | Document |
|---|---|
| World, weather, water | WORLD_AND_ENVIRONMENT_BIBLE.md, GEOGRAPHY_AND_MAP_BIBLE.md |
| Characters | CHARACTER_DESIGN_BIBLE.md |
| Movement | CHARACTER_ANIMATION_BIBLE.md |
| Tools | TOOLS_AND_WEAPONS_BIBLE.md |
| Needs, crafting, fire, food | SURVIVAL_AND_GAMEPLAY_BIBLE.md |
| Animals | WILDLIFE_AND_ECOSYSTEM_BIBLE.md |
| Building and eras | BUILDING_AND_CIVILIZATION_BIBLE.md |
| Co-op and saving | MULTIPLAYER_AND_PERSISTENCE.md |
| Sound | SOUND_AND_IMMERSION_BIBLE.md |

## Co-op design rules

1. Nothing requires two players to press a button at the same instant, but many things are faster, safer or only possible with two (heavy carries, driving game, raising a frame).
2. Either player can do everything. No classes.
3. Shared world, separate inventories, free giving.
4. If one player is hurt, the other can help: carry, feed, tend.
5. Players may separate. The world keeps simulating around both.

## Interface

As little screen interface as possible. State is shown on the character and in the world: breathing, posture, skin, shivering, stomach sounds, how a tool looks. A small optional readout exists for clarity and accessibility. Inventory is what you can see and carry, with a simple panel only where needed.

## Knowledge as progression

Recipes are not unlocked from a menu. They are discovered by trying things and by watching the world, then recorded (later, on cave walls) so they persist. Design detail is deferred past the slice; the slice simply allows the axe, fire and shelter to be made by anyone who tries the right combination, with gentle hints.

## Failure

Death in the slice returns the player to the camp after a time skip, with the body's items left where they fell. Permanent consequences, lineage and inheritance are later design work tied to the generational idea.

## Feature evaluation template

Every new system must answer these before it is built (from the project brief):

1. What the player experiences
2. Why it improves the game
3. How similar games handle it
4. Public research
5. Existing asset, project, plugin or tool
6. Reuse, modify or build
7. Assets
8. Animations
9. Sound
10. Technical implementation
11. Multiplayer implications
12. Performance cost
13. Licensing
14. Difficulty
15. Testing
16. Risks
17. Acceptance criteria
18. First version or later

The bibles answer these for the slice systems at planning depth. Each gets a full pass when its milestone starts.

## Feature priority

| First slice | Next | Later | Much later |
|---|---|---|---|
| Valley, two characters, movement, co-op, gather, axe, fire, food, shelter, four needs, three animals, save/load | Spear, containers, temperature, wetness, swimming, storage, more animals, weather hazards | Bow, injuries, seasons, permanent homes, taming, knowledge painting, a second region | Other people, farming, villages, trade, diplomacy, conflict, later ages |
