// Save-server tests. These need the real MongoDB container (npm run mongo:up, 127.0.0.1:27019).
// When it is not reachable the database tests are skipped with a message; nothing hangs.
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { startServer } from '../server/app.js';
import { generateWorld } from '../src/worldgen';
import { Sim, State } from '../src/sim';
import { WorldStore, browserSaveChanged, SAVE, BACKUP, SYNCED } from '../src/store';

const srv = await startServer({ port: 0, dbName: 'before_us_test' });
const dbUp = await srv.dbOk();
if (!dbUp) console.warn('\n[server.test] MongoDB is not reachable on 127.0.0.1:27019, so the database tests are SKIPPED. Start it with: npm run mongo:up\n');
const api = srv.url + '/api';
const run = Date.now().toString(36);
const put = (id: string, body: unknown) => fetch(`${api}/worlds/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };

let state: State;
beforeAll(() => {
  const sim = new Sim(generateWorld(1234, 8000));
  sim.join('p:host', 'Host', 0);
  for (let i = 0; i < 40; i++) sim.step(0.5);
  state = JSON.parse(JSON.stringify(sim.state));
});
afterAll(async () => { if (dbUp) await srv.dropDb(); await srv.close(); });

describe.skipIf(!dbUp)('save server with MongoDB', () => {
  it('reports health with the database connected', async () => {
    const r = await fetch(`${api}/health`);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, db: true });
  });

  it('answers 404 for a world that was never saved', async () => {
    expect((await fetch(`${api}/worlds/nobody-${run}`)).status).toBe(404);
    expect((await fetch(`${api}/worlds/nobody-${run}/history`)).status).toBe(404);
  });

  it('stores a real Sim state and returns exactly the same state', async () => {
    const id = 'round-' + run;
    const r = await put(id, state);
    expect(r.status).toBe(200);
    const info = await r.json();
    expect(info.ok).toBe(true);
    expect(info.day).toBe(state.day);
    expect(info.size).toBe(new TextEncoder().encode(JSON.stringify(state)).length);
    const back = await fetch(`${api}/worlds/${id}`);
    expect(back.status).toBe(200);
    const text = await back.text();
    expect(text).toBe(JSON.stringify(state));
    const loaded: State = JSON.parse(text);
    expect(loaded).toEqual(state);
    // and the game can continue from it
    const sim = new Sim(generateWorld(loaded.seed, 8000), loaded);
    expect(Object.keys(sim.state.players)).toEqual(Object.keys(state.players));
  });

  it('keeps at most 5 older versions, newest first, and GET returns the latest', async () => {
    const id = 'hist-' + run;
    for (let day = 1; day <= 8; day++) expect((await put(id, { ...state, day })).status).toBe(200);
    const cur: State = await (await fetch(`${api}/worlds/${id}`)).json();
    expect(cur.day).toBe(8);
    const h = await (await fetch(`${api}/worlds/${id}/history`)).json();
    expect(h.current.day).toBe(8);
    expect(h.versions.map((v: any) => v.day)).toEqual([7, 6, 5, 4, 3]);
    expect(h.versions.map((v: any) => v.n)).toEqual([1, 2, 3, 4, 5]);
    for (const v of h.versions) { expect(v.size).toBeGreaterThan(100); expect(Number.isNaN(Date.parse(v.savedAt))).toBe(false); }
  });

  it('restores an older version and keeps the replaced one in history', async () => {
    const id = 'restore-' + run;
    for (let day = 1; day <= 3; day++) await put(id, { ...state, day });
    const r = await fetch(`${api}/worlds/${id}/restore/2`, { method: 'POST' });
    expect(r.status).toBe(200);
    expect(((await (await fetch(`${api}/worlds/${id}`)).json()) as State).day).toBe(1);
    const h = await (await fetch(`${api}/worlds/${id}/history`)).json();
    expect(h.versions.map((v: any) => v.day)).toEqual([3, 2]);
    expect((await fetch(`${api}/worlds/${id}/restore/5`, { method: 'POST' })).status).toBe(404);
  });

  it('rejects bodies that are not a v1 save, and leaves the stored save alone', async () => {
    const id = 'bad-' + run;
    await put(id, state);
    expect((await put(id, 'this is not json')).status).toBe(400);
    expect((await put(id, { ...state, v: 2 })).status).toBe(400);
    const { players, ...noPlayers } = state;
    expect((await put(id, noPlayers)).status).toBe(400);
    const { seed, ...noSeed } = state;
    expect((await put(id, noSeed)).status).toBe(400);
    expect((await put(id, [1, 2, 3])).status).toBe(400);
    expect((await put('bad.id', state)).status).toBe(400);
    expect(await (await fetch(`${api}/worlds/${id}`)).json()).toEqual(state);
    expect((await fetch(`${api}/worlds/${id}/history`).then((x) => x.json())).versions).toEqual([]);
  });

  it('rejects a body over 5 MB', async () => {
    const r = await put('big-' + run, { ...state, junk: 'x'.repeat(5 * 1024 * 1024 + 10) });
    expect(r.status).toBe(413);
    expect((await fetch(`${api}/worlds/big-${run}`)).status).toBe(404);
  });

  it('allows the game origins through CORS and nobody else', async () => {
    for (const origin of ['http://localhost:5183', 'http://127.0.0.1:5183']) {
      const pre = await fetch(`${api}/worlds/x`, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'PUT' } });
      expect(pre.status).toBe(204);
      expect(pre.headers.get('access-control-allow-origin')).toBe(origin);
      expect(pre.headers.get('access-control-allow-methods')).toContain('PUT');
    }
    const other = await fetch(`${api}/health`, { headers: { Origin: 'http://evil.example' } });
    expect(other.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('client store: saves to browser and database, then loads from the database', async () => {
    const id = 'store-' + run, ls = memory();
    const store = new WorldStore(id, srv.url, ls);
    const seen: string[] = []; store.onChange = (w) => seen.push(w);
    expect(await store.load()).toEqual({ state: undefined, from: 'none' });
    store.save(state);
    expect(ls.getItem(SAVE)).toBe(JSON.stringify(state)); // browser copy is written at once
    await store.settled();
    expect(store.where).toBe('database'); expect(store.label()).toBe('Saved to database');
    expect(store.failures).toBe(0); expect(ls.getItem(SYNCED)).toBe('1');
    store.save({ ...state, day: 9 }); await store.settled();
    expect(JSON.parse(ls.getItem(BACKUP)!)).toEqual(state);
    // another browser with nothing saved gets the database copy
    const got = await new WorldStore(id, srv.url, memory()).load();
    expect(got.from).toBe('database'); expect(got.state).toEqual({ ...state, day: 9 });
    // after an import / new world the browser copy is used instead of the database copy
    browserSaveChanged(ls); ls.setItem(SAVE, JSON.stringify({ ...state, day: 2 }));
    const mine = await new WorldStore(id, srv.url, ls).load();
    expect(mine.from).toBe('browser'); expect(mine.state!.day).toBe(2);
    expect(seen).toEqual(['database']);
  });
});

describe('save server without a database', () => {
  it('still answers: health says db false, saves answer 503, client falls back to the browser', async () => {
    const down = await startServer({ port: 0, mongoUrl: 'mongodb://127.0.0.1:1', dbTimeoutMs: 300 });
    try {
      expect(await (await fetch(`${down.url}/api/health`)).json()).toEqual({ ok: true, db: false });
      expect((await fetch(`${down.url}/api/worlds/x`)).status).toBe(503);
      const ls = memory(); ls.setItem(SAVE, JSON.stringify(state));
      const store = new WorldStore('x', down.url, ls);
      const got = await store.load();
      expect(got.from).toBe('browser'); expect(got.state).toEqual(state);
      store.save(state); await store.settled();
      expect(store.where).toBe('browser'); expect(store.label()).toBe('Saved in this browser only');
      expect(store.failures).toBe(1); expect(ls.getItem(SYNCED)).toBe('0');
    } finally { await down.close(); }
  });

  it('client store falls back to the browser when no server is running at all', async () => {
    const ls = memory(); ls.setItem(BACKUP, JSON.stringify(state)); ls.setItem(SAVE, '{broken');
    const store = new WorldStore('x', 'http://127.0.0.1:1', ls);
    const got = await store.load(500);
    expect(got.from).toBe('browser'); expect(got.state).toEqual(state); // from the backup key
    store.save(state); await store.settled();
    expect(store.where).toBe('browser'); expect(store.failures).toBe(1);
    expect(ls.getItem(SAVE)).toBe(JSON.stringify(state));
  });
});
