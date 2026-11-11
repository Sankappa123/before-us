# Tools and Weapons Bible

Status: planning draft, 2026-11-11. Nothing is implemented.
The technical guidance here is standard Unreal practice and was not re-sourced during research [U].

## Principle

Make a few tools feel excellent before adding many. A tool has weight, a correct grip, a sound and an effect on the world. No combat system in the slice.

## Tool list

| Tool | Made from | Use | Milestone |
|---|---|---|---|
| Stone | Found | Throw, hammer, strike another stone | Slice |
| Stick / branch | Found, or broken from a sapling | Fuel, shaft, club | Slice |
| Sharp flake | Stone struck on stone | Cutting fibre, butchering | Slice (as a crafting step) |
| **Stone axe** | Flake or shaped stone + stick + plant fibre | Felling small trees, chopping | **Slice: the one crafted tool** |
| Spear | Stick sharpened, later stone-tipped | Hunting, fishing | Next |
| Club | Heavy branch | Defence | Next |
| Basic bow | Stave, sinew or fibre string, arrows | Hunting at range | Later |
| Containers | Bark, gourd, hide, later pottery | Carry and boil water | Next |

## How holding a tool works

1. **Attachment:** the tool attaches to a socket on the right hand bone. Each tool has its own grip offset so it sits in the palm, not near it.
2. **Grip pose:** a per-tool finger pose is layered onto the hand so fingers wrap the handle.
3. **Second hand:** two-handed tools carry an "off-hand" socket on the tool. After the body animation is computed, inverse kinematics pulls the left hand onto that socket, so both hands stay on the shaft through any movement.
4. **Carrying:** a tool on the belt or back attaches to a different socket; equipping plays a short draw animation and swaps sockets at the right frame.
5. **Bow (later):** attached to the left hand; the right hand is pulled to a string socket and the draw is driven by a curve.

## How using a tool works

- The swing is an upper-body animation layered over locomotion.
- The animation carries a marker for the hit window. During that window the host traces from the tool head and applies the result: wood chips fly, the tree loses health, the axe loses durability.
- Motion Warping nudges the character so the blade lands on the trunk, not beside it.
- Impact sound and particles depend on what was hit (wood, stone, flesh).

## Weight and feel

- Heavier tools slow the swing and cost more stamina.
- A slight camera and body reaction on impact sells the contact.
- A failed hit (wrong tool, wrong material) should look and sound wrong, not silently do nothing.

## Durability

Tools wear with use and visibly degrade (binding frays, edge chips) before breaking. For the slice: a simple durability number with one worn-state material change.

## Crafting interaction

For the slice, crafting is physical, not a menu: the player kneels, the camera stays in the world, and the axe is assembled in the hands over a few seconds with sound for each step. A minimal recipe prompt is acceptable; a full crafting UI is not needed yet.

## Multiplayer

- Equipped item, durability and hits are decided by the host and replicated.
- The swing plays immediately for the local player for responsiveness; the result is confirmed by the host.
- Dropping, handing over and picking up tools replicate as world items.

## Assets needed for the slice

| Asset | Source |
|---|---|
| Stone, stick, flake, axe meshes | Megascans rocks and branches (free on Fab) as a base, assembled in Blender; or modelled from scratch |
| Plant fibre cord | Modelled |
| Chop, strike, craft, pick-up animations | Survival animation pack or Mixamo; see CHARACTER_ANIMATION_BIBLE.md |
| Impact sounds | Sonniss / own recordings |

## Acceptance criteria for the slice

- The axe stays seated in the hand through walk, run, jump and chop.
- Both hands are on the shaft during the two-handed chop, on flat ground and on a slope.
- Felling a tree takes a believable number of blows, with chips, sound and a falling trunk seen by both players.
- A new tool can be added by creating data and art only, without new code.

## Risks

- Hand and tool alignment is fiddly and is where "floating weapon" defects come from; budget iteration time.
- Tree felling touches foliage instancing, physics, replication and saving at once. It is the hardest single interaction in the slice.
