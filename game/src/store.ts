// Where the host's world is kept: always in this browser (localStorage), and also in the
// local database server (server/app.js -> MongoDB) whenever that server can be reached.
import type { State } from './sim';

export const SAVE = 'beforeus:save:v1', BACKUP = 'beforeus:save:v1.bak';
/** '1' when the database holds the same save as this browser, '0' when this browser is ahead of it. */
export const SYNCED = 'beforeus:save:synced';
export const DEFAULT_DB = 'http://127.0.0.1:5184';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type Where = 'database' | 'browser';

const valid = (s: any): s is State => !!s && s.v === 1 && typeof s.seed === 'number' && !!s.players && typeof s.players === 'object';

/** Call when the browser save is replaced or deleted by hand (import, new world): the next start must not load the database copy. */
export function browserSaveChanged(ls: Storage = localStorage) { try { ls.setItem(SYNCED, '0'); } catch { /* private mode */ } }

export class WorldStore {
  /** Where the last save went; null until the first save or load. */
  where: Where | null = null;
  /** Failed database saves since the last one that worked. */
  failures = 0;
  lastError = '';
  onChange: (where: Where) => void = () => {};
  private busy = false;
  private queued: string | null = null;
  private url: string;

  constructor(room: string, base = DEFAULT_DB, private ls: Storage = localStorage) {
    this.url = base.replace(/\/+$/, '') + '/api/worlds/' + encodeURIComponent(room);
  }

  label() { return this.where === 'database' ? 'Saved to database' : this.where === 'browser' ? 'Saved in this browser only' : ''; }

  private local(): State | undefined {
    for (const key of [SAVE, BACKUP]) {
      try { const raw = this.ls.getItem(key); if (raw) return JSON.parse(raw); } catch { /* try the backup, then a new world */ }
    }
    return undefined;
  }

  /** The save to continue from: the database copy if the server answers, otherwise the browser copy. */
  async load(timeoutMs = 1500): Promise<{ state?: State; from: Where | 'none' }> {
    let ahead = false;
    try { ahead = this.ls.getItem(SYNCED) === '0'; } catch { /* ignore */ }
    let remote: State | undefined, reachable = false;
    try {
      const r = await fetch(this.url, { signal: AbortSignal.timeout(timeoutMs) });
      if (r.ok) { const s = await r.json(); if (valid(s)) remote = s; reachable = true; }
      else if (r.status === 404) reachable = true;
    } catch { /* server not running */ }
    this.set(reachable ? 'database' : 'browser');
    // The browser copy wins when it was never confirmed by the database (saved while the
    // server was off, the tab closed mid-upload, a file was imported, or "new world" was pressed).
    if (remote && !ahead) return { state: remote, from: 'database' };
    const state = this.local();
    return { state, from: state ? 'browser' : 'none' };
  }

  /** Writes the browser copy now, and sends the same save to the database without waiting for it. */
  save(state: State): void {
    const json = JSON.stringify(state);
    try {
      const old = this.ls.getItem(SAVE); if (old) this.ls.setItem(BACKUP, old);
      this.ls.setItem(SAVE, json);
      this.ls.setItem(SYNCED, '0');
    } catch (e) { console.warn('Save failed', e); }
    this.queued = json;
    void this.flush();
  }

  /** Resolves when nothing is waiting to be uploaded (used by tests). */
  async settled() { while (this.busy || this.queued) await new Promise((r) => setTimeout(r, 5)); }

  private async flush() {
    if (this.busy) return; // the newest queued save goes out when the current upload ends
    this.busy = true;
    while (this.queued) {
      const json = this.queued; this.queued = null;
      try {
        const r = await fetch(this.url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: json, signal: AbortSignal.timeout(8000), keepalive: json.length < 60000 });
        if (!r.ok) throw new Error('server answered ' + r.status);
        this.failures = 0; this.lastError = '';
        if (!this.queued) try { if (this.ls.getItem(SAVE) === json) this.ls.setItem(SYNCED, '1'); } catch { /* ignore */ }
        this.set('database');
      } catch (e: any) {
        this.failures++; this.lastError = String(e?.message ?? e);
        this.set('browser');
      }
    }
    this.busy = false;
  }

  private set(w: Where) { if (w !== this.where) { this.where = w; this.onChange(w); } }
}
