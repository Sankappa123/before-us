# Character Animation Bible

Status: planning draft, 2026-11-11. Nothing is implemented.
Marking: **[V]** verified primary source; **[S]** secondary; **[U]** judgement or unverified.

## Goal

Movement that has weight: feet plant, the body leans into turns, starts and stops take time, slopes change posture, and a carried log changes how the character walks.

## How motion matching works (plain language)

Classic animation uses a hand-built flowchart: idle → walk → run, with blends between. Motion matching replaces most of that. Many minutes of motion-capture are stored in a database. Every frame, the game asks: "given the current pose and where the player is about to go, which stored frame fits best?" and continues from there. The result is fluid starts, stops and turns without hand-authoring each transition. The cost is that it needs a lot of good capture data for every kind of movement. [V] ([docs](https://dev.epicgames.com/documentation/unreal-engine/motion-matching-in-unreal-engine))

## Decision table

| Approach | Good | Bad | Verdict |
|---|---|---|---|
| **Motion matching via Epic's Game Animation Sample (GASP)** | Best quality; 500+ free mocap animations; Epic's own direction; updated for 5.8 on 2026-08-12 [V] ([blog](https://www.unrealengine.com/tech-blog/download-the-latest-game-animation-sample-project-now-updated-for-ue-5-8)) | Harder to debug; new movement types need new data; reports of remote-player jitter under latency [S] | **Use for locomotion** |
| State machine + blend spaces | Simple, predictable, works with few animations | Less fluid | **Use for actions** (chop, craft, swim) where data is sparse |
| ALS-Refactored | C++, replicated, MIT; targets UE 5.7 [V] ([repo](https://github.com/Sixze/ALS-Refactored)) | No motion matching; 5.8 not confirmed | Fallback if GASP networking fails |
| ALS-Community | MIT | Maintainers say compatibility fixes only and recommend other bases; UE 5.4 [V] ([repo](https://github.com/PanicPetal/ALS-Community)) | Not recommended |

GASP includes walk, run, strafe, jump, vault, ledge climb and drop. It does **not** document swimming, and crouch is unconfirmed. Use its CharacterMovementComponent character, not the experimental Mover one.

## Coverage plan

| Movement | Source | Milestone |
|---|---|---|
| Idle, breathing, walk, jog, run, sprint, turns, starts, stops, jump, land, vault, climb ledge | GASP | M1 |
| Slopes, uneven ground, foot planting | Foot placement / leg IK, stride and orientation warping (built in) | M1 |
| Pick up, carry sticks and stones | Purchased survival pack or Mixamo, layered on upper body | M3 |
| Chop, strike stone, craft, light fire, eat, drink | Purchased survival pack; candidates below | M3 |
| Two-person log carry | Custom; needs both characters IK-linked to the log | M3 or M6 |
| Crouch, sneak | Verify in GASP; otherwise pack | M5 (hunting) |
| Wading, swimming | CharacterMovementComponent swim mode + small state machine; animations to be sourced | After slice, unless the river demands it |
| Spear throw, bow | Not found in packs researched | After slice |
| Skinning, digging, mining | Pack with mining (42), skinning (13), digging [S] ([listing](https://www.fab.com/listings/5dc66dcf-fc89-48c1-af7e-ccda37261af6)) | M5 |
| Injury, fatigue variants | Additive poses and speed scaling | After slice |
| Hit reactions, ragdoll | Physics Control (GASP 5.8 includes a ragdoll level) | After slice |

## Animation data sources

| Source | Commercial use | Public repo | Notes |
|---|---|---|---|
| GASP | Yes, in Unreal products; Epic says animations may be reused and retargeted [S] | Assume no | ~5.6 GB [S] |
| Fab survival packs: Nikoff bundle (axe, log carry, spear, hammer); RBStudio (chopping, mining, crafting) | Yes, Fab Standard | No | Prices to be checked at purchase time [S] |
| Mixamo | Yes, royalty-free | No raw files [S] | Good gap-filler; quality varies |
| CMU mocap | Yes with credit [S] | Probably | Old, noisy |
| AMASS, LaFAN1, Bandai Namco datasets | **No**, non-commercial [V] | — | Study only |
| Video-to-mocap (Rokoko Vision and similar) | Rokoko says exports are commercially usable [S] | Ours | Good for unique actions; needs cleanup |
| MetaHuman Animator body capture (5.8) | Unreal licence | — | Experimental, single camera [V] |

## Avoiding the listed defects

| Defect | Countermeasure |
|---|---|
| Foot sliding | Motion matching + stride warping; match animation speed to movement speed |
| Floating feet | Foot placement IK on slopes and steps |
| Snapping | Inertial blending (built into the GASP setup) |
| Wrong hand placement, floating tools | Grip sockets and off-hand IK; see TOOLS_AND_WEAPONS_BIBLE.md |
| Clipping | Test every outfit against the full movement set |
| Robotic feel | Mocap data, look-at, breathing, additive lean, slight timing variation |

## Multiplayer

Poses are not sent. Each machine runs its own motion-matching search from replicated movement state. Remote characters need a good predicted trajectory; if they jitter under latency, replicate the trajectory inputs (a paid component for this exists on Fab [S]). **This is the main technical risk in animation; test it in the first milestone.**

## Talks to study

| Talk | Link |
|---|---|
| Motion Matching and The Road to Next-Gen Animation (For Honor, GDC 2016) | https://www.gdcvault.com/play/1022985/Motion-Matching-and-The-Road |
| Learned Motion Matching (Ubisoft La Forge) | https://theorangeduck.com/page/learned-motion-matching |
| Motion Matching in The Last of Us Part II (GDC 2021) | https://gdcvault.com/play/1027118/Motion-Matching-in-The-Last |
| Player Traversal Mechanics in Horizon Zero Dawn (GDC 2017) | https://gdcvault.com/play/1024699/Player-Traversal-Mechanics-in-the |
| Epic: Motion Matching and the Game Animation Sample (Unreal Fest 2024) | https://dev.epicgames.com/community/learning/talks-and-demos/0y9w/unreal-engine-motion-matching-and-the-game-animation-sample-in-ue-5-4-unreal-fest-2024 |
| Epic: Embracing Motion Matching: Using a Little to Get a Lot | https://forums.unrealengine.com/t/talks-and-demos-embracing-motion-matching-using-a-little-to-get-a-lot/2705269 |

No official public talk on Rockstar's or Assassin's Creed's animation systems was found. The Ubisoft talks above describe the family of techniques those games use.

## Acceptance criteria for the slice

- On a 30° slope and on rocks, both feet stay planted with no visible sliding at walk and run.
- Start, stop and 180° turn each look continuous in slow motion.
- The remote player looks as smooth as the local one at 100 ms simulated latency.
- A held axe never leaves the palm during the locomotion set or the chop.
