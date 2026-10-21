# SHRED HED

A hand-drawn, side-view skateboarding game that runs in your web browser. Tony Hawk-style combo
tricks, controls that feel like flicking a real board, ragdoll bails, and a Game of S.K.A.T.E.
against a friend or the CPU.

## Play

Open `index.html` in a browser (double-click it). No install, no build step.

## Modes

- **Free Skate:** four maps (Skatepark, Street, School Yard, Mega Ramp). Chain tricks into
  combos and chase your best score on each map.
- **Game of S.K.A.T.E.:** two players on one keyboard, or vs the CPU. Land a trick and the other
  skater has to land the exact same one or get a letter.
- **Park Builder:** lay out your own park slot by slot (kickers, funboxes, stairs, banks, gaps,
  rails, ledges, benches...), test ride it, and skate it in Free Skate or S.K.A.T.E.
- **Closet:** change your skater's skin, hat, top, pants, shoes and board.
- **Stats:** best combos, tricks landed, top speed, S.K.A.T.E. record and more.

## Controls

WASD and the arrow keys both work.

| Keys | What it does |
| --- | --- |
| ← → | Push. Hold backwards to brake or turn around. |
| ↑ | Ollie. Hold ↓ first to pop higher; hold ↓ on ramps to pump for speed. |
| After the ollie: → ← ↓ ↑ | Kickflip, heelflip, shove-it, impossible |
| Two quick taps | ↓→ tre flip, ↓← laser flip, →→ double kickflip, ↓↓ 360 shove-it, →↓ varial kickflip... |
| Hold Q / E | Spin backside / frontside |
| Space + arrow | Grab: Indy, Melon, Stalefish, Method (let go before you land!) |
| Land on a rail | Nothing for a 50-50, forward for a nosegrind, back for a 5-0, ↓ boardslide, ↑ crooked |
| ↓ as you land | Manual (↑ for a nose manual). Balance with ← →. |
| Q / E after landing | Revert (keeps the combo going) |
| H / R / M / Esc | Help card / back to the start / mute / menu |

### Park Builder

| Keys | What it does |
| --- | --- |
| ← → | Move the cursor (past either end to swap quarter pipe / wall) |
| ↑ ↓ | Pick a piece from the palette |
| Enter / Delete | Place / remove |
| Shift + ← → | Move the piece under the cursor |
| Z / Y | Undo / redo |
| [ ] | Make the park shorter / longer |
| N / T / Esc | Rename / test ride / back to the menu |

You can also click the palette, click to place, right-click to remove, drag pieces around and
scroll to slide along. Parks save automatically.

## How it's built

Plain JavaScript and HTML canvas, no libraries. Everything, including the art and the sounds,
is drawn or synthesized in code.

- `js/config.js`: all the "feel" numbers (gravity, pop height, spin speed...) in one place.
- `js/skater.js`: riding, tricks, grinds, manuals, landing and bailing.
- `js/maps.js`: the four maps, built with a small map builder.
- `js/render.js`, `js/scenery.js`, `js/sketch.js`: the hand-drawn look.
- `js/cpu.js`, `js/skategame.js`: the CPU opponent and Game of S.K.A.T.E. rules.
- `js/parks.js`, `js/builder.js`: custom parks and the Park Builder.

See [GAME_DESIGN.md](GAME_DESIGN.md) for the full design and the build plan.

## Status

Milestones 1–6 are done (core feel, full trick system, ragdoll and sound, maps, Game of
S.K.A.T.E., Park Builder). Next up: unlocks, music and polish.
