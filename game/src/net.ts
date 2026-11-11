// Connects the two players. "local" mode links tabs of one browser (used for
// testing). "online" mode links two computers directly through WebRTC, using the
// public PeerJS service only to introduce them to each other.
export interface Link {
  id: string;
  /** Send to one peer, or to everyone when `to` is omitted. */
  send(msg: any, to?: string): void;
  onMessage: (msg: any, from: string) => void;
  onLeave: (peer: string) => void;
  ready: Promise<void>;
  close(): void;
}

const rid = () => Math.random().toString(36).slice(2, 10);

export function localLink(room: string): Link {
  const ch = new BroadcastChannel('beforeus-' + room), id = rid();
  const link: Link = {
    id, onMessage: () => {}, onLeave: () => {}, ready: Promise.resolve(),
    send: (msg, to) => ch.postMessage({ from: id, to, msg }),
    close: () => { ch.postMessage({ from: id, bye: true }); ch.close(); },
  };
  ch.onmessage = (e) => {
    const d = e.data;
    if (d.from === id || (d.to && d.to !== id)) return;
    if (d.bye) link.onLeave(d.from); else link.onMessage(d.msg, d.from);
  };
  return link;
}

export async function onlineLink(room: string, host: boolean): Promise<Link> {
  const { Peer } = await import('peerjs');
  const hostId = 'beforeus-' + room;
  const peer = host ? new Peer(hostId) : new Peer();
  const conns = new Map<string, any>();
  let ok!: () => void, fail!: (e: any) => void;
  const ready = new Promise<void>((a, b) => { ok = a; fail = b; });
  const link: Link = {
    id: host ? hostId : '', onMessage: () => {}, onLeave: () => {}, ready,
    send: (msg, to) => { for (const [pid, c] of conns) if ((!to || to === pid) && c.open) c.send(msg); },
    close: () => peer.destroy(),
  };
  const wire = (c: any) => {
    c.on('open', () => { conns.set(c.peer, c); if (!host) ok(); });
    c.on('data', (m: any) => link.onMessage(m, c.peer));
    c.on('close', () => { conns.delete(c.peer); link.onLeave(c.peer); });
  };
  peer.on('error', (e: any) => fail(e));
  peer.on('open', (pid: string) => {
    link.id = pid;
    if (host) { peer.on('connection', wire); ok(); }
    else wire(peer.connect(hostId, { reliable: true }));
  });
  return link;
}
