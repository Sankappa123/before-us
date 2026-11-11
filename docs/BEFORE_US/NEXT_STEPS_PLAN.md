# Next Steps Plan

Written 2026-11-11, after animals, MongoDB saving, the minimap and locked clothing were added. This compares the game with the reference games and lists what to build next, in order. It is based on the earlier research and general knowledge of those games; no new research was done for it.

## Where the game stands against the references

| Area | Reference standard | BEFORE US today | Gap |
|---|---|---|---|
| Map | GTA V: corner minimap that turns with you, full map with icons, waypoints | Corner minimap that turns with the camera (N: near/far); full parchment map that reveals where you walked, with wheel zoom 1x–4x and drag; a waypoint set by clicking the map, shown on both maps, as a pale column in the world and as metres on screen; named places appear when found (waterfall foot, lake, high shelf, river crossing, first fire, shelter) | No icons for resources or animals seen; no route line |
| World | Red Dead Redemption 2: dense, varied, lit by weather | One valley with river, waterfall, lake, forest, day and night, dawn mist | No rain or storms, no seasons, no cave, few plant types |
| Grass and wind | Ghost of Tsushima: wind as a guide, flowers, particles | Grass in travelling gusts; wind shown on screen and used by animals | Done 2026-11-11: meadow flowers in drifts, leaves and pollen on the wind, trunks sway with their crowns. Still no insects |
| Animals | Red Dead, theHunter: many species with routines | Animated stag, deer and wolf; shape-built rabbit; deer drink at dawn; scent on wind | No tracks, no birds on the ground, no fish, few species |
| People | The Last of Us, Assassin's Creed: motion-matched movement, faces that act | Animated humans with 43 clips; companion with a job | No carrying, sitting or tool-specific animations; no facial movement; clothing not checked in motion |
| Survival | The Long Dark, Green Hell | Four needs, axe, fire, cooking, shelter, sleep | No temperature, injuries, water containers, spear or bow |
| Story | Reference story modes: missions, cut-scenes, voiced lines | Eight chapters for the first day, companion lines as text | Ends after the first night; no cut-scenes or voice |
| Saving | Automatic, reliable | Browser save with backup, plus MongoDB with five older versions | Database is local only |
| Look | Photoreal | Stylised: simple shapes, coloured fog, painted sky | Photoreal is out of reach on this laptop; stylised quality can still rise a lot |

## Graphics: what can still improve on this laptop

| Change | Effect | Cost |
|---|---|---|
| Flowers and varied ground plants in the meadow — **done 2026-11-11** (flowers; no other ground plants yet) | Colour and life up close | Low |
| Leaves, pollen and insects drifting in the wind — **done 2026-11-11** (leaves and pollen, no insects) | Makes wind visible, like Ghost of Tsushima | Low |
| Rain with wet darkening and ripples on water | Mood and weather | Medium |
| Water: shore foam, depth colour, reflections of the sky — **done 2026-11-11** | River and lake look far better | Medium |
| Tree variety: more shapes, trunks that sway, fallen logs — **done 2026-11-11** (birch, tall pine, bushes, fallen logs, old stumps; bushes and logs have no collision) | Forest stops looking repeated | Medium |
| Soft light shafts at dawn, bloom on fire and sun | Atmosphere | Medium; must be measured for frame rate |
| Terrain detail textures from Poly Haven (CC0) | Ground stops looking flat up close | Medium |
| Clouds that move and cast shadow | Sky comes alive | Medium |

Every one of these must be measured for frame rate on this laptop before it stays in. Graphics pass 1 was measured on 2026-11-11 with the Chrome window in front: 44–48 frames per second before, 42–55 after, at the same three spots (meadow, river bank, forest). See `GRAPHICS_AUDIT.md` for the element-by-element check that followed.

## Build order

1. **Done 2026-11-11 — Map like GTA:** waypoint you set on the full map and see on the minimap; icons for the river crossing, camp and things you have discovered; zoom.
2. **Done 2026-11-11 — Graphics pass 1:** flowers, drifting leaves, better water, tree variety.
3. **Weather:** rain, wet ground, wind strength that changes.
4. **Animals:** an animated rabbit (none found free yet), fox, tracks on the ground, fish.
5. **People in motion:** check clothing while moving, add carrying and sitting animations if the free tier of the second animation library has them.
6. **Survival depth:** spear, water container, temperature and warmth from fire and clothing. Clothing then matters for play, not only looks.
7. **Story after the first night:** winter is coming; build, store food, explore up to the waterfall.
8. **Settings left over:** day length, difficulty, wolves on or off, quality presets, key list.
9. **Sound checked by ear, then two players over the internet.**

## Still unverified

- Sound has never been heard.
- Frame rate could not be measured reliably in the last check because the browser window was in the background; the animal work measured 36–53 frames per second earlier.
- Wolf death animation, animal stride at speed, humans in motion.
- Two players over the internet.
