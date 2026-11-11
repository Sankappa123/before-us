# Game Direction

Updated 2026-11-11. This is the working brief for the browser game in `game/`. It states the idea behind BEFORE US, the requirements that follow from it, and what is built.

## The idea

**Two lives. One world. Nothing was here before us.**

A man and a woman arrive in an untouched valley with empty hands. Everything they will ever have, they must notice, gather and make. The game is about that first step from surviving to belonging.

Every feature is judged against five beliefs:

| Belief | What it means in the game |
|---|---|
| The world comes first | The valley follows real geography. It should be worth standing still in. |
| Nothing is given | No menus that hand out items. You find stones, strike them, bind them. |
| Two, not one | The companion is a partner who works, warns and shares, not a follower. |
| The land answers back | Animals notice scent and noise, wolves fear fire, night is a real threat. |
| Progress is remembered | What you build and discover stays: saved world, a map that fills in as you walk. |

## Current shape (decided 2026-11-11)

- You play the **man**. The **woman, Asha, is a companion** run by the game.
- A second human player can still join by link; that path is written but not yet tested end to end.
- Story mode leads the first day and night; after it the valley is open.

## Requirements and status

| Area | Requirement | Status |
|---|---|---|
| Valley | Glacial valley with plateau, waterfall, meandering river, lake, forest, meadow, scree, snow | Built; geography covered by automated tests |
| Light | Day and night, dawn mist, moonlight, stars, firelight | Built |
| Grass | Dense, wind-blown in travelling gusts, colour patches, taller clumps | Built; first tuning pass |
| Humans | Real human models with motion-captured style animation | Built with CC0 Quaternius models and 43 animations |
| Clothing | Believable clothing that can be put on and taken off | Both wear a complete outfit model (Quaternius Ranger, recoloured hide brown). O toggles the man's clothes, P toggles Asha's; without the outfit they wear the fitted painted hide garments. The choice is saved |
| Companion | Follows, gathers sticks, stones, reeds and berries, hands them over, feeds the fire at night, sleeps when you sleep, speaks at story beats | Built and tested |
| Story | Eight chapters from "First light" to "Before us" | Built and tested |
| Survival | Hunger, thirst, health, stamina; flake, axe, tree felling, fire, cooking, shelter, sleep | Built and tested |
| Animals | Deer herd, rabbits, wolves at night, scent carried on wind | Behaviour built and tested; bodies are still simple shapes |
| Birds | Flock wheeling over the valley by day; birdsong and owls | Built; not yet checked closely on screen |
| Map | Parchment map that reveals only where you have walked (M) | Built |
| Saving | World saved in the browser with a backup; export and import as a file | Built |
| Sound | Wind, river, waterfall, fire, footsteps by surface, birds, insects, wolves | Written; not yet listened to |

## What the companion is for

Asha exists so the player is never alone in the world and never led by the hand.

- **She works beside you.** While you chop, she collects. You take what she gathered when you choose.
- **She knows things you do not.** Her lines point at how the land works: follow water downhill, approach into the wind, fire keeps wolves back.
- **She keeps the camp.** At night she stays by the fire and feeds it.
- **She never plays the game for you.** She does not craft, hunt or build. Those steps belong to the player.

Next for her: an idle life at camp (sitting, warming hands), pointing at animals she spots, fear reactions, and carrying one end of a log.

## Lessons taken from the reference games

These come from the research already recorded in the bibles and from general knowledge of the games. No new research on their visuals was done in this pass.

| Game | What it does | How we apply it |
|---|---|---|
| Ghost of Tsushima | Wind is the guide; grass moves in long travelling waves | Gust waves travel in the wind direction; wind shown on screen and used by animals |
| Red Dead Redemption 2 | Light and atmosphere carry the mood; animals have routines | Dawn mist, warm low sun, deer drinking at dawn, wolves at night |
| Horizon | Plants placed by rules from terrain data | Trees, reeds and stones placed by slope, height and wetness |
| Firewatch, Valheim | Simple shapes look beautiful with strong colour and fog | Painterly low-detail trees and rocks, gradient sky, coloured fog |
| The Long Dark | Few needs, each one a decision | Four needs only; being well fed gives a bonus |
| Sons of the Forest | A companion who gathers for you | Asha gathers and hands over |
| Ancestors | Nothing is explained by menus | Recipes are done with the hands; hints come from the companion |

## Honest gaps

- The look is stylised, not photoreal. The laptop's graphics cannot run photoreal scenes.
- Humans are good-looking stylised models, checked in close-up standing and idle. The wrap skirt is a rigid piece, so legs can pass through it when sprinting or crouching.
- Animals still need real models; Quaternius publishes CC0 animal packs that would fit.
- No hand-to-tool alignment yet: the axe sits in the hand but is not fitted to each animation.
- Two-player play over the internet is untested.

## Next steps, in order

1. Real animal models with animations.
2. Close-up pass on both humans: faces, hair, better-fitted clothing.
3. Sound check by ear, then tuning.
4. Two-player test over the internet.
5. Camp life for the companion; more story after the first night.
6. More of the valley's detail: flowers, reeds in water, fallen logs, a cave.
