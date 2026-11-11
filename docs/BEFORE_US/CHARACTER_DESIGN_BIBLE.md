# Character Design Bible

Status: planning draft, 2026-11-11. No characters exist yet.
Marking: **[V]** verified primary source; **[S]** secondary; **[U]** judgement or unverified.

## Design intent

Two people who look like they have lived outdoors their whole lives: capable, weathered, expressive, and attractive in the way healthy, strong, real people are. Either player may choose either character. No ability, stat or role depends on which is chosen.

Rules for both:
- Beauty comes from face structure, expression, eyes and skin quality, not from exaggeration or exposure.
- Clothing is survival clothing first: it covers what a person in that climate would cover.
- They must look right at gameplay distance, from behind, in motion, in rain and at night, not only in a menu.
- One consistent identity: the same face, scars and proportions in every outfit and lighting condition.

## The woman (working name: to be chosen)

- **Age and build:** late twenties; lean and athletic, the build of a runner and climber. Strong shoulders and legs, natural proportions.
- **Face:** defined cheekbones, a strong jaw softened by a full mouth, large expressive eyes set under straight, slightly heavy brows. Slight natural asymmetry. Fine sun lines at the eyes.
- **Skin:** tanned and freckled across nose and cheeks, visible pores, small healed scars on forearms and one through an eyebrow. Dirt and sweat appear with exertion.
- **Hair:** thick, dark, practical: part-braided and tied back with cord, loose strands at the face. Moves with wind.
- **Clothing:** fitted hide tunic and leggings, wrapped hide footwear, fur shoulder mantle in cold. Bone toggles, a carved pendant, plant-fibre cord belt carrying a pouch and knife.
- **Body language:** watchful, light on her feet, quick to smile.

## The man (working name: to be chosen)

- **Age and build:** around thirty; broad but not bodybuilder-heavy, a hauler and thrower. Thick forearms, strong back.
- **Face:** deep-set eyes, pronounced brow, straight nose once broken, short uneven beard. Warm when relaxed.
- **Skin:** weathered, darker on face and forearms, scars on hands and a shoulder.
- **Hair:** shoulder-length, tied or loose; beard trimmed with stone, so never neat.
- **Clothing:** hide kilt or leggings with a sleeveless hide vest, fur cloak in cold, wrist wraps, cord belt.
- **Body language:** steady, deliberate, protective without posturing.

These are art-direction proposals for you to change. Ancestry, skin tone and naming are open; see OPEN_QUESTIONS.md.

## Pipeline decision

| Option | Quality | Cost | Beginner effort | Works on Linux | Can go in a public repo |
|---|---|---|---|---|---|
| **MetaHuman** | Best available | Free under $1M revenue [V] | Low to create, medium to optimise | Creator yes since 5.7 [V], but needs ~8 GB VRAM | No |
| Character Creator 5 | High | ~$500 [S] | Low–medium | Not confirmed | No |
| Daz to Unreal | High | Interactive licence per item [S] | Medium | Not confirmed | No |
| Custom Blender sculpt | Depends on skill | Free | Very high: months per photoreal face [U] | Yes | Yes |
| MPFB2 / MakeHuman | Mid; needs heavy texture and hair work | Free, CC0 output [V] | Medium | Yes | Yes |
| Ready-made Fab characters | Varies | Per listing | Low | n/a | No |

**Recommendation: MetaHuman for both leads.** It gives the best face, eyes, skin shading and facial rig for no money, and is covered by the normal Unreal licence since 5.6. [V] ([licence](https://www.metahuman.com/license), [FAQ](https://gateway.unrealengine.com/en-US/faq))

Trade-offs to accept:
- Cannot be authored on the current laptop.
- Cannot be committed to a public repository.
- MetaHumans are expensive to render; they need optimisation (below).
- Any MetaHuman can look generic. The individual character comes from deliberate sculpting of proportions, custom skin detail, scars, hair and clothing.

MPFB2 is the fallback if a fully open, redistributable character ever becomes a requirement.

## Technical plan

| Topic | Plan |
|---|---|
| Hair | **Cards by default**, strands only on the nearest character at the high tier. MetaHuman defaults: 50,000 strands at LOD0, cards from LOD2; forcing cards typically gains 20–30% [V] ([LOD specs](https://dev.epicgames.com/documentation/metahuman/platform-support-and-lod-specifications-for-metahumans)) |
| Skin | MetaHuman skin material (subsurface profile) plus custom detail maps for freckles, scars, dirt and wetness |
| LODs | Use MetaHuman LODs; force lower LODs beyond a few metres |
| Clothing | No prehistoric clothing pack was found on Fab [S]. Make our own: simple hide wraps modelled in Blender (or Marvelous Designer), skinned to the body. Fur as cards or shell textures |
| Cloth simulation | Deferred. Skinned clothing first |
| Face animation | MetaHuman facial rig with idle expressions, blinks, eye darts, breathing; performance capture later |
| Retargeting | Game Animation Sample animations retarget to MetaHuman bodies with the IK Retargeter [V] |

## Until MetaHumans are possible

Use the Game Animation Sample's mannequin or its MetaHuman-bodies test character as a placeholder. This is the one deliberate placeholder in the plan and it is replaced at milestone M4.

## Acceptance criteria

- Both characters read as specific individuals in a side-by-side screenshot with no clothing or hair differences hidden.
- Faces hold up in a close over-the-shoulder camera at dawn, noon, firelight and overcast rain.
- No clipping between body, clothing and hair in the full locomotion set.
- Two characters on screen stay within the frame budget on the recommended tier.

## Risks

- Achieving "memorable and beautiful" is art direction, not a setting. Expect several iterations and outside feedback.
- Custom clothing is the largest piece of original art in the slice.
- MetaHuman licence wording on redistribution was read from an older EULA version; re-read the current text before any public release of project files.
