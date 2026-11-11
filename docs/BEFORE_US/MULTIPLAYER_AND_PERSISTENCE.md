# Multiplayer and Persistence

Status: planning draft, 2026-11-11. Nothing here is implemented.
Marking: **[V]** = checked against the linked source during research; **[U]** = standard practice or recollection, not re-checked. Confirm [U] items before relying on them.

## What the players experience

Two friends join the same valley. One hosts, the other joins through a Steam invite. Both see the same trees fall, the same fire burn and the same shelter stand. When they quit and return a week later, the world is as they left it.

## Decision summary

| Question | Decision for the vertical slice | Why | Revisit when |
|---|---|---|---|
| Server model | **Listen server** (one player hosts) | Free, one build, no hosting. A dedicated server needs a source-built engine and paid hosting. [U] | You want the world running while the host is offline |
| Movement | **CharacterMovementComponent** | Mature, with built-in client prediction and server correction. [U] | Mover leaves experimental |
| Mover | Not used | Epic staff still called it experimental on 2026-09-17. [V] ([thread](https://forums.unrealengine.com/t/requesting-an-eta-on-iris-mover-network-prediction-plugin-compatibility-ue-5-8-2/2841863)) | — |
| Replication system | **Legacy replication, Iris off** | Iris was beta and off by default in 5.7; Epic has no plans to deprecate the legacy system. [V] ([thread](https://forums.unrealengine.com/t/5-7-iris-strategy/2699685)). 5.8 status not confirmed. | Iris is on by default in our engine version |
| Replication Graph | Not used | Built for large player counts. [U] | Never, at two players |
| Connecting friends | **Steam sessions + Steam Datagram Relay** | Relays traffic and hides IPs, so no port forwarding. [V] ([SDR](https://partner.steamgames.com/doc/features/multiplayer/steamdatagramrelay)). Steam Direct fee is $100 per app, recoupable. [V] ([fee](https://partner.steamgames.com/doc/gettingstarted/appfee)) | — |
| Alternative | Epic Online Services | Free, no royalty; P2P with relay fallback. [V] ([licensing](https://onlineservices.epicgames.com/licensing)) | Cross-store play is wanted, or to avoid the $100 during prototyping |
| Save ownership | **Host-owned world save** | Simplest model that matches a listen server. | A dedicated server is added |

During early development neither Steam nor EOS is needed: two editor windows on one machine (multi-process Play-In-Editor) or a direct IP connection on a LAN is enough.

## How replicated animation works (plain language)

We do not send skeleton poses over the network. Each machine runs its own animation graph. The server only replicates small facts: velocity, stance, what is held, whether the character is aiming, and "play this action now" events. Both machines then produce nearly the same motion locally. This is why animation choices (motion matching, IK) are mostly independent of networking. [U]

## Server authority rules

1. The host decides every outcome that matters: inventory changes, damage, crafting, building, tree removal, animal state.
2. The client asks ("I want to pick this up"); the host checks range, line of sight and inventory space, then applies and replicates.
3. The client may play cosmetic feedback immediately (swing animation, sound) but never changes world state on its own.

With two trusted friends, cheating is not the concern. The reason for the rule is consistency: one source of truth prevents the two worlds drifting apart.

## Persistence design [U]

| Thing saved | How |
|---|---|
| World slot | One `USaveGame` per world, owned by the host, with a version header |
| Player data | Stored inside the world save, keyed by the player's Steam/EOS unique ID |
| Persistent actors | Each has a stable `FGuid`; properties marked `SaveGame` are serialized (pattern from Tom Looman's [ActionRoguelike](https://github.com/tomlooman/ActionRoguelike)) |
| World Partition | Unloaded actors cannot be queried, so a server subsystem keeps the authoritative record map (GUID → struct) and applies it when a cell loads |
| Felled trees, gathered foliage | Foliage is instanced, with no actor per tree. Save a set of removed instance IDs plus a regrow time; hide them on load. Replicate removals with a fast-array delta |
| Built pieces | Array of piece type, transform, health, parent ID |
| Containers, fires | GUID-keyed records |
| Wildlife | Regional population counts, not individuals |

**Crash safety:** write to a temporary file, verify it, rename it over the old save in one step, and keep two or three rotating backups. Autosave every few minutes and whenever players sleep.

**Reconnection:** when the guest rejoins, the host finds their record by unique ID and restores position, inventory and stats. If the host drops, the session ends and resumes from the last autosave.

## Performance cost

Negligible network cost at two players. The real cost is discipline: every gameplay feature must be written host-authoritative from day one. Retrofitting multiplayer onto single-player code is the classic expensive mistake.

## Testing requirements

- Every feature is tested with two clients (host + guest), not just one.
- Guest joins late and sees correct state (fire already lit, tree already felled).
- Save, quit, reload: world identical.
- Kill the host process mid-session: the save is not corrupt and the backup loads.
- Simulated bad network (packet lag/loss console settings).

## Acceptance criteria for the slice

1. Friend joins via invite without router configuration.
2. Both see each other move smoothly with no visible correction snapping at normal latency.
3. All fifteen vertical-slice interactions produce the same result on both screens.
4. World survives quit and reload, and a forced crash.

## Risks

- Listen server means the guest cannot play when the host is away. Accepted for now.
- Foliage removal with World Partition is the least standard part; prototype it early.
- Steam requires the app fee and a Steamworks account before invites can be tested through Steam.

## Growth path

Listen server → add EOS for cross-store → optional dedicated-server build → Iris once default → more players. Nothing in the slice design blocks these.
