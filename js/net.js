// Online play: rooms with a short code. The host's browser and their friends' browsers connect
// straight to each other when they can (WebRTC, introduced by the free PeerJS service). Lots of
// home routers and phone networks won't allow that, so when a direct connection doesn't open in
// a few seconds, messages go through a free public relay instead (MQTT over a websocket), which
// works from anywhere. The host is the hub either way: guests talk to the host, and the host
// passes things on.
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
//   ping    guest ⇄ host     still here (relay only: a relay can't tell when someone's gone)
//   bye     guest ⇄ host     I'm leaving (relay only)

const PEERJS_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const MQTT_URL = 'https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js';
const RELAYS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081'];
const NET_PREFIX = 'shredhed-v1-';
const RELAY_ROOT = 'shredhed/v1/';
const CODE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // no I, L or O to mix up
const ROOM_SIZE = { free: 4, skate: 2 };
const DIRECT_WAIT = 6000;  // ms to wait for a direct connection before using a relay
const RELAY_WAIT = 7000;   // ms to wait for the host to answer through a relay
const RELAY_QUIET = 75000; // ms without a word before someone on a relay counts as gone
const PING_EVERY = 3000;
// Public parks: Free Skate rooms anyone can drop into, no code needed (and only real people: no
// CPU skaters). Each one says it's there on the relays every couple of seconds; to find one you
// listen for a moment and join the busiest that has room. Nobody there? You open one.
const PUBLIC_TOPIC = RELAY_ROOT + 'public/';
const PUBLIC_SIZE = 6;
const PUBLIC_MAPS = ['park', 'street', 'school', 'mega', 'boardwalk', 'spot'];
const ANNOUNCE_EVERY = 2000; // ms
const PUBLIC_LISTEN = 3000;  // ms spent listening for public parks

const Net = (() => {
  let peer = null, conns = new Map(), hostLink = null, nextGuest = 1;
  let session = 0;               // bumped on every host / join / leave, so old callbacks know to stop
  let relays = [];               // the host's relay connections
  let relayGuests = new Map();   // the host's guests on a relay, by relay and guest
  let guestRelay = null, pinger = null, announcer = null, joinFallback = null;
  const handlers = {}, scripts = {};
  const api = {
    role: null,       // 'host' or 'guest' while in a room
    code: null,
    me: null,         // my player id ('h' for the host)
    mode: null,       // 'free' or 'skate'
    map: null,        // the room's map id (set by the host)
    public: false,    // a public park (anyone can come in)
    size: 0,          // how many fit in the room
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
  const randomCode = () => Array.from({ length: 4 }, () => CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]).join('');
  const hello = () => ({ t: 'hello', ...me() });

  function loadScript(url) {
    return scripts[url] ||= new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = () => ok();
      s.onerror = () => { delete scripts[url]; fail(new Error('offline')); };
      document.head.appendChild(s);
    });
  }

  // Connect to one relay: the client, or null if it can't be reached.
  function connectRelay(url, opts = {}) {
    return new Promise(done => {
      const c = window.mqtt.connect(url, { connectTimeout: 5000, reconnectPeriod: 2000, keepalive: 20, ...opts });
      c.on('error', () => {});
      const t = setTimeout(() => { c.end(true); done(null); }, 6000);
      c.once('connect', () => { clearTimeout(t); done(c); });
    });
  }

  function readRelay(buf) {
    try { return JSON.parse(buf.toString()); } catch { return null; }
  }

  // A connection to one other player, direct or through a relay: { open, send(msg), close() }.
  function directLink(conn) {
    return { get open() { return conn.open; }, send: m => conn.open && conn.send(m), close: () => conn.close() };
  }
  function relayLink(client, topic) {
    return {
      relay: true, open: true, seen: Date.now(),
      send: m => client.publish(topic, JSON.stringify(m)),
      close() { if (this.open) this.send({ t: 'bye' }); this.open = false; },
    };
  }

  function me() { return { name: onlineName(), outfit: { ...Outfit.pick } }; }

  function reset() {
    session++;
    for (const l of conns.values()) l.close();
    for (const l of relayGuests.values()) l.close();
    hostLink?.close();
    peer?.destroy();
    for (const c of relays) c.end();
    guestRelay?.end();
    clearInterval(pinger);
    clearInterval(announcer);
    peer = null;
    conns = new Map();
    relayGuests = new Map();
    relays = [];
    hostLink = guestRelay = pinger = announcer = joinFallback = null;
    Object.assign(api, { role: null, code: null, me: null, mode: null, map: null, spot: undefined, public: false, size: 0, started: false, players: [], status: '' });
    return session;
  }

  function fail(msg) {
    // looking for a public park and that one didn't work out: open one instead
    if (joinFallback && !api.role) { const next = joinFallback; joinFallback = null; return next(); }
    const wasPublic = api.public;
    reset();
    api.error = msg;
    emit('closed', msg, wasPublic);
  }

  // ------------------------------------------------------------ hosting

  // pub: a public park (it starts straight away, and tells everyone it's there)
  function host(mode, map, park, pub = false) {
    const s = reset();
    api.error = '';
    api.status = pub ? 'opening a public park…' : 'opening a room…';
    const open = code => {
      if (s !== session) return;
      Object.assign(api, { role: 'host', code, me: 'h', mode, map, park, public: pub, size: pub ? PUBLIC_SIZE : ROOM_SIZE[mode], started: false,
        status: pub ? 'skating in a public park' : 'waiting for friends to join' });
      api.players = [{ id: 'h', ...me() }];
      emit('roster');
      if (pub) {
        announcer = setInterval(announce, ANNOUNCE_EVERY);
        startGame();
      }
    };
    Promise.allSettled([loadScript(PEERJS_URL), loadScript(MQTT_URL)]).then(([direct, relay]) => {
      if (s !== session) return;
      const listen = code => relay.status === 'fulfilled' ? openRelays(code, s, pub) : Promise.resolve(0);
      const fallback = () => {
        // no direct room code: a made-up one, on the relays only
        const code = randomCode();
        listen(code).then(n => s === session && (n ? open(code) : fail("couldn't reach the online service · are you online?")));
      };
      if (direct.status !== 'fulfilled') return fallback();
      openDirect(s, code => {
        if (!code) return fallback();
        open(code);
        listen(code);
      });
    });
  }

  // A PeerJS id for the room, which also makes sure nobody else has the same code.
  function openDirect(s, done, tries = 0) {
    const code = randomCode();
    const p = peer = new window.Peer(NET_PREFIX + code);
    let settled = false;
    const settle = c => {
      if (settled || p !== peer) return;
      settled = true;
      clearTimeout(timer);
      done(c);
    };
    const timer = setTimeout(() => {
      if (settled || p !== peer) return;
      settle(null);
      p.destroy();
      if (peer === p) peer = null;
    }, 8000);
    p.on('open', () => settle(code));
    p.on('connection', conn => s === session && acceptDirect(conn));
    p.on('error', e => {
      if (settled || p !== peer) return;
      settled = true;
      clearTimeout(timer);
      p.destroy();
      peer = null;
      if (e.type === 'unavailable-id' && tries < 5) openDirect(s, done, tries + 1);
      else done(null);
    });
    p.on('disconnected', () => p === peer && !p.destroyed && p.reconnect());
  }

  // Listen for guests on every relay that can be reached: the number that could.
  function openRelays(code, s, pub = false) {
    const room = RELAY_ROOT + code + '/';
    return Promise.all(RELAYS.map((url, i) => connectRelay(url, { will: { topic: room + 'down/all', payload: JSON.stringify({ t: 'bye' }) } }).then(c => {
      if (!c) return 0;
      if (s !== session) { c.end(true); return 0; }
      relays.push(c);
      c.subscribe(room + 'up/+');
      if (pub) { c.subscribe(PUBLIC_TOPIC + '+'); announce(); } // other public parks (see heardPark)
      c.on('message', (topic, buf) => {
        const msg = readRelay(buf);
        if (!msg || s !== session) return;
        if (topic.startsWith(PUBLIC_TOPIC)) return heardPark(msg);
        const rid = topic.slice(topic.lastIndexOf('/') + 1), key = i + ':' + rid;
        let link = relayGuests.get(key);
        if (!link) {
          if (msg.t === 'bye') return;
          link = relayLink(c, room + 'down/' + rid);
          relayGuests.set(key, link);
          guestJoined(link);
        }
        link.seen = Date.now();
        if (msg.t === 'ping') return link.send({ t: 'ping' });
        if (msg.t === 'bye') { relayGuests.delete(key); link.open = false; return dropGuest(link.playerId); }
        guestData(link, msg);
      });
      return 1;
    }))).then(n => n.reduce((a, b) => a + b, 0));
  }

  function acceptDirect(conn) {
    const link = directLink(conn);
    conn.on('open', () => guestJoined(link));
    conn.on('data', msg => guestData(link, msg));
    conn.on('close', () => dropGuest(link.playerId));
    conn.on('error', () => dropGuest(link.playerId));
  }

  function guestJoined(link) {
    if (conns.size + 1 >= api.size || (api.started && api.mode === 'skate')) {
      link.send({ t: 'full' });
      setTimeout(() => link.close(), 500);
      return;
    }
    link.playerId = 'g' + nextGuest++;
    conns.set(link.playerId, link);
  }

  function guestData(link, msg) {
    if (!link.playerId) return;
    if (msg.t === 'hello') {
      const p = { id: link.playerId, name: cleanName(msg.name), outfit: msg.outfit || {} };
      api.players = api.players.filter(q => q.id !== p.id).concat(p);
      link.send({ t: 'welcome', you: p.id, mode: api.mode, map: api.map, players: api.players, public: api.public, size: api.size });
      broadcast({ t: 'roster', players: api.players });
      toast(`${p.name} joined`);
      emit('roster');
      // dropping into a Free Skate that's already going
      if (api.started) link.send(startMessage());
    } else {
      // pass it on to everyone else, then handle it here too
      msg.from = link.playerId;
      for (const [id, l] of conns) if (id !== link.playerId && l.open) l.send(msg);
      emit(msg.t, msg);
    }
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

  function broadcast(msg) { for (const l of conns.values()) if (l.open) l.send(msg); }

  // spot: which hour's Street Spot (the room keeps the one it started on, even for late joiners)
  function startMessage() { return { t: 'start', mode: api.mode, map: api.map, park: api.park || null, spot: api.spot }; }

  function startGame() {
    if (api.role !== 'host') return;
    api.started = true;
    if (api.map === 'spot') api.spot = spotHour();
    const msg = startMessage();
    broadcast(msg);
    emit('start', msg);
  }

  // ------------------------------------------------------------ joining

  // fallback: what to do instead if it doesn't work out (for public parks: open one)
  function join(code, fallback = null) {
    const s = reset();
    joinFallback = fallback;
    api.error = '';
    code = code.toUpperCase();
    api.status = `looking for room ${code}…`;
    let relaying = false;
    const useRelay = () => {
      if (s !== session || relaying || api.role) return;
      relaying = true;
      const c = hostLink;
      hostLink = null;
      c?.close();
      peer?.destroy();
      peer = null;
      joinRelay(code, s);
    };
    setTimeout(useRelay, DIRECT_WAIT);
    loadScript(PEERJS_URL).then(() => {
      if (s !== session || relaying) return;
      const p = peer = new window.Peer();
      p.on('open', () => {
        if (p !== peer) return; // gave up on this one already
        const c = p.connect(NET_PREFIX + code, { reliable: true });
        const link = hostLink = directLink(c);
        c.on('open', () => { if (link === hostLink) { c.send(hello()); api.status = 'joining…'; } });
        c.on('data', msg => link === hostLink && fromHost(msg, code));
        c.on('close', () => { if (link === hostLink) api.role ? fail('the host left the room') : useRelay(); });
        c.on('iceStateChanged', state => state === 'failed' && link === hostLink && useRelay());
      });
      // no direct way to that room (it may still be there through a relay)
      p.on('error', () => p === peer && useRelay());
    }, useRelay);
  }

  async function joinRelay(code, s) {
    api.status = `looking for room ${code} on the relay…`;
    try { await loadScript(MQTT_URL); } catch { return s === session && fail("couldn't reach the online service · are you online?"); }
    const room = RELAY_ROOT + code + '/', rid = Math.random().toString(36).slice(2, 10);
    for (const url of RELAYS) {
      const c = await connectRelay(url, { will: { topic: room + 'up/' + rid, payload: JSON.stringify({ t: 'bye' }) } });
      if (s !== session) return c?.end(true);
      if (!c) continue;
      guestRelay = c;
      const link = hostLink = relayLink(c, room + 'up/' + rid);
      c.on('message', (topic, buf) => {
        const msg = readRelay(buf);
        if (!msg || link !== hostLink) return;
        link.seen = Date.now();
        if (msg.t === 'ping') return;
        if (msg.t === 'bye') { link.open = false; return fail(api.role ? 'the host left the room' : "couldn't join that room"); }
        fromHost(msg, code);
      });
      c.subscribe([room + 'down/' + rid, room + 'down/all'], () => link === hostLink && link.send(hello()));
      pinger = setInterval(() => link.send({ t: 'ping' }), PING_EVERY);
      setTimeout(() => s === session && !api.role && fail(`no room called ${code} · check the code`), RELAY_WAIT);
      return;
    }
    fail("couldn't connect · check your internet and try again");
  }

  function fromHost(msg, code) {
    if (msg.t === 'full') return fail('that room is full (or already playing)');
    if (msg.t === 'welcome') {
      joinFallback = null;
      Object.assign(api, { role: 'guest', code, me: msg.you, mode: msg.mode, map: msg.map, players: msg.players,
        public: !!msg.public, size: +msg.size || ROOM_SIZE[msg.mode] || 4, status: 'waiting for the host to start' });
      emit('roster');
    } else if (msg.t === 'roster') { api.players = msg.players; emit('roster'); }
    else if (msg.t === 'start') { api.started = true; api.map = msg.map; emit('start', msg); }
    else emit(msg.t, msg);
  }

  // ------------------------------------------------------------ public parks

  // Find a public park and go in: the busiest one with room, or a new one if there aren't any.
  async function joinPublic() {
    const s = reset();
    api.error = '';
    api.status = 'looking for a public park…';
    const parks = await listenForParks(s);
    if (s !== session) return;
    const open = (parks || []).filter(p => p.n < p.max).sort((a, b) => b.n - a.n || (a.code < b.code ? -1 : 1));
    if (open.length) join(open[0].code, hostPublic);
    else hostPublic();
  }

  function hostPublic() {
    host('free', PUBLIC_MAPS[Math.floor(Math.random() * PUBLIC_MAPS.length)], null, true);
  }

  // Every public park that says it's there, within a few seconds (null if no relay could be reached).
  async function listenForParks(s) {
    try { await loadScript(MQTT_URL); } catch { return null; }
    for (const url of RELAYS) {
      const c = await connectRelay(url);
      if (s !== session) { c?.end(true); return null; }
      if (!c) continue;
      const parks = new Map();
      c.on('message', (topic, buf) => {
        const m = readRelay(buf);
        if (m && /^[A-Z]{4}$/.test(m.code) && Number.isFinite(m.n) && Number.isFinite(m.max)) parks.set(m.code, m);
      });
      c.subscribe(PUBLIC_TOPIC + '+');
      await new Promise(done => setTimeout(done, PUBLIC_LISTEN));
      c.end(true);
      return [...parks.values()];
    }
    return null;
  }

  // A public park host: say the park's here (and how full it is).
  function announce() {
    if (!api.public || api.role !== 'host') return;
    const msg = JSON.stringify({ v: 1, code: api.code, map: api.map, n: api.players.length, max: api.size });
    for (const c of relays) c.publish(PUBLIC_TOPIC + api.code, msg);
  }

  // Another public park, heard while hosting one. Skating there all alone? If that one has people
  // (or it's alone too, and comes first), go over there, so people don't end up in parks by themselves.
  function heardPark(m) {
    if (api.role !== 'host' || !api.public || api.players.length > 1) return;
    if (!m || m.code === api.code || !(m.n < m.max) || !/^[A-Z]{4}$/.test(m.code)) return;
    if (m.n > 1 || m.code < api.code) {
      toast('heading to a busier park');
      join(m.code, hostPublic);
    }
  }

  // ------------------------------------------------------------ both

  // Send to everyone else in the room (a guest sends to the host, who passes it on).
  function send(msg) {
    msg.from = api.me;
    if (api.role === 'host') broadcast(msg);
    else if (hostLink?.open) hostLink.send(msg);
  }

  function leave() {
    reset();
    api.error = '';
  }

  function update(dt) {
    for (const t of api.toasts) t.t += dt;
    api.toasts = api.toasts.filter(t => t.t < 3);
    // nobody on a relay says when they've gone, so go quiet for too long and you're out
    const now = Date.now();
    for (const [key, l] of relayGuests) {
      if (now - l.seen < RELAY_QUIET) continue;
      relayGuests.delete(key);
      l.close();
      dropGuest(l.playerId);
    }
    if (hostLink?.relay && api.role && now - hostLink.seen > RELAY_QUIET) fail('lost the host · they may have closed the game');
  }

  // closing the tab: say goodbye so friends don't wait for you
  addEventListener('pagehide', () => api.active && reset());

  Object.assign(api, { host, join, joinPublic, leave, send, startGame, update });
  return api;
})();

// Your name online: the one you wrote on your Name Tag, or a made-up one.
function onlineName() {
  return Outfit.pick.tagName || (Outfit.pick.onlineName ||= `Skater ${Math.floor(100 + Math.random() * 900)}`);
}
function cleanName(s) {
  const name = cleanTagName(s).trim();
  return name && !rudeName(name) ? name : 'Skater';
}

// Names other people see: anything with a swear word in it (spelt with numbers or not) just shows
// as "Skater".
const RUDE = ['fuck', 'fuk', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'penis', 'vagina', 'porn', 'sex', 'slut',
  'whore', 'ass', 'bastard', 'rape', 'nazi', 'hitler', 'nigg', 'fag', 'retard', 'kkk', 'wank', 'twat', 'boob', 'tits', 'kys'];
function rudeName(s) {
  const plain = s.toLowerCase().replace(/[0@4]/g, m => ({ 0: 'o', '@': 'a', 4: 'a' })[m]).replace(/[1!|]/g, 'i').replace(/3/g, 'e')
    .replace(/[5$]/g, 's').replace(/7/g, 't').replace(/[^a-z]/g, '');
  // "ass" only on its own (not in "class" or "Cassie")
  return RUDE.some(w => (w === 'ass' ? /(^|[^a-z])ass($|[^a-z])|^ass/.test(s.toLowerCase()) : plain.includes(w)));
}
