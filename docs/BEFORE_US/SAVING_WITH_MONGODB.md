# Saving with MongoDB

How the world is saved in BEFORE US, in plain language.

## The short version

The host's game saves the whole world in two places:

1. **In the browser** (as before). This always happens and needs nothing extra.
2. **In a MongoDB database on the host's computer**, when the small save server is running.

If the database or the save server is not running, the game still works and saves in the browser only. The panel at the top of the game shows which one is in use: "Saved to database" or "Saved in this browser only".

Only the host saves. A friend who joins does not need the database or the server.

## How to start it

Run these from the `game` folder, each in its own terminal:

```
npm run mongo:up     # starts the database (Docker container "beforeus-mongo")
npm run server       # starts the save server on http://127.0.0.1:5184
npm run dev          # starts the game on http://127.0.0.1:5183
```

`npm run mongo:down` stops the database. The saved worlds stay on disk (Docker volume `beforeus-mongo-data`) and come back with `npm run mongo:up`. The container is set to start again by itself after a reboot unless you stopped it with `mongo:down`.

To check that it is working, open http://127.0.0.1:5184/api/health. It should show `{"ok":true,"db":true}`. If it shows `"db":false`, the server is running but the database is not.

### Ports and settings

| What | Default | Change with |
|---|---|---|
| Database | `mongodb://127.0.0.1:27019` | `MONGO_URL` |
| Database name | `before_us` | `MONGO_DB` |
| Save server port | `5184` | `PORT` |
| Server address used by the game | `http://127.0.0.1:5184` | `?db=<url>` in the game's address |

The database uses port **27019**, not 27018, because 27018 on this computer already belongs to another project's database (`hearthborn-mongo`). The two do not touch each other.

Everything listens on `127.0.0.1` only, so nothing is reachable from other computers.

## What happens when you play

**When the host starts the game** it asks the save server for the world (the world's name is the room code in the friend's link). It waits at most 1.5 seconds.

- The server has a save: that save is loaded.
- The server has no save, or is not running: the browser save is loaded, exactly as before. If the browser has none either, a new world is made.
- The address has `?fresh=1`: nothing is loaded and a new world is made.

There is one exception. If the browser holds a save that the database never confirmed, the browser save is used instead. This happens when you played with the server off, imported a save file, pressed "new world", or closed the tab while a save was still being sent. That save is then sent to the database on the next save.

**When the game saves** (every 45 seconds, each morning, and when the tab closes) it writes the browser save first, then sends the same save to the server in the background. The game never waits for the server. If the server does not answer, the game shows "Saved in this browser only" and tries again at the next save.

## What is stored

Database `before_us` has two collections:

- `worlds`: one document per world, the current save. It holds the full game state as text (players, items, cut trees, fires, shelter, animals, day and time, story progress), plus the save time, day number, world seed, number of players and size in bytes.
- `history`: the previous **5** saves of each world. Older ones are deleted automatically.

A save must be a version 1 BEFORE US state and smaller than 5 MB, or the server refuses it and keeps what it had.

## Looking at saves and rolling back

List the saved versions of a world (replace `ROOM` with your room code):

```
curl http://127.0.0.1:5184/api/worlds/ROOM/history
```

Version 1 is the save just before the current one, version 5 the oldest. To go back to one of them, **close the game first**, then:

```
curl -X POST http://127.0.0.1:5184/api/worlds/ROOM/restore/1
```

The save you replaced is kept in the history, so a restore can be undone. Then open the game again. If the game still loads the newer world, the browser was holding a save the database never confirmed. In that case download the restored world with `curl http://127.0.0.1:5184/api/worlds/ROOM > my-world.json` and load that file with **Import** on the start screen.

With saves every 45 seconds, five versions cover only the last few minutes. For anything older, use a backup.

## Backups

Simple way: use **Export** on the start screen. It saves the browser copy to a file, and **Import** loads it back.

Whole database, to a file in the current folder:

```
docker exec beforeus-mongo mongodump --db before_us --archive --gzip > before_us_backup.gz
```

Put it back (this replaces what is in the database):

```
docker exec -i beforeus-mongo mongorestore --archive --gzip --drop < before_us_backup.gz
```

One world as a plain save file, which Import on the start screen also accepts:

```
curl http://127.0.0.1:5184/api/worlds/ROOM > my-world.json
```

## Limits

- **Local only.** The database and the save server run on the host's computer. Nothing is stored online.
- **Two players over the internet:** only the host's machine needs the database and the server. The friend needs neither.
- **Hosting it online is not set up.** That would need a hosted database such as MongoDB Atlas, the save server running somewhere public, and a login so strangers cannot overwrite worlds. The server has no passwords today because it only listens on this computer.
- **Playing from a different address** (not `localhost:5183` or `127.0.0.1:5183`) will be blocked by the server until that address is added to the allowed list in `game/server/app.js`.
- **Closing the tab:** the last save is always written to the browser. It reaches the database only if the browser lets the upload finish; for large worlds (over about 60 KB) it may not. Nothing is lost: the browser copy is used on the next start and then sent to the database.
- **One host per world.** Two hosts saving the same room code would overwrite each other.

## Files

- `game/server/app.js`: the save server. `game/server/index.js` starts it.
- `game/src/store.ts`: the game's side (browser save plus database save).
- `game/tests/server.test.ts`: tests. They use the real database and are skipped with a message when it is not running.
