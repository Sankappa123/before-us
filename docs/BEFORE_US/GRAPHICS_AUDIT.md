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
| Grass | all four | Density, colour patches and fade-out are fine; blades meet the ground; none in water. Blades inside tree shadows stayed sunlit. | Fixed (follow-up, see below): grass and flowers now darken under tree canopies. Re-checked at midday, dawn, dusk and night |
| Flowers (new) | midday, dawn, dusk | In drifts in open meadow only; none on forest floor, gravel or water; dim correctly at dusk. | OK |
| Leaves and pollen (new) | midday, dawn, night | Small and sparse; more under trees; not visible at night. | OK |
| Trees, all five shapes | midday, dawn | Oak, spruce, willow, birch, tall pine: trunks meet the ground, none floating or buried among those looked at closely (one pine, two birches, several oaks). Colour varies per tree. | OK |
| Bushes, fallen logs, old stumps (new) | midday, dawn | Sit on the ground, follow the slope. They had no collision: the player walked through them. | Fixed (follow-up, see below): logs, stumps and large bushes block the player, Asha and animals. Re-checked |
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
| Full map | midday | Waypoint, places, zoom and drag work. The open map covered the lower half of the story panel. Place labels are slightly soft because the 520-pixel canvas is scaled to the window. | Overlap fixed (follow-up, see below). Soft labels left alone |

## Recommendations that need new assets or larger work

- Ground and rock detail textures (Poly Haven, CC0) so slopes are not flat colour up close.
- A night tint for the minimap.
- A proper animated flame and smoke for the fire.

## Follow-up, 2026-11-11: the three open items

Checked in Chrome at 1366x593 and 1366x649, seed 42. Screenshots: `screenshots/2026-11-11-grass-canopy-shade-before-after.jpg`, `screenshots/2026-11-11-map-open-clean-layout.jpg`.

**1. Grass under trees.** The grass and flower shaders still do not read the shadow map. Instead `Scene3D.bakeShade` paints the shadows of the standing trees near the player into a small map (128 m square, 1 m per texel, one byte each) and both shaders read it with one filtered lookup per vertex, then darken and cool the blade. Each crown is treated as an ellipsoid sized by tree shape, and its shadow is placed where the sun actually throws it, so it lines up with the real shadow on the ground and lengthens as the sun drops. The map is repainted when the player has moved 16 m, when the sun has moved enough to shift a shadow by about a quarter of a metre, and when a tree is felled (`hideTree`). Strength follows the light: 0.85 in full sun, about 0.47 at dawn (0.27), 0.13 at dusk (0.74), 0.3 under the moon, and nothing with shadows switched off in settings. The audit suggested the spare blue channel of the height texture; it is not spare (blue is the flower meadow, alpha the leaf fall) and its 4 m grid is too coarse for a crown 4–6 m across, hence the separate small map.
- Seen: at midday the grass inside each tree shadow is dark with a ragged, blade-by-blade edge, matching the ground shadow; dawn, dusk and night show nothing odd; felling two trees removed their shade from the grass.
- Cost: one repaint takes about 0.75 ms. Frame rate at the same spot, shade switched off and on alternately in one session (3 s each, window in front, full resolution): off 44.7, 50.7, 42.6, 44.0; on 43.7, 44.0, 43.0, 38.3. Means 45.5 and 42.3, medians 44.4 and 43.4, so the difference is inside the run-to-run noise. Readings taken while the window was behind another were 1–2 frames a second and were thrown away.
- Not covered: bushes, rocks, people and the valley walls do not shade the grass; only trees do. Not checked in motion at dawn, when the long shadows move fastest.

**2. Collision with logs, bushes and stumps.** The placement moved out of `scene.ts` into `worldgen.ts` (`World.scenery`, made from the seed, so host and guest agree) and the picture is drawn from that list. Fallen logs are a segment with a radius, stumps and bushes are circles. Bushes smaller than 0.9 size (under about a metre tall, roughly knee to thigh high) stay walk-through; 458 of 822 bushes in seed 42 are solid. New placement rules: nothing with either end in water, nothing overlapping a tree trunk, nothing within 12 m of the start. `pushOut` (worldgen) corrects the position only, so walkers slide; the player uses it for trees and scenery together, and `walkStep` adds a sideways slip for Asha and the animals, who steer themselves. If Asha is held up for more than two seconds she gives up gathering or catches up with the player as she already did at water.
- Seen: the player walking straight at a log stops at its side (0.53 m from its axis, the log's radius plus his own); at a slant he slides along it and carries on past the end; a large bush stops him head-on and lets him slide round off-centre; a small bush is walked through. Asha and a deer sent to the far side of a log each went along it and round the end, never closer than its radius.
- Not covered: Asha and the animals still pass through tree trunks, as before (only the player collides with trees). Felled-tree stumps and boulders have no collision. Logs cannot be jumped over. Rabbits and wolves were not watched, only a deer.

**3. Open map.** Opening the map now sets `map-open` on the body. The prompt is hidden while the map is open, and on screens up to 760 px high the story panel is hidden too and messages move to the top edge. Measured boxes with the map open at 1366x593, 1366x649 and 1920x1080 (the last inside a 1920x1080 frame, not a real window of that size): no two panels overlap. The waypoint read-out under the minimap ends at 260 px; the help panel starts at 318 px (593 high) or 374 px (649 high).
