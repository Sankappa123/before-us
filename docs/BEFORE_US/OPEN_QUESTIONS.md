# Open Questions

Status: 2026-11-11. Ordered by how much each blocks progress.

## Needs your answer before work can start

| # | Question | Why it matters | Recommendation |
|---|---|---|---|
| Q1 | **Which machine will run the Unreal editor?** Cloud PC, a purchase, or a PC you can borrow? | The laptop (2 GB video memory) cannot run it. Nothing visual can begin without this. | Cloud Windows PC for 3–6 months, then buy |
| Q2 | **What hardware and OS does your friend have?** | They need to run the game, and ideally the editor. Their machine might be the editor machine. | — |
| Q3 | **Which country are you in?** | Cloud PC services and prices vary by region; some are not offered everywhere. | — |
| Q4 | **Budget** for the first six months (cloud rental, ~$100–250 of asset packs, optional $99 terrain tool, $100 Steam fee later)? | Decides paid packs versus making things ourselves | A few hundred dollars covers the slice |
| Q5 | **Time available per week**, for each of you? | The roadmap estimate depends on it | — |
| Q6 | **Private repository on GitHub?** | Licensed assets cannot be in a public one | Yes, private |
| Q7 | **Is this meant to be sold eventually, or a personal project?** | Affects licences (non-commercial tools become unusable) and the Steam decision | Assume commercial so nothing has to be redone |

## Design questions (can wait until after M1)

| # | Question | Notes |
|---|---|---|
| Q8 | How do two people become a civilization? | Other humans joining, generational time skips, or both. Shapes the whole late game |
| Q9 | What happens on death? | Respawn at camp for the slice; lineage later |
| Q10 | Character names, ancestry and look | The character bible has proposals to react to |
| Q11 | How much interface on screen? | Proposed: minimal, state shown on the body |
| Q12 | Is discovery guided or fully experimental? | Proposed: experiment with gentle hints |
| Q13 | Real-time day length | Proposed: 40–60 minutes per day |
| Q14 | Does the world keep running when the host is offline? | No, with a listen server. Changing this needs a dedicated server |

## Technical unknowns to resolve by testing

| # | Unknown | When |
|---|---|---|
| T1 | Does motion-matched movement stay smooth for the remote player under latency? | M1 |
| T2 | Can felled trees be removed, replicated and saved cleanly with World Partition foliage? | M3 |
| T3 | Do the Water plugin's rivers look good enough on a steep valley, or are custom river meshes needed throughout? | M2 |
| T4 | Is experimental Nanite Foliage with Megaplants stable and fast enough, or do we stay on standard foliage? | M2 |
| T5 | Frame cost of two MetaHumans plus dense forest on the recommended tier | M4 |
| T6 | Does the Unreal editor run acceptably through the chosen cloud service? | M0 |

## Facts not yet verified

These came from secondary sources, older documents or general knowledge. Each should be confirmed before it is relied on.

- The current Unreal EULA and full Fab EULA text on redistribution (pages could not be fetched).
- The exact licence attached to the newly free Megascans, and whether it restricts engines.
- Whether Iris replication is production-ready in 5.8 (sources conflict).
- Whether the Game Animation Sample includes crouch; its exact size and licence tag.
- Current Fab prices for all paid packs.
- Shadow PC plan details and regional availability.
- All cloud hourly prices and hardware street prices.
- Whether the Linux editor runs on Ubuntu 26.04 with Wayland.
- Reports that Unreal Engine 6 changes the programming model.
- All archaeology dates except the Sibudu bow evidence.
- Command-line flags listed in CLAUDE_CODE_TOOLS_AND_SKILLS.md.

## Risks register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| No capable hardware | Certain today | Blocks all | Q1 |
| Scope exceeds two beginners | High | High | Slice-only focus; cut list in FIRST_VERTICAL_SLICE.md |
| Loss of motivation before anything looks good | Medium | High | M1 and M2 give visible results early |
| Experimental engine features break | Medium | Medium | Stable fallbacks chosen by default |
| Licence mistake (public repo, non-commercial data) | Low if rules followed | High | Manifest; private repo |
| Engine generation change (UE6) | Medium, 2027+ | Medium | Stay on UE5; C++ modules |
| Characters fall short of "beautiful and memorable" | Medium | High for this vision | Iterate early in M4; seek outside critique; consider commissioning an artist for the faces |
