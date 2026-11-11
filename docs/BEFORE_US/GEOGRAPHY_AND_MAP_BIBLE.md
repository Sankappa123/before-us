# Geography and Map Bible

Status: planning draft, 2026-11-11. No map exists yet.
Marking: **[V]** verified primary source; **[S]** secondary; **[U]** textbook knowledge or judgement, not re-checked.

## Eldoria and the First Valley

Eldoria is a fictional temperate mountain region at the end of an ice age: glaciers have retreated to the high peaks, leaving carved valleys, lakes and young forest.

**The First Valley** is a glacial trough about 2 km long, with the playable area around 1–1.5 km² inside a 2 × 2 km landscape. Small on purpose: dense and hand-finished beats large and empty.

### Layout (proposal)

```
        N  high peaks, snow, glacier remnant (backdrop, not walkable)
        |
   [cirque lake]            <- source tarn under the headwall
        |  stream
   [hanging valley lip] ==> WATERFALL (60-80 m) into plunge pool
        |
   upper valley: conifer slopes, scree, cave in west cliff
        |
   tributary stream (east) -> alluvial fan -> joins river
        |
   mid valley: mixed forest, meadow terraces  <- start area, first camp
        |
   river meanders across floodplain: gravel bars, reeds, fertile soil
        |
   [valley lake] with delta + wetland at inflow
        |
        S  moraine ridge and pass (the way out, for later regions)
```

### Why each feature is where it is

| Feature | Geographic reason | Gameplay purpose |
|---|---|---|
| U-shaped valley with steep walls | Glaciers carve wide, flat-floored troughs | Natural boundary without invisible walls |
| Waterfall from a hanging valley | Side glaciers cut less deep than the main one, leaving their valleys "hanging" | Landmark visible from everywhere; navigation |
| Cirque lake | Bowl scooped at a glacier's head | Reward for climbing; later region gate |
| Alluvial fan | A steep stream drops its gravel where it meets the flat floor | Stone and flint source |
| Floodplain and meanders | Rivers on flat ground wander and deposit fine soil | Fertile land for future farming; reeds, clay |
| Lake behind a moraine | Glacial debris dams the valley | Fish, waterfowl, wetland plants |
| Cave in limestone cliff | Water dissolves limestone | First natural shelter; future painting/knowledge site |
| Pass over the moraine | Lowest point of the rim | Exit to the next region |

Landmarks: the waterfall, a lone large tree on the meadow terrace, a split boulder on the fan, the cave mouth, the lake's island.

## Rules the terrain must obey [U]

1. **Water flows downhill, always.** Rivers are placed along the computed flow path, never drawn by hand across a rise.
2. **Streams merge, they do not split** (except on fans and deltas). Two small streams make a bigger one; width and depth grow downstream.
3. **Streams never cross ridgelines.**
4. **Glacial valleys are U-shaped; stream-cut side valleys are V-shaped.**
5. **Steep ground is bare.** Above roughly 35–40° there is rock and scree, not soil and trees.
6. **Sediment sorts by size.** Boulders and cobbles at the top of a fan and in fast water; sand and silt in slow water and floodplain.
7. **Flat land next to a river floods**, so it is wet meadow and reeds, not old forest.

## Vegetation zones [U]

| Zone | Where | Plants |
|---|---|---|
| Riparian strip | Within ~5–30 m of water | Alder, willow, reeds, sedge; gravel bars on inside bends |
| Floodplain meadow | Flat valley floor | Tall grass, wildflowers, scattered willow |
| Mixed forest | Lower slopes, terraces | Beech, hornbeam, maple, hazel understorey, ferns |
| Conifer forest | Upper slopes, shaded (pole-facing) sides | Pine, sparse understorey, moss |
| Sun-facing dry slope | Slopes facing the sun | Open grass, scrub, scattered pine |
| Scree and alpine | Above the treeline, steep ground | Rock, lichen, low shrubs, snow patches |
| Wetland | Lake inflow | Reeds, rushes, standing water |

Zones are driven by five data layers: height, slope, facing direction, wetness (how much water drains through a spot) and distance to water. The same layers place animal habitats.

## Reference valleys

| Place | Why |
|---|---|
| Lauterbrunnen, Switzerland | The textbook U-shaped valley, with many waterfalls from hanging valleys |
| Vézère / Dordogne, France | Limestone cliffs and rock shelters with real Stone Age habitation |
| Yosemite Valley, USA | Glacial trough with 1 m public elevation data available |

These are visual and structural references. Eldoria is not a copy of any of them.

## How the terrain gets made

| Step | Tool | Notes |
|---|---|---|
| 1. Get real elevation data for a reference valley | Copernicus DEM 30 m (free, attribution required) [S] or USGS 3DEP 1 m (US public domain) [U] | Real data gives physically correct drainage for free |
| 2. Clip and convert | QGIS / GDAL (free, runs on Linux) | 16-bit height image |
| 3. Reshape, erode and add detail | **Gaea 2** (best erosion; Windows only [V]; Community edition free for non-commercial learning, Indie $99 [V/S]) or Houdini Indie (~$299/yr, runs on Linux [S/U]) | Also exports the data layers: flow, wear, deposit, slope |
| 4. Import to Unreal Landscape | 2017 × 2017 at 1 m per point ≈ 4 km² [S] | World Partition enabled |
| 5. Place water along the flow map | Water plugin splines | See WORLD_AND_ENVIRONMENT_BIBLE.md |
| 6. Scatter vegetation from the data layers | PCG | Same doc |

Unreal landscape sizes must be specific values (505, 1009, 2017, 4033, 8129). [S] ([guide](https://dev.epicgames.com/documentation/en-us/unreal-engine/landscape-technical-guide-in-unreal-engine))

### Tool decision

| Tool | Cost | Linux | Erosion quality | Verdict |
|---|---|---|---|---|
| Gaea 2 | Free to learn; $99 Indie | No | Excellent | **Recommended** if the editor machine is Windows |
| Houdini Indie | ~$299/yr; Apprentice free non-commercial | Yes | Excellent, steep learning curve | Alternative |
| World Creator | $99 Indie; free tier cannot export [S] | No | Very good | Alternative |
| Unreal sculpting only | Free | Yes | None | Not enough on its own |

## Fact versus artistic assumption

- **Established:** the landform rules and vegetation logic above are standard physical geography.
- **Artistic:** Eldoria's location, the compression of a whole landscape into 2 km, the exact species mix, and waterfall height.

## Acceptance criteria

- A geography-literate viewer cannot find water running uphill, a stream crossing a ridge, or forest on a cliff.
- From the start area the player can see at least three landmarks and can navigate by them without a map.
- Every zone in the table is visibly distinct in a single flyover.
