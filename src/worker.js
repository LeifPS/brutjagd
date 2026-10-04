/* Brutjagd: Mehrspieler-Raum auf Cloudflare (Worker + Durable Object).
 * Der Server speichert nichts dauerhaft. Er verteilt nur, was jeder Spieler von sich meldet:
 * Position, getragene Eier, ausgerüstete Tiere, Brutkästen, Bosse. Spielstände bleiben lokal im Browser. */
const MAX_PLAYERS = 6;
const KEYS = new Set(['p', 'c', 'pt', 'pd', 'mb', 'n']);

export class Room {
  constructor(state, env) {
    this.clients = new Map(); // id -> {ws, slot, state, n, t0}
  }

  broadcast(msg, exceptId) {
    const text = JSON.stringify(msg);
    for (const [id, c] of this.clients) {
      if (id === exceptId) continue;
      try { c.ws.send(text); } catch (e) { /* Verbindung wird gleich geschlossen */ }
    }
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Bitte per WebSocket verbinden.', { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();

    const used = new Set([...this.clients.values()].map((c) => c.slot));
    let slot = -1;
    for (let s = 0; s < MAX_PLAYERS; s++) if (!used.has(s)) { slot = s; break; }
    const id = crypto.randomUUID().slice(0, 8);

    if (slot < 0) {
      server.send(JSON.stringify({ t: 'hello', id, slot: -1, peers: {} }));
      server.close(1000, 'voll');
      return new Response(null, { status: 101, webSocket: client });
    }

    const me = { ws: server, slot, state: { s: slot }, count: 0, t0: Date.now() };
    const peers = {};
    for (const [pid, c] of this.clients) peers[pid] = c.state;
    this.clients.set(id, me);
    server.send(JSON.stringify({ t: 'hello', id, slot, peers }));
    this.broadcast({ t: 'u', id, d: { s: slot } }, id);

    server.addEventListener('message', (ev) => {
      if (typeof ev.data !== 'string' || ev.data.length > 8000) return;
      const now = Date.now();
      if (now - me.t0 > 1000) { me.t0 = now; me.count = 0; }
      if (++me.count > 40) return; // höchstens 40 Nachrichten pro Sekunde
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      let patch = null;
      if (m.t === 'hi') {
        patch = { n: String(m.n || '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 14) };
      } else if (m.t === 'u' && m.d && typeof m.d === 'object') {
        patch = {};
        for (const k of Object.keys(m.d)) {
          if (KEYS.has(k)) patch[k] = k === 'n' ? String(m.d[k] || '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 14) : m.d[k];
          else if (k === 's' && m.d[k] === -2) patch.s = -2; // "spielt allein weiter"
        }
      }
      if (!patch) return;
      for (const k of Object.keys(patch)) {
        if (patch[k] === null) delete me.state[k]; else me.state[k] = patch[k];
      }
      if (me.state.s !== -2) me.state.s = me.slot;
      this.broadcast({ t: 'u', id, d: patch }, id);
    });

    const leave = () => {
      if (this.clients.get(id) === me) {
        this.clients.delete(id);
        this.broadcast({ t: 'l', id });
      }
    };
    server.addEventListener('close', leave);
    server.addEventListener('error', leave);
    return new Response(null, { status: 101, webSocket: client });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/ws') {
      const raum = (url.searchParams.get('raum') || 'haupt').replace(/[^\w-]/g, '').slice(0, 24) || 'haupt';
      const stub = env.ROOM.get(env.ROOM.idFromName(raum));
      return stub.fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
