// All of the "feel" numbers for Shred Hed live here.
// Distances are in world pixels, times in seconds, angles in radians.
// Tweak these to change how the game plays, then refresh the page.

const CONFIG = {
  gravity: 1800,

  // Riding
  pushImpulse: 170,       // speed gained per push
  pushMaxSpeed: 820,     // pushing can't take you faster than this (ramps can)
  pushDuration: 0.42,     // length of one push animation
  pushKickAt: 0.45,       // point in the push animation where the speed is added
  pushMaxSlope: 0.3,      // can't push on ground steeper than this
  brakeDecel: 700,
  pivotMaxSpeed: 60,      // below this speed, holding backwards turns you around
  pivotDuration: 0.24,
  rollingFriction: 12,
  airDrag: 0.00002,       // slows you down more the faster you go
  maxSpeed: 1500,
  pumpBoost: 1.7,       // extra speed from holding crouch while rolling down a ramp

  // Ollie
  popSpeed: 560,
  popChargeBonus: 210,    // extra pop from crouching first
  popChargeTime: 0.35,    // how long to crouch for the full bonus
  olliePitch: 0.42,       // how far the nose rises when the tail snaps
  coyoteTime: 0.12,       // you can still ollie this long after rolling off a lip

  // Launching off ramps
  launchMinSpeed: 160,
  launchMinAngle: 0.08,
  wallAngle: 1.05,        // ground turning up sharper than this is a wall, not a ramp
  bonkSpeed: 330,         // hit a wall faster than this and you slam

  // Tricks
  comboWindow: 0.15,      // time allowed between the two presses of a combo flip (like ↓ then →)
  landBuffer: 0.07,       // a trick or grab started this close to landing is ignored instead of bailing
  lateCatch: 0.82,        // land with the board at least this far through its spin and you still ride away
  landAngleTolerance: 0.6,
  autoAlignRate: 4.5,     // how fast the board levels out in the air

  // Spins (Q / E)
  spinSpeed: 9,           // radians per second at full spin
  spinAccel: 60,
  spinSnap: 12,           // how hard a spin finishes itself off to the nearest 180 when you let go
  spinTolerance: 0.5,     // land within this of a clean 180/360/... or bail

  // Grinds
  grindFriction: 120,
  grindMinSpeed: 40,      // slower than this and you slip off the rail
  grindBuffer: 0.18,      // a flip pressed this close to hitting a rail picks the grind instead

  // Manuals (↓ as you land) and combos
  manualBuffer: 0.12,     // ↓ / ↑ pressed this close before landing starts a manual
  manualTip: 3.2,         // how quickly a manual tips over on its own
  manualRamp: 0.15,       // ...and how much harder it gets every second
  manualNoise: 3,
  manualLean: 7,          // how hard ← / → push the balance back
  comboGrace: 0.35,       // after landing, this long to start a manual or revert and keep the combo going

  // On foot (F picks the board up)
  walkSpeed: 190,
  walkAccel: 1400,
  walkSteep: 0.55,        // slopes steeper than this slow you down and slide you back
  footJumpSpeed: 430,
  throwBoost: 160,        // speed a running throw down adds
  cavemanTime: 0.1,       // the board needs this long in the air to get under your feet

  // Bails
  bailResetTime: 2.2,
  bailSkipTime: 0.5,      // after this long, any key gets you back up

  // Camera & look
  viewHeight: 720,        // world pixels visible top to bottom
  lookAhead: 0.28,
  boilFps: 8,             // how often the hand-drawn lines wiggle
  timeScale: 1,           // 0.25 = slow motion, handy for checking trick animations
};
