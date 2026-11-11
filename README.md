# BEFORE US

*Two lives. One world. Nothing was here before us.*

A third-person survival game that runs in the browser. You arrive in an untouched valley with empty hands, alongside a companion, Asha. Find water, strike a stone axe, light a fire before the wolves wake, hunt, build a shelter and live through the first night.

Built with Three.js and TypeScript. All models are CC0 (Quaternius); all sound is generated in code.

## Run it

```bash
cd game
npm install
npm run dev
```

Open http://localhost:5183.

Optional database saving (needs Docker):

```bash
npm run mongo:up
npm run server
```

Without it, the world is saved in the browser.

## Controls

WASD move, Shift run, C crouch, Space jump, mouse look (click to capture), mouse wheel zoom, E use, 1–4 craft and build, F eat, Q throw a stone, M map, N minimap range, X clear waypoint, Esc settings and characters.

## Tests

```bash
cd game
npm test
```

## Documents

Design, research and plans are in `docs/BEFORE_US/`. Start with `GAME_DIRECTION.md` and `NEXT_STEPS_PLAN.md`. Asset sources and licences are in `ASSET_AND_LICENSE_MANIFEST.md`.

## Status

An early playable build. Known gaps are listed in `docs/BEFORE_US/NEXT_STEPS_PLAN.md` and `GRAPHICS_AUDIT.md`.
