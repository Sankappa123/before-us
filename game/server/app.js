// BEFORE US save server: a small HTTP API in front of MongoDB.
// The browser cannot talk to MongoDB itself, so the host's game talks to this instead.
import http from 'node:http';
import { MongoClient } from 'mongodb';

export const DEFAULTS = {
  // 27019, not 27018: on this machine 27018 is already taken by another project's database.
  mongoUrl: process.env.MONGO_URL ?? 'mongodb://127.0.0.1:27019',
  dbName: process.env.MONGO_DB ?? 'before_us',
  port: Number(process.env.PORT ?? 5184),
};
const ORIGINS = new Set(['http://localhost:5183', 'http://127.0.0.1:5183']);
const MAX_BODY = 5 * 1024 * 1024; // bytes
const KEEP = 5; // older versions kept per world
const ID = /^[A-Za-z0-9_-]{1,64}$/;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (Number(req.headers['content-length'] ?? 0) > MAX_BODY) { req.resume(); return reject(new HttpError(413, 'save is too large (limit 5 MB)')); }
    const chunks = []; let size = 0, over = false;
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { over = true; chunks.length = 0; } else if (!over) chunks.push(c); });
    req.on('end', () => (over ? reject(new HttpError(413, 'save is too large (limit 5 MB)')) : resolve(Buffer.concat(chunks).toString('utf8'))));
    req.on('error', reject);
  });
}

function parseState(text) {
  let s;
  try { s = JSON.parse(text); } catch { throw new HttpError(400, 'body is not JSON'); }
  const ok = s && typeof s === 'object' && !Array.isArray(s) && s.v === 1 && typeof s.seed === 'number'
    && s.players && typeof s.players === 'object' && !Array.isArray(s.players);
  if (!ok) throw new HttpError(400, 'body is not a BEFORE US v1 save (needs v: 1, seed, players)');
  return s;
}

/** Start the server. Resolves once it is listening; MongoDB is connected lazily, so it starts even when the database is down. */
export async function startServer(opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };
  const client = new MongoClient(cfg.mongoUrl, { serverSelectionTimeoutMS: opts.dbTimeoutMs ?? 1500, connectTimeoutMS: opts.dbTimeoutMs ?? 1500 });
  const db = client.db(cfg.dbName);
  const worlds = db.collection('worlds');   // one document per world: the current save
  const history = db.collection('history'); // up to KEEP older saves per world
  let indexed = false;
  const queues = new Map(); // one write at a time per world, so history stays in order

  const dbOk = async () => { try { await db.command({ ping: 1 }); return true; } catch { return false; } };
  const ready = async () => {
    if (indexed) return;
    await history.createIndex({ world: 1, savedAt: -1 });
    indexed = true;
  };
  const serial = (id, job) => {
    const run = (queues.get(id) ?? Promise.resolve()).then(job, job);
    const tail = run.catch(() => {});
    queues.set(id, tail);
    tail.then(() => { if (queues.get(id) === tail) queues.delete(id); });
    return run;
  };
  const meta = (d) => ({ savedAt: d.savedAt, day: d.day, size: d.size });
  const prune = async (id) => {
    const extra = await history.find({ world: id }, { projection: { _id: 1 } }).sort({ savedAt: -1, _id: -1 }).skip(KEEP).toArray();
    if (extra.length) await history.deleteMany({ _id: { $in: extra.map((d) => d._id) } });
  };
  // The state is stored as its exact JSON text, so what comes back is byte-for-byte what was saved.
  const put = (id, json, state) => serial(id, async () => {
    await ready();
    const old = await worlds.findOne({ _id: id });
    if (old) { const { _id, ...rest } = old; await history.insertOne({ world: id, ...rest }); }
    const doc = { savedAt: new Date(), day: Number(state.day) || 0, seed: state.seed, players: Object.keys(state.players).length, size: Buffer.byteLength(json), json };
    await worlds.replaceOne({ _id: id }, doc, { upsert: true });
    await prune(id);
    return meta(doc);
  });
  const versions = (id) => history.find({ world: id }, { projection: { json: 0 } }).sort({ savedAt: -1, _id: -1 }).toArray();
  const restore = (id, n) => serial(id, async () => {
    const list = await history.find({ world: id }).sort({ savedAt: -1, _id: -1 }).toArray();
    const pick = list[n - 1];
    if (!pick) throw new HttpError(404, 'no such version');
    const cur = await worlds.findOne({ _id: id });
    if (cur) { const { _id, ...rest } = cur; await history.insertOne({ world: id, ...rest }); }
    const { _id, world, ...rest } = pick;
    const doc = { ...rest, savedAt: new Date() };
    await worlds.replaceOne({ _id: id }, doc, { upsert: true });
    await history.deleteOne({ _id });
    await prune(id);
    return meta(doc);
  });

  async function route(req, res, send) {
    const path = new URL(req.url ?? '/', 'http://x').pathname.replace(/\/+$/, '');
    if (path === '/api/health' && req.method === 'GET') return send(200, { ok: true, db: await dbOk() });
    const m = /^\/api\/worlds\/([^/]+)(?:\/(history)|\/(restore)\/([^/]+))?$/.exec(path);
    if (!m) throw new HttpError(404, 'not found');
    const id = decodeURIComponent(m[1]);
    if (!ID.test(id)) throw new HttpError(400, 'bad world id');
    if (m[2]) {
      if (req.method !== 'GET') throw new HttpError(405, 'method not allowed');
      const cur = await worlds.findOne({ _id: id }, { projection: { json: 0 } });
      const older = await versions(id);
      if (!cur && !older.length) throw new HttpError(404, 'no save for this world');
      return send(200, { world: id, current: cur ? meta(cur) : null, versions: older.map((d, i) => ({ n: i + 1, ...meta(d) })) });
    }
    if (m[3]) {
      if (req.method !== 'POST') throw new HttpError(405, 'method not allowed');
      const n = Number(m[4]);
      if (!Number.isInteger(n) || n < 1 || n > KEEP) throw new HttpError(400, 'version must be 1 to ' + KEEP);
      return send(200, { ok: true, restored: n, ...(await restore(id, n)) });
    }
    if (req.method === 'GET') {
      const cur = await worlds.findOne({ _id: id });
      if (!cur) throw new HttpError(404, 'no save for this world');
      return send(200, cur.json, { 'X-Saved-At': cur.savedAt.toISOString() });
    }
    if (req.method === 'PUT') {
      const json = await readBody(req);
      const state = parseState(json);
      return send(200, { ok: true, ...(await put(id, json, state)) });
    }
    throw new HttpError(405, 'method not allowed');
  }

  const server = http.createServer((req, res) => {
    const origin = req.headers.origin;
    const cors = origin && ORIGINS.has(origin)
      ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Expose-Headers': 'X-Saved-At', 'Access-Control-Max-Age': '600' }
      : {};
    // body may be an object (encoded here) or a string that is already JSON
    const send = (status, body, extra = {}) => {
      const text = typeof body === 'string' ? body : JSON.stringify(body);
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors, ...extra });
      res.end(text);
    };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    route(req, res, send).catch((e) => {
      if (e instanceof HttpError) return send(e.status, { ok: false, error: e.message }, e.status === 413 ? { Connection: 'close' } : {});
      const dbDown = /Mongo|ECONNREFUSED|Server selection/i.test(String(e?.name) + String(e?.message));
      if (!dbDown) console.error(e);
      send(dbDown ? 503 : 500, { ok: false, error: dbDown ? 'database not reachable' : 'server error' });
    });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(cfg.port, '127.0.0.1', resolve); });
  const port = server.address().port;
  return {
    port, url: 'http://127.0.0.1:' + port, dbOk,
    /** Test helper: deletes this server's whole database. Not reachable over HTTP. */
    dropDb: async () => { await db.dropDatabase(); },
    close: async () => {
      server.closeAllConnections?.();
      await new Promise((r) => server.close(r));
      await client.close().catch(() => {});
    },
  };
}
