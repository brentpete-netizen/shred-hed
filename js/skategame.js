// Game of S.K.A.T.E.: like H.O.R.S.E. in basketball.
// The setter gets one attempt at a trick. Land it and the other player has to land the exact
// same trick (anywhere on the map), or they get a letter. Miss your set and the other player
// sets instead. On your last letter (E) you get two tries to match. Spell S.K.A.T.E. and you lose.
//
// An attempt is everything from leaving the ground until your wheels are back on it, and you
// have to ride away clean. Plain ollies don't count, so you can roll around and line it up.

const SKATE_WORD = 'SKATE';
const ATTEMPT_TIME = 25;   // seconds to make an attempt
const RIDE_AWAY = 0.7;     // seconds you have to stay on your board after landing

// The CPU always wears this, so you can tell who's who.
const CPU_OUTFIT = { skin: 3, hat: 5, top: 4, pants: 2, shoes: 3, board: 2 };

function secondOutfit() {
  const pick = {};
  for (const cat in OUTFIT_OPTIONS) pick[cat] = (Outfit.pick[cat] + (cat === 'skin' ? 1 : 2)) % OUTFIT_OPTIONS[cat].length;
  return pick;
}

class SkateGame {
  constructor(terrain, vsCpu) {
    this.terrain = terrain;
    this.vsCpu = vsCpu;
    this.players = [
      { name: 'P1', letters: 0, cpu: false, outfit: null },
      { name: vsCpu ? 'CPU' : 'P2', letters: 0, cpu: vsCpu, outfit: vsCpu ? CPU_OUTFIT : secondOutfit() },
    ];
    this.setter = 0;
    this.turn = 0;
    this.phase = 'set';   // 'set' or 'match'
    this.trick = null;    // what has to be matched
    this.tries = 1;
    this.winner = null;
    this.attempt = null;
    this.driver = null;
    this.state = 'banner';
    this.skater = new Skater(terrain);
    this.showBanner('GAME OF S.K.A.T.E.', `${this.players[0].name} sets first`, 2.2);
  }

  get current() { return this.players[this.turn]; }
  get other() { return this.players[1 - this.turn]; }

  // A big message between attempts; when it's done the next attempt starts.
  showBanner(title, sub, dur = 1.8) {
    this.state = 'banner';
    this.banner = { title, sub, t: 0, dur };
  }

  beginAttempt() {
    const p = this.current;
    this.skater = new Skater(this.terrain);
    this.skater.outfit = p.outfit;
    this.attempt = { t: 0, landedAt: null, names: null, done: false };
    this.driver = null;
    this.state = 'attempt';
    if (p.cpu) this.planCpu();
  }

  planCpu() {
    const me = this.current, them = this.other;
    let target = this.trick, plan = null;
    if (this.phase === 'set') {
      const pick = cpuChooseSet(this.terrain, me.letters, them.letters);
      if (pick) ({ name: target, plan } = pick);
    } else {
      plan = cpuPlan(this.terrain, this.trick, 160);
    }
    if (plan && Math.random() < cpuMissChance(target) - (me.letters >= 4 ? 0.08 : 0)) plan = cpuFluff(this.terrain, plan, target);
    // no idea how to do it: have a go at something anyway
    this.driver = new CpuDriver(plan || { ollieX: this.skater.pos.x + 300, speed: 500, charge: false, fakie: false, presses: [{ t: 0.03, key: 'right' }], holds: [] });
  }

  // Inputs for this physics step: the keyboard, the CPU, or nothing between attempts.
  input(keyboardEvents) {
    if (this.state !== 'attempt' || this.attempt.done) return { ev: [], held: () => false };
    if (this.driver) {
      const { ev, held } = this.driver.step(this.skater);
      return { ev, held: a => held.has(a) };
    }
    return { ev: keyboardEvents, held: a => Input.held(a) };
  }

  onMessage(m) {
    const a = this.attempt;
    if (this.state !== 'attempt' || !a || a.done) return;
    if (m.type === 'chain' && !m.names.length && this.driver?.popT != null && a.landedAt === null) {
      this.resolve(false, 'missed it'); // the CPU popped but didn't get the trick off
    } else if (m.type === 'chain' && m.names.length && a.landedAt === null) {
      a.names = m.names.join(' + ');
      if (m.landed) a.landedAt = a.t;
      else this.resolve(false, 'bailed');
    } else if (m.type === 'bail') {
      this.resolve(false, a.landedAt !== null ? "didn't ride away" : 'bailed');
    }
  }

  update(dt) {
    if (this.state === 'banner') {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.dur) {
        if (this.winner !== null) this.state = 'over';
        else this.beginAttempt();
      }
    } else if (this.state === 'attempt') {
      const a = this.attempt;
      if (a.done) {
        // show SET! / MISSED over the skater for a moment, then the banner
        if ((this.next.t += dt) >= 0.9) this.showBanner(this.next.title, this.next.sub, this.next.dur);
        return;
      }
      a.t += dt;
      if (a.landedAt !== null && a.t - a.landedAt >= RIDE_AWAY) this.resolve(true);
      else if (a.landedAt === null && a.t > (this.current.cpu ? 14 : ATTEMPT_TIME)) this.resolve(false, "time's up");
    }
  }

  resolve(landed, why = '') {
    const a = this.attempt;
    a.done = true;
    const me = this.current, them = this.other, name = a.names;
    const wait = (title, sub, dur) => { this.next = { title, sub, dur, t: 0 }; };
    if (this.phase === 'set') {
      if (landed) {
        this.trick = name;
        this.phase = 'match';
        this.turn = 1 - this.turn;
        this.tries = this.current.letters === SKATE_WORD.length - 1 ? 2 : 1;
        this.result = { text: 'SET!', color: '#7fd36b' };
        wait(`${me.name} SET IT`, `${them.name}: match the ${name}`);
      } else {
        this.setter = 1 - this.setter;
        this.turn = this.setter;
        this.result = { text: 'MISSED', color: '#ef5a4a' };
        wait(`${me.name} MISSED`, `${them.name} sets`);
      }
      return;
    }
    if (landed && name === this.trick) {
      this.phase = 'set';
      this.turn = this.setter;
      this.trick = null;
      this.result = { text: 'MATCHED!', color: '#7fd36b' };
      wait('MATCHED!', `${this.current.name} sets again`);
      return;
    }
    const miss = landed ? `that was a ${name}` : why;
    if (--this.tries > 0) {
      this.result = { text: 'MISSED', color: '#ef5a4a' };
      wait('LAST LETTER', `${miss} · one more try!`);
      return;
    }
    me.letters++;
    const word = SKATE_WORD.slice(0, me.letters).split('').join('.');
    this.result = { text: 'LETTER!', color: '#ef5a4a' };
    if (me.letters >= SKATE_WORD.length) {
      this.winner = 1 - this.turn;
      this.trick = null;
      this.onGameOver?.(this.players[this.winner]);
      wait(`${them.name} WINS!`, `${me.name} spelled S.K.A.T.E.`, 2.5);
      return;
    }
    this.phase = 'set';
    this.turn = this.setter;
    this.trick = null;
    wait(`${me.name} GETS ${SKATE_WORD[me.letters - 1]}`, `${miss} · ${me.name}: ${word}`);
  }

  // ---------------------------------------------------------------- drawing

  draw(ctx, w, h) {
    const size = Math.max(22, Math.min(40, w / 26));
    // letters for both players
    this.players.forEach((p, i) => {
      const y = 22 + i * size * 1.05;
      const active = i === this.turn && this.state !== 'over';
      ctx.font = `${size * 0.6}px ${MARKER}`;
      markerText(ctx, p.name, 18 + size * 0.9, y + size * 0.3, size * 0.6, active ? '#f4c542' : '#ffffff');
      for (let k = 0; k < SKATE_WORD.length; k++) {
        const has = k < p.letters, x = 18 + size * 2.2 + k * size * 0.8;
        ctx.globalAlpha = has ? 1 : 0.28;
        markerText(ctx, SKATE_WORD[k], x, y + size * 0.3, size * 0.62, has ? '#ef5a4a' : '#ffffff');
        ctx.globalAlpha = 1;
      }
    });

    // what to do right now
    if (this.state === 'attempt' && !this.attempt.done) {
      const p = this.current;
      const ty = w > 700 ? h * 0.08 : 22 + size * 2.9; // under the letters on narrow screens
      const task = this.phase === 'set' ? `${p.name}: SET A TRICK` : `${p.name}: MATCH`;
      markerText(ctx, task, w / 2, ty, size * 0.7, '#ffffff', -0.02);
      if (this.trick) markerText(ctx, this.trick, w / 2, ty + size * 0.95, Math.min(size * 0.9, w / 14), '#f4c542', -0.03);
      if (!p.cpu) {
        const left = Math.max(0, ATTEMPT_TIME - this.attempt.t);
        if (this.attempt.landedAt === null) markerText(ctx, `${Math.ceil(left)}`, w - 40, 50, size * 0.8, left < 6 ? '#ef5a4a' : '#ffffff');
      } else {
        ctx.font = `${size * 0.45}px ${HAND}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = INK;
        ctx.fillText('the CPU is skating…', w / 2, ty + size * (this.trick ? 1.7 : 0.8));
      }
      if (this.tries > 1 && this.phase === 'match') markerText(ctx, 'last letter: 2 tries', w / 2, ty + size * 1.75, size * 0.42, '#ef5a4a');
    }
    if (this.attempt?.done && this.result && this.state === 'attempt') {
      markerText(ctx, this.result.text, w / 2, h * 0.3, size * 1.4, this.result.color, -0.05);
    }

    if (this.state === 'banner' || this.state === 'over') {
      const b = this.banner, k = this.state === 'over' ? 1 : Math.min(1, b.t / 0.15);
      ctx.fillStyle = `rgba(243, 238, 225, ${0.6 * k})`;
      ctx.fillRect(0, h * 0.28, w, h * 0.3);
      markerText(ctx, b.title, w / 2, h * 0.38, Math.min(size * 1.8, w / 12), '#f4c542', -0.04, 0.9 + 0.1 * k);
      markerText(ctx, b.sub, w / 2, h * 0.38 + size * 1.5, Math.min(size * 0.7, w / 26), '#ffffff', -0.02);
      if (this.state === 'over') markerText(ctx, 'Enter: rematch  ·  Esc: menu', w / 2, h * 0.38 + size * 2.6, size * 0.5, '#ffffff');
    }
  }
}
