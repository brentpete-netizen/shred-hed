// Trophies: goals to go after, each worth Shred Bucks the first time. They're checked as you
// skate (from the skater's messages and what it's doing) and from the rest of the game (gaps,
// getting on fire, the 2-minute run, S.K.A.T.E.). Kept in your progress, and saved with it.
// (Not while an easy-mode cheat is on.)

const hasPart = (m, re) => m.type === 'combo' && m.parts.some(p => re.test(p.name));

const TROPHIES = [
  // tricks
  { id: 'first', name: 'First Steps', desc: 'Land your first trick', reward: 10, on: m => m.type === 'combo' },
  { id: 'flip', name: 'Flip Out', desc: 'Land a Tre Flip', reward: 25, on: m => hasPart(m, /Tre Flip/) },
  { id: 'christ', name: 'Hallelujah', desc: 'Land a Christ Air', reward: 50, on: m => hasPart(m, /Christ Air/) },
  { id: 'nightmare', name: 'Bad Dream', desc: 'Land a Nightmare Flip', reward: 60, on: m => hasPart(m, /Nightmare Flip/) },
  { id: 'dark', name: 'Upside Down', desc: 'Pull off a Darkslide', reward: 60, on: m => hasPart(m, /Darkslide/) },
  { id: '540', name: 'Five-Forty', desc: 'Land a 540 spin', reward: 60, on: m => hasPart(m, /\b540\b/) },
  { id: '900', name: 'The 900', desc: 'Land a 900. Legendary.', reward: 200, on: m => hasPart(m, /\b900\b/) },
  { id: 'fakie', name: 'Switch It Up', desc: 'Land a Fakie Tre Flip', reward: 50, on: m => hasPart(m, /Fakie .*Tre Flip/) },
  // combos
  { id: 'chain5', name: 'Chain Gang', desc: 'Land a 5-trick combo', reward: 25, on: m => m.type === 'combo' && m.mult >= 5 },
  { id: 'chain10', name: 'Combo Crazy', desc: 'Land a 10-trick combo', reward: 75, on: m => m.type === 'combo' && m.mult >= 10 },
  { id: 'chain20', name: 'Never Stop', desc: 'Land a 20-trick combo', reward: 200, on: m => m.type === 'combo' && m.mult >= 20 },
  { id: 'score5k', name: 'Big Points', desc: 'Land a 5,000 point combo', reward: 25, on: m => m.type === 'combo' && m.score >= 5000 },
  { id: 'score25k', name: 'Point Machine', desc: 'Land a 25,000 point combo', reward: 75, on: m => m.type === 'combo' && m.score >= 25000 },
  { id: 'score100k', name: 'Six Figures', desc: 'Land a 100,000 point combo', reward: 200, on: m => m.type === 'combo' && m.score >= 100000 },
  // doing things for a while
  { id: 'grind3', name: 'Rail Rider', desc: 'Grind for 3 seconds straight', reward: 40, tick: sk => sk.grind && sk.grind.t >= 3 },
  { id: 'manual5', name: 'Wheelie King', desc: 'Hold a manual for 5 seconds', reward: 40, tick: sk => sk.manual && sk.manual.t >= 5 },
  { id: 'hang', name: 'Frequent Flyer', desc: 'Stay in the air 2 seconds', reward: 50, on: m => m.type === 'land' && m.airTime >= 2 },
  { id: 'speed', name: 'Speed Demon', desc: 'Go faster than 1,400', reward: 40, tick: sk => Math.abs(sk.v) > 1400 },
  // slams
  { id: 'slam50', name: 'Slam Hound', desc: 'Bail 50 times (it happens)', reward: 25, tick: () => Stats.data.bails >= 50 },
  // the rest of the game
  { id: 'gap1', name: 'Gap Finder', desc: 'Find your first gap', reward: 20, game: 'gap', when: () => Progress.gapsFound() >= 1 },
  { id: 'gap10', name: 'Gap Hunter', desc: 'Find 10 gaps', reward: 75, game: 'gap', when: () => Progress.gapsFound() >= 10 },
  { id: 'gapAll', name: 'Gap Master', desc: 'Find every gap', reward: 250, game: 'gap', when: () => Progress.gapsFound() >= Gaps.count() },
  { id: 'fire', name: 'On Fire', desc: 'Fill the Hype meter', reward: 30, game: 'fire' },
  { id: 'spot', name: 'Hot Stuff', desc: 'Land a combo in a Hot Spot', reward: 30, game: 'spotHit' },
  { id: 'bronze', name: 'Bronze Run', desc: 'Get bronze on a 2-minute run', reward: 25, game: 'medal', when: v => v >= 1 },
  { id: 'silver', name: 'Silver Run', desc: 'Get silver on a 2-minute run', reward: 60, game: 'medal', when: v => v >= 2 },
  { id: 'gold', name: 'Gold Run', desc: 'Get gold on a 2-minute run', reward: 150, game: 'medal', when: v => v >= 3 },
  { id: 'champ', name: 'Champ', desc: 'Beat the CPU at S.K.A.T.E.', reward: 50, game: 'skateWin' },
  { id: 'flawless', name: 'Flawless', desc: 'Beat the CPU without a letter', reward: 150, game: 'skateWin', when: v => v === 0 },
  { id: 'level25', name: 'Veteran', desc: 'Reach level 25', reward: 100, tick: () => Progress.level >= 25 },
  { id: 'owl', name: 'Night Owl', desc: 'Land a combo after midnight', reward: 30, on: m => m.type === 'combo' && new Date().getHours() < 4 },
];

const Trophies = (() => {
  let checkIn = 0;
  const give = t => !Progress.cheating && !Progress.hasTrophy(t.id) && Progress.giveTrophy(t);

  return {
    list: TROPHIES,
    got: () => TROPHIES.filter(t => Progress.hasTrophy(t.id)).length,
    // a skater message (your own skating)
    onMessage(m) { for (const t of TROPHIES) if (t.on && t.on(m)) give(t); },
    // what the skater's doing, a few times a second
    tick(sk, dt) {
      if ((checkIn -= dt) > 0) return;
      checkIn = 0.2;
      for (const t of TROPHIES) if (t.tick && t.tick(sk)) give(t);
    },
    // something from the rest of the game: 'gap', 'fire', 'spotHit', 'medal' (1-3), 'skateWin' (letters you had)
    event(kind, v) { for (const t of TROPHIES) if (t.game === kind && (!t.when || t.when(v))) give(t); },
  };
})();
