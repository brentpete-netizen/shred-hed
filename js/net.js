// Online play: rooms with a short code. The host's browser and their friends' browsers connect
// straight to each other (WebRTC); the free PeerJS service only introduces them, using the
// room code. The host is the hub: guests talk to the host, and the host passes things on.
//
// Messages are small objects with a type `t`:
//   hello   guest → host      my name and outfit
//   welcome host → guest     your id, the room's mode, everyone in it
//   roster  host → all       who's in the room now
//   start   host → all       go! (mode, map, and the park itself for a custom park)
//   pose    anyone → others  where my skater is and how they're posed, many times a second
//   say     anyone → others  a trick / combo / bail message, for S.K.A.T.E. watchers
//   result  anyone → others  how my S.K.A.T.E. attempt went
//   full    host → guest     sorry, no room

const PEERJS_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const NET_PREFIX = 'shredhed-v1-';
const CODE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // no I, L or O to mix up
const ROOM_SIZE = { free: 4, skate: 2 };

const Net = (() => {
  let peer = null, conns = new Map(), hostConn = null, loading = null, nextGuest = 1;
  const handlers = {};
  const api = {
    role: null,       // 'host' or 'guest' while in a room
    code: null,
    me: null,         // my player id ('h' for the host)
    mode: null,       // 'free' or 'skate'
    map: null,        // the room's map id (set by the host)
    started: false,
    players: [],      // [{ id, name, outfit }], host first
    status: '',       // what's happening, for the lobby screen
    error: '',
    toasts: [],       // "Sam joined" and so on, shown in the game
    get active() { return !!api.role; },
    on(type, fn) { handlers[type] = fn; },
  };

  const emit = (type, ...args) => handlers[type]?.(...args);
  const toast = text => api.toasts.push({ text, t: 0 });

  function loadPeerJS() {
    if (window.Peer) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = PEERJS_URL;
      s.onload = () => ok();
      s.onerror = () => { loading = null; fail(new Error('offline')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  function me() { return { name: onlineName(), outfit: { ...Outfit.pick } }; }

  function reset() {
    for (const c of conns.values()) c.close();
    hostConn?.close();
    peer?.destroy();
    peer = null;
    conns = new Map();
    hostConn = null;
    Object.assign(api, { role: null, code: null, me: null, mode: null, map: null, started: false, players: [], status: '' });
  }

  function fail(msg) {
    reset();
    api.error = msg;
    emit('closed', msg);
  }

  // ------------------------------------------------------------ hosting

  function host(mode, map, park) {
    reset();
    api.error = '';
    api.status = 'connecting…';
    loadPeerJS().then(() => openRoom(mode, map, park, 0), () => fail("couldn't reach the online service · are you online?"));
  }

  function openRoom(mode, map, park, tries) {
    const code = Array.from({ length: 4 }, () => CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]).join('');
    const p = peer = new window.Peer(NET_PREFIX + code);
    peer.on('open', () => {
      if (p !== peer) return;
      Object.assign(api, { role: 'host', code, me: 'h', mode, map, park, started: false, status: 'waiting for friends to join' });
      api.players = [{ id: 'h', ...me() }];
      emit('roster');
    });
    peer.on('connection', conn => acceptGuest(conn));
    peer.on('error', e => {
      if (p !== peer) return;
      if (e.type === 'unavailable-id' && tries < 5) { p.destroy(); openRoom(mode, map, park, tries + 1); }
      else if (!api.role) fail("couldn't open a room · try again in a moment");
    });
    peer.on('disconnected', () => p === peer && !p.destroyed && p.reconnect());
  }

  function acceptGuest(conn) {
    conn.on('open', () => {
      if (api.players.length >= ROOM_SIZE[api.mode] || (api.started && api.mode === 'skate')) {
        conn.send({ t: 'full' });
        setTimeout(() => conn.close(), 500);
        return;
      }
      const id = 'g' + nextGuest++;
      conn.playerId = id;
      conns.set(id, conn);
    });
    conn.on('data', msg => {
      if (!conn.playerId) return;
      if (msg.t === 'hello') {
        const p = { id: conn.playerId, name: cleanName(msg.name), outfit: msg.outfit || {} };
        api.players = api.players.filter(q => q.id !== p.id).concat(p);
        conn.send({ t: 'welcome', you: p.id, mode: api.mode, map: api.map, players: api.players });
        broadcast({ t: 'roster', players: api.players });
        toast(`${p.name} joined`);
        emit('roster');
        // dropping into a Free Skate that's already going
        if (api.started) conn.send(startMessage());
      } else {
        // pass it on to everyone else, then handle it here too
        msg.from = conn.playerId;
        for (const [id, c] of conns) if (id !== conn.playerId && c.open) c.send(msg);
        emit(msg.t, msg);
      }
    });
    conn.on('close', () => dropGuest(conn.playerId));
    conn.on('error', () => dropGuest(conn.playerId));
  }

  function dropGuest(id) {
    if (!id || !conns.has(id)) return;
    conns.delete(id);
    const p = api.players.find(q => q.id === id);
    api.players = api.players.filter(q => q.id !== id);
    if (p) toast(`${p.name} left`);
    broadcast({ t: 'roster', players: api.players });
    emit('roster');
    emit('left', id);
  }

  function broadcast(msg) { for (const c of conns.values()) if (c.open) c.send(msg); }

  function startMessage() { return { t: 'start', mode: api.mode, map: api.map, park: api.park || null }; }

  function startGame() {
    if (api.role !== 'host') return;
    api.started = true;
    const msg = startMessage();
    broadcast(msg);
    emit('start', msg);
  }

  // ------------------------------------------------------------ joining

  function join(code) {
    reset();
    api.error = '';
    code = code.toUpperCase();
    api.status = `looking for room ${code}…`;
    loadPeerJS().then(() => {
      const p = peer = new window.Peer();
      p.on('open', () => {
        if (p !== peer) return; // gave up on this one already
        const c = hostConn = p.connect(NET_PREFIX + code, { reliable: true });
        c.on('open', () => { c.send({ t: 'hello', ...me() }); api.status = 'joining…'; });
        c.on('data', msg => {
          if (c !== hostConn) return;
          if (msg.t === 'full') return fail('that room is full (or already playing)');
          if (msg.t === 'welcome') {
            Object.assign(api, { role: 'guest', code, me: msg.you, mode: msg.mode, map: msg.map, players: msg.players, status: 'waiting for the host to start' });
            emit('roster');
          } else if (msg.t === 'roster') { api.players = msg.players; emit('roster'); }
          else if (msg.t === 'start') { api.started = true; api.map = msg.map; emit('start', msg); }
          else emit(msg.t, msg);
        });
        c.on('close', () => { if (c === hostConn) fail(api.role ? 'the host left the room' : "couldn't join that room"); });
      });
      p.on('error', e => {
        if (p === peer) fail(e.type === 'peer-unavailable' ? `no room called ${code} · check the code` : "couldn't connect · try again");
      });
    }, () => fail("couldn't reach the online service · are you online?"));
  }

  // ------------------------------------------------------------ both

  // Send to everyone else in the room (a guest sends to the host, who passes it on).
  function send(msg) {
    msg.from = api.me;
    if (api.role === 'host') broadcast(msg);
    else if (hostConn?.open) hostConn.send(msg);
  }

  function leave() {
    reset();
    api.error = '';
  }

  function update(dt) {
    for (const t of api.toasts) t.t += dt;
    api.toasts = api.toasts.filter(t => t.t < 3);
  }

  Object.assign(api, { host, join, leave, send, startGame, update });
  return api;
})();

// Your name online: the one you wrote on your Name Tag, or a made-up one.
function onlineName() {
  return Outfit.pick.tagName || (Outfit.pick.onlineName ||= `Skater ${Math.floor(100 + Math.random() * 900)}`);
}
function cleanName(s) { return cleanTagName(s).trim() || 'Skater'; }
