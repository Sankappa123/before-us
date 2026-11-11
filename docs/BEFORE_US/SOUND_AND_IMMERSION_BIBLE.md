# Sound and Immersion Bible

Status: planning draft, 2026-11-11. Nothing here is implemented.
Marking: **[V]** verified against a source during research; **[U]** not re-checked.

## Goal

The valley should sound alive when the player stands still: wind in different kinds of trees, the river growing louder as you approach, birds changing with the time of day, insects at dusk, distant wolves at night.

## Audio engine decision

| Option | Cost | Verdict |
|---|---|---|
| Unreal's native audio | Free, no integration | **Use this** |
| Wwise | Free for projects with a production budget under $250K [V] ([Audiokinetic](https://www.audiokinetic.com/en/blog/free-wwise-indie-license/)) | Not needed; adds a second tool to learn |
| FMOD | Free when revenue is under $200K per year [V, partially] ([FMOD](https://www.fmod.com/licensing)) | Not needed |

Native tools we will use [U]:
- **MetaSounds**: build sounds from layers and randomness (footsteps, wind, fire) so nothing repeats exactly.
- **Soundscape plugin**: scatters ambient one-shots (a bird here, a branch creak there) around the listener based on biome tags.
- **Audio Modulation**: global dials (time of day, wind strength, rain) that many sounds listen to.
- **Attenuation and occlusion**: sounds get quieter and duller behind hills and inside caves.
- **Reverb volumes**: cave, forest and open-valley reverbs.

Steam Audio (free, open source) offers physically based occlusion and reverb, but support for UE 5.7/5.8 was not confirmed. [V for existence] ([docs](https://valvesoftware.github.io/steam-audio/doc/unreal/index.html)). Evaluate later.

## Sound list for the slice

| Category | Sounds | Driven by |
|---|---|---|
| Footsteps | Grass, dirt, rock, mud, shallow water, wood | Surface type under the foot at each step |
| Movement | Breathing by exertion, clothing rustle, foliage brush | Stamina, speed, overlap with plants |
| Water | River bed (by flow speed), waterfall, lake lap, wading, swimming, underwater filter | Distance, depth |
| Weather | Wind layers by biome, rain on leaves/ground/water | Modulation dials |
| Wildlife | Dawn chorus, daytime birds, dusk insects, night owls, wolf howls, deer alarm bark | Time of day, AI events |
| Tools | Axe on wood, stone on stone, tree fall | Impact events and material |
| Fire | Ignition, crackle scaling with fuel, cooking sizzle | Fire state |

Footsteps work like this [U]: every ground material is tagged with a surface type; when the animation says "foot down", the game checks what is under the foot and plays a randomized sound for that surface, with wetness as a parameter.

## Sound sources and licences

| Library | Licence | Use? |
|---|---|---|
| Sonniss GameAudioGDC bundles | Royalty-free, commercial use, no attribution; no redistribution as raw sound files; no AI training [V] ([licence](https://sonniss.com/gdc-bundle-license/)) | **Yes**, primary free source |
| Freesound | Mixed. Filter to CC0. CC-BY needs credit; CC-BY-NC cannot be shipped [U] | Yes, CC0 only, logged in the manifest |
| BBC Sound Effects | Personal, educational and research use only [V via secondary sources] | **No.** Do not ship |
| Zapsplat | Free with attribution; paid tier removes it [U] | Optional |
| Boom Library and similar | Paid, royalty-free [U] | Later, for hero sounds |
| Own recordings | Ours | Encouraged; a phone recorder near a real stream is useful |

Raw sound files from any licensed library must not be committed to a public repository.

## Multiplayer

Sounds are triggered locally from replicated events. The other player's footsteps, tool impacts and voice exertion are positioned in 3D.

## Performance

Low. Limit the number of simultaneous voices and stop distant emitters.

## Talks to study [U, not located during research]

Ghost of Tsushima (wind as a guide), The Last of Us Part II, Horizon, Firewatch ambience, and the "A Sound Effect" interviews on Red Dead Redemption 2.

## Acceptance criteria for the slice

- Standing still for two minutes, no obviously repeating loop is audible.
- With eyes closed, the player can tell which way the river is, and whether they are in forest, open grass or a cave.
- Footsteps change correctly across all six surfaces.
- Dawn, midday, dusk and night each sound distinct.
