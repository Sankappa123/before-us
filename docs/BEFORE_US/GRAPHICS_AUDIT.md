# Graphics Audit

Done 2026-11-11 in Chrome (window in front, 1366x593 viewport, seed 42), after the map work and graphics pass 1. Each element was looked at on screen by teleporting the player and setting the time of day. Times: dawn 0.27, midday 0.45, dusk 0.74, night 0.9. "Not checked" means exactly that.

Frame rate at three fixed spots (meadow, river bank, forest), counted from rendered frames over 3–4 seconds: 44–48 before the work, 42–55 after all of it. One early run dropped to 12 for a few seconds and did not repeat; it is treated as a hitch, not the game's speed.

| Element | Times checked | Finding | Fixed? |
|---|---|---|---|
| Terrain colour and seams | midday, dawn, dusk | No seams or holes seen from the valley side or the floor. Colour bands (meadow, forest floor, gravel, rock) blend. | OK |
| Rock and scree | midday | Boulders sit in the ground, not floating. Steep slopes are plain grey-green with little detail up close. | OK; detail textures need downloaded assets (recommendation) |
| River surface | dawn, midday, night | Before: read as a pale grey strip, the bed showing through and wide white foam. | Fixed: depth colour reaches blue-green sooner, shore foam narrowed. Re-checked |
| River banks | midday | Thin foam line at the edge, gravel bank, grass stops at the water. | OK |
| Waterfall | midday, dusk, night | White ribbon reads well by day. At dusk and night it was brighter than the land around it. | Fixed: foam now follows the light level. Still the palest thing in the night scene, on purpose (moonlit) |
| Waterfall spray | midday, dusk | Was hard white squares. | Fixed: soft round puffs that darken with the light. Re-checked |
| Lake and shore | midday, dusk | Ripples formed a regular egg-box grid across the lake. | Fixed: three wave trains in unrelated directions. Re-checked at midday |
| Grass | all four | Density, colour patches and fade-out are fine; blades meet the ground; none in water. Blades inside tree shadows stay sunlit. | Not fixed: the grass shader does not read the shadow map (recommendation) |
| Flowers (new) | midday, dawn, dusk | In drifts in open meadow only; none on forest floor, gravel or water; dim correctly at dusk. | OK |
| Leaves and pollen (new) | midday, dawn, night | Small and sparse; more under trees; not visible at night. | OK |
| Trees, all five shapes | midday, dawn | Oak, spruce, willow, birch, tall pine: trunks meet the ground, none floating or buried among those looked at closely (one pine, two birches, several oaks). Colour varies per tree. | OK |
| Bushes, fallen logs, old stumps (new) | midday, dawn | Sit on the ground, follow the slope. They have no collision: the player walks through them. | Not fixed (scenery only); say if collision is wanted |
| Sky gradient, sun glow | dawn, midday, dusk | Horizon matches the fog; warm glow at dawn. | OK |
| Moon glow | — | Not checked: the moon was never in frame. | — |
| Stars | dusk, night | Visible, fade in with dusk. | OK |
| Fog and horizon | dawn, midday, dusk | Far trees and far water fade into the same colour as the sky's edge. Dawn mist is thick but even. | OK |
| Shadows | midday, dawn | No acne or detached shadows seen in stills. The shadow box followed every footstep, which makes edges crawl. | Changed: the box now moves in 4 m steps. Not verified in motion (stills only) |
| Fire and its light | midday, night | Flame and warm pool of light on grass, shelter and the man at night; nothing else glows. | OK |
| Shelter | midday, night | Lean-to frame and thatch stand on the ground. | OK |
| Loose items | midday | Sticks lie on the grass and are visible from above; stones and berries not looked at closely. | OK (partly checked) |
| The man | all four | Feet on the ground (hidden in grass), no clipping seen standing or walking. A carried log stood upright through his head. | Fixed: log now lies across the shoulders. Re-checked |
| Asha | midday, dawn | Dressed, walking and running: no clipping seen at 3–10 m. | OK (not checked close up) |
| Clothes on/off (O, P) | midday | O showed no visible change; P answered "She is too far away". | Not checked further |
| Deer | midday | Seen only at 15 m while fleeing: upright, on the ground, facing its direction of travel. | OK at distance; not checked close |
| Rabbit, stag, wolf | — | Not checked: the rabbit fled out of view, no wolf appeared, stag not found. | — |
| Birds | — | Not checked. | — |
| HUD panels | midday | Help panel had two wrapped lines and nearly touched the waypoint read-out. No panels overlap (checked by measuring their boxes at 1366x593, which is tighter than 1366x649). | Fixed: lines shortened |
| Minimap | all four | Top right under the link panel, clear of the help panel. Now shows only discovered land, so the far view does not give the valley away. It stays bright at night. | OK; night dimming left alone (it is a HUD element) |
| Full map | midday | Waypoint, places, zoom and drag work. The open map covers the lower half of the story panel. Place labels are slightly soft because the 520-pixel canvas is scaled to the window. | Not fixed (minor) |

## Recommendations that need new assets or larger work

- Ground and rock detail textures (Poly Haven, CC0) so slopes are not flat colour up close.
- Let the grass and flower shaders read the sun's shadow map, so blades under trees go dark.
- Collision, or at least a step-over, for fallen logs and bushes.
- A night tint for the minimap.
- A proper animated flame and smoke for the fire.
