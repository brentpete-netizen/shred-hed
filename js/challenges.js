// Daily Challenges: three new things to do every day at 12:00 PM (when the shop changes), the same
// for everyone: an easy one, a medium one and a hard one, each worth Shred Bucks. Only your own
// skating counts, and nothing counts while an easy-mode cheat is on.

const CHALLENGE_REWARD = [50, 100, 200];
const CHALLENGE_TIER = ['EASY', 'MEDIUM', 'HARD'];
// Each kind of challenge, with what it asks at each tier.
const CHALLENGE_KINDS = {
  trick: {
    tiers: [['Kickflip', 'Heelflip', 'Pop Shove-it', 'Indy', 'Melon', '50-50', 'Manual', 'Boardslide'],
      ['Varial Kickflip', 'Hardflip', 'Impossible', 'Method', 'Stalefish', 'Nosegrind', '5-0', '360 Shove-it', 'Double Kickflip'],
      ['Tre Flip', 'Laser Flip', 'Christ Air', 'Crooked Grind', 'Inward Heelflip', 'Nose Manual', 'Double Impossible', 'Varial Heelflip']],
    text: t => `Land a ${t}`,
  },
  combo: { tiers: [1500, 5000, 15000], text: n => `Land a ${fmtScore(n)} point combo` },
  chain: { tiers: [3, 5, 8], text: n => `Land a combo of ${n} tricks` },
  air:   { tiers: [0.8, 1.2, 1.8], text: n => `Stay in the air for ${n} seconds` },
  count: { tiers: [15, 40, 100], text: n => `Land ${n} tricks`, counts: true },
  spin:  { tiers: [180, 360, 540], text: n => `Land a ${n} spin` },
};

// Does a trick in a combo count as `want`? ("BS 180 Kickflip" and "Fakie Kickflip" are Kickflips.)
const isTrick = (name, want) => name === want || name.endsWith(' ' + want) || name.startsWith(want + ' ') || name.includes(' ' + want + ' ');

// The challenges for a shop day (a count of days, see shopDayNumber).
function challengesFor(num) {
  // scramble the day first, so days next to each other aren't alike
  let h = Math.imul(num ^ (num >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  const rand = shopRand(((h ^ (h >>> 16)) >>> 1) % 2147483646 + 1);
  const kinds = Object.keys(CHALLENGE_KINDS);
  for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
  return kinds.slice(0, 3).map((kind, tier) => {
    const def = CHALLENGE_KINDS[kind], at = def.tiers[tier];
    const value = Array.isArray(at) ? at[Math.floor(rand() * at.length)] : at;
    return { kind, tier, value, goal: def.counts ? value : 1, reward: CHALLENGE_REWARD[tier], text: def.text(value) };
  });
}

const Challenges = (() => {
  // today's challenges, and how far you've got (kept in your progress, so it's saved)
  function today() {
    const num = shopDayNumber();
    const list = challengesFor(num);
    const d = Progress.data;
    if (!d.daily || d.daily.day !== num) d.daily = { day: num, prog: [0, 0, 0] };
    return list.map((c, i) => ({ ...c, prog: Math.min(c.goal, d.daily.prog[i] || 0), done: (d.daily.prog[i] || 0) >= c.goal }));
  }

  // how far a message gets you on one challenge (null: no change)
  function progress(c, m, prog) {
    if (m.type === 'land') return c.kind === 'air' && m.airTime >= c.value ? 1 : null;
    if (m.type !== 'combo') return null;
    const names = m.parts.map(p => p.name);
    if (c.kind === 'trick') return names.some(n => isTrick(n, c.value)) ? 1 : null;
    if (c.kind === 'combo') return m.score >= c.value ? 1 : null;
    if (c.kind === 'chain') return names.length >= c.value ? 1 : null;
    if (c.kind === 'count') return prog + names.length;
    if (c.kind === 'spin') return names.some(n => +(/\b(?:FS|BS) (\d+)/.exec(n)?.[1] || 0) >= c.value) ? 1 : null;
    return null;
  }

  // Your own skater's messages (landings and combos).
  function onMessage(m) {
    if ((m.type !== 'combo' && m.type !== 'land') || Progress.cheating) return;
    const list = today(), d = Progress.data.daily;
    let changed = false;
    list.forEach((c, i) => {
      if (c.done) return;
      const next = progress(c, m, d.prog[i] || 0);
      if (next === null || next <= (d.prog[i] || 0)) return;
      d.prog[i] = Math.min(c.goal, next);
      changed = true;
      if (d.prog[i] >= c.goal) {
        Progress.events.push({ type: 'banner', title: 'CHALLENGE DONE!', lines: [c.text, `+${c.reward} Shred Bucks`] });
        Progress.earn(c.reward, 'challenge');
      }
    });
    if (changed) Progress.save();
  }

  const left = () => today().filter(c => !c.done).length;

  return { today, onMessage, left };
})();
