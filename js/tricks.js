// Every trick in the game and what it's worth.

// Flip tricks, keyed by the arrow presses after the ollie: R = →, L = ←, D = ↓, U = ↑.
//   flip: full kickflip rotations (+ kickflip direction, - heelflip direction)
//   shuv: half turns of the board under your feet (+ backside, - frontside)
//   imp:  impossible wraps around the back foot
//   dur:  seconds the board spins before you can catch it (needs that much air!)
const TRICKS = {
  R:  { name: 'Kickflip',        flip:  1, shuv:  0, dur: 0.36, pts: 100 },
  L:  { name: 'Heelflip',        flip: -1, shuv:  0, dur: 0.36, pts: 100 },
  D:  { name: 'Pop Shove-it',    flip:  0, shuv:  1, dur: 0.32, pts: 100 },
  U:  { name: 'Impossible',      flip:  0, shuv:  0, imp: 1, dur: 0.42, pts: 200 },
  RR: { name: 'Double Kickflip', flip:  2, shuv:  0, dur: 0.62, pts: 300 },
  LL: { name: 'Double Heelflip', flip: -2, shuv:  0, dur: 0.62, pts: 300 },
  DD: { name: '360 Shove-it',    flip:  0, shuv:  2, dur: 0.48, pts: 250 },
  RD: { name: 'Varial Kickflip', flip:  1, shuv:  1, dur: 0.42, pts: 250 },
  LD: { name: 'Varial Heelflip', flip: -1, shuv: -1, dur: 0.42, pts: 250 },
  DR: { name: 'Tre Flip',        flip:  1, shuv:  2, dur: 0.5, pts: 400 },
  DL: { name: 'Laser Flip',      flip: -1, shuv: -2, dur: 0.52, pts: 450 },
  RU: { name: 'Hardflip',        flip:  1, shuv: -1, dur: 0.46, pts: 350 },
  LU: { name: 'Inward Heelflip', flip: -1, shuv:  1, dur: 0.46, pts: 350 },
  // not in the help card...
  LR: { name: 'Casper Flip',     flip:  3, shuv:  0, dur: 0.66, pts: 700 },
  RL: { name: 'Ghost Flip',      flip:  1, shuv:  3, dur: 0.7, pts: 800 },
  UD: { name: 'Hospital Flip',   flip:  1, shuv:  0, imp: 1, dur: 0.6, pts: 650 },
  DU: { name: 'Nightmare Flip',  flip: -2, shuv:  2, dur: 0.66, pts: 900 },
  UU: { name: 'Double Impossible', flip: 0, shuv: 0, imp: 2, dur: 0.66, pts: 500 },
  UR: { name: '360 Hardflip',    flip:  1, shuv: -2, dur: 0.6, pts: 600 },
  UL: { name: '360 Inward Heelflip', flip: -1, shuv: 2, dur: 0.6, pts: 600 },
};

const TRICKS_BY_NAME = Object.fromEntries(Object.values(TRICKS).map(t => [t.name, t]));

// Grabs: Space + arrow in the air. Holding the grab longer "tweaks" it for more points.
//   hand: which hand grabs ('back' or 'front'), l: where along the board, side: toe (+1) or heel (-1) edge
//   roll / pitch: how far the board gets tweaked
const GRABS = {
  R: { name: 'Indy',      pts: 200, hand: 'back',  l: -4,  side:  1, roll:  0.35, pitch: 0.12 },
  L: { name: 'Melon',     pts: 200, hand: 'front', l: 4,   side: -1, roll: -0.35, pitch: 0.1 },
  D: { name: 'Stalefish', pts: 300, hand: 'back',  l: -16, side: -1, roll: -0.3,  pitch: -0.2 },
  U: { name: 'Method',    pts: 300, hand: 'front', l: 6,   side: -1, roll: -0.95, pitch: 0.3 },
  // two quick taps while holding Space, like the combo flips
  // Christ Air: board held out at arm's length, arms spread, legs hanging straight down
  UD: { name: 'Christ Air', pts: 600, hand: 'front', l: 0, side: 1, roll: 0.25, pitch: 0, christ: true },};
const GRAB_TWEAK_PTS = 250; // per second held

// Grinds: what you hold as you land on a rail or ledge. "fwd"/"back" are toward the nose/tail.
const GRINDS = {
  none: { name: '50-50',         pts: 100, perSec: 150 },
  fwd:  { name: 'Nosegrind',     pts: 150, perSec: 200 },
  back: { name: '5-0',           pts: 150, perSec: 200 },
  down: { name: 'Boardslide',    pts: 200, perSec: 220 },
  up:   { name: 'Crooked Grind', pts: 250, perSec: 250 },
  dark: { name: 'Darkslide',     pts: 600, perSec: 320 }, // board upside down; nobody tells you how
};

const MANUALS = {
  manual: { name: 'Manual',      pts: 50, perSec: 150 },
  nose:   { name: 'Nose Manual', pts: 75, perSec: 180 },
};

const SPIN_PTS = [0, 150, 400, 800, 1200, 1800]; // per half turns: 180, 360, 540...
const REVERT_PTS = 100;
