# SHRED HED — Design Doc

*(Yes, "Hed" is spelled that way on purpose.)*

A side-view skateboarding game that runs in the web browser, with a hand-drawn/sketchy look, Tony Hawk-style combo tricks, and controls that work like flicking a real board.

---

## 1. Game Modes

### Free Skate (1 player)
- Pick a map and skate with no timer. Chain tricks into combos for points.
- Your score and tricks earn **Rep**, which unlocks things (see §7).

### Game of S.K.A.T.E. (2 players or vs CPU)
- Works like H.O.R.S.E. in basketball.
- **Setter** gets one attempt at a trick. If they land it, the **follower** has to land the *same trick* (any spot on the map).
  - Follower misses → they get a letter (S, K, A, T, E).
  - Setter misses → the turn passes and the other player becomes setter.
- Spell S.K.A.T.E. and you lose.
- A "trick" means everything done in **one air** (or one grind), e.g. `360 Kickflip Indy` or `Boardslide`. Flip, spin and grab all have to match.
- Real-life rule: on your **last letter (E)** you get 2 tries to match.
- **Same keyboard, taking turns.** Either player can use WASD or arrows.
- **vs CPU:** one balanced AI opponent (see §6).
- Any map can be used, including parks you built.

### Park Builder
- Build your own skatepark by snapping pieces onto a grid.
- Test-ride it right away with one button.
- Saved parks show up in the map list for Free Skate and S.K.A.T.E.

---

## 2. Controls

WASD and the arrow keys both work. `↑` means `W` or the up arrow, `←` means `A` or the left arrow, and so on.

### On the ground
| Input | Action |
|---|---|
| `→` / `←` | Push / slow down (move) |
| hold `↓` | Crouch (charges a higher ollie) |
| `↑` | **Ollie** |

### In the air: flip tricks
After pressing `↑` (ollie), **any new key press before you land does a trick.** Keys you were already holding when you popped (like `→` for pushing) don't count, so you won't do a trick by accident.

| Input after ollie | Trick |
|---|---|
| `→` | **Kickflip** |
| `←` | **Heelflip** |
| `↓` | **Pop Shove-it** |
| `↑` | Impossible |
| `→` `→` | Double Kickflip |
| `←` `←` | Double Heelflip |
| `↓` `↓` | 360 Shove-it |
| `→` `↓` | Varial Kickflip |
| `←` `↓` | Varial Heelflip |
| `↓` `→` | **Tre Flip** (360 Flip) |
| `↓` `←` | Laser Flip |
| `→` `↑` | Hardflip |
| `←` `↑` | Inward Heelflip |

Sequences have a short window (around 0.15 s) between presses. If you press the second key too late, you just get the first trick.

### Spins
| Input | Action |
|---|---|
| hold `Q` | Backside spin |
| hold `E` | Frontside spin |

Hold longer for more rotation: 180 → 360 → 540. Spins stack with flips: `↑`, `→`, hold `E` = **360 Kickflip**.

### Grabs
| Input (in air) | Grab |
|---|---|
| `Space` + `→` | Indy |
| `Space` + `←` | Melon |
| `Space` + `↓` | Stalefish |
| `Space` + `↑` | Method |

Keep holding to **tweak** the grab for bonus points. Let go before you land or you bail.

### Grinds (land on a rail or ledge while holding)
| Held when landing on rail | Grind |
|---|---|
| nothing | 50-50 |
| `→` | Nosegrind |
| `←` | 5-0 |
| `↓` | Boardslide |
| `↑` | Crooked |

Press `↑` while grinding to ollie out, which lets you flip out of the grind.

### Manuals (link combos on flat ground)
| Input right as you touch down | Action |
|---|---|
| `↓` | Manual |
| `↑` | Nose Manual |

While in a manual, a balance meter wobbles. Tap `↑`/`↓` to keep it centered, and if it tips too far you bail.

---

## 3. Trick Realism (looks like real life)

Since the game is side-view, the board has to be drawn with a fake 3D effect so tricks read correctly:
- **Kickflip / Heelflip:** the board rolls along its long axis. You see it narrow, flash the griptape and the bottom graphic, then come back. Kickflip and heelflip roll in opposite directions.
- **Shove-it:** the board rotates flat under the feet. From the side it shrinks to a short stub and grows back.
- **Tre flip:** both at once, the 360 shove-it and the kickflip together.
- **Feet matter:** the front foot slides off toward the toe or heel edge for the flick, the back foot scoops for shove-its, and the feet "catch" the board before landing.
- **Grabs:** the skater's hand actually reaches the correct rail of the board (Indy = toe side between the feet, Melon = heel side, and so on).
- The skater's body crouches, pops, tucks and extends on landing, so every trick has anticipation and follow-through.

---

## 4. Landing, Bails & Scoring

### Landing
- Land with the board roughly flat and wheels down → you roll away clean.
- Still flipping, still grabbing, or crooked angle when you hit the ground → **bail**.
- A small forgiveness window on landings, so it feels fair rather than random.

### Ragdoll bails
- On a bail the skater becomes a physics ragdoll: they tumble, slide, and flop, and the board flies off on its own.
- The combo is lost. Press any key to get back up (or it auto-resets after a few seconds).

### Scoring (Tony Hawk style)
- Each trick has base points (harder = more).
- **Combo multiplier** = number of tricks chained together. Manuals and grinds keep a combo alive between airs.
- Repeating the same trick in one combo is worth less each time.
- Spin and grab-tweak bonuses add on top.
- The combo only counts once you land clean. Bail and you get zero.

---

## 5. Maps (all four at launch)
1. **Skatepark:** quarter pipes, halfpipe, funbox, flat bars, a manual pad. The starter map.
2. **Street / City:** stairs, handrails, ledges, benches, curbs, a parked-car gap.
3. **School Yard:** big stair sets with handrails, picnic tables, planters, a gap to the lower level.
4. **Mega Ramp / DIY Spot:** a giant roll-in and gap for huge spins and grabs, plus a gritty DIY section under a bridge.

Skatepark is open from the start; the others are unlocks.

---

## 6. CPU Opponent (S.K.A.T.E.)
- One balanced difficulty: challenging but beatable.
- As setter, it picks tricks from a weighted list. It goes for harder tricks more often when it's ahead and safer tricks when it's on its last letter.
- Its chance of landing a trick depends on how hard the trick is: high for an ollie or shove-it, lower for laser flips and 360 variations.
- It actually skates on screen, using the same physics and animations as the player.

---

## 7. Progression & Unlocks
- Earn **Rep** from Free Skate combos, total score milestones and S.K.A.T.E. wins.
- Rep levels unlock:
  - **Maps:** Street, School Yard, Mega Ramp/DIY
  - **Boards & griptape:** deck graphics, wheel colors, grip art
  - **Skaters & outfits:** new characters, shirts, shoes, hats, plus regular/goofy stance
  - **Builder pieces:** bigger and crazier pieces for the Park Builder
- Progress saves automatically in the browser.

---

## 8. Park Builder Details
- Grid snapping; pieces sit flush with the ground.
- Starting pieces: flat ground, quarter pipe, kicker ramp, funbox, ledge, flat rail, stair set (3/5/7), handrail, manual pad, gap.
- Unlockable pieces: halfpipe, mega roll-in, big kinked rail, bank-to-ledge, DIY quarter, and others.
- Tools: place, move, delete, undo/redo, "Test Ride", save/load/rename parks.
- The builder blocks layouts that can't be ridden (like a piece floating in the air).

---

## 9. Art & Audio

### Hand-drawn / sketchy look
- Everything is drawn in code with wobbly marker and pencil lines on a paper-texture background.
- Lines "boil" (redraw slightly differently a few times a second) like a hand-drawn cartoon.
- Graffiti-style trick-name popups and score text.
- Limited color palette per map, marker-style fills that don't quite stay inside the lines.

### Sound
- Effects: wheels rolling (pitch changes with speed), the ollie pop, board flick, catch/land clack, grind scrape, bail thud, board clatter.
- Music: an original lo-fi/punk-style loop generated in code (no copyrighted songs), with a volume control and mute.

---

## 10. Making It Feel Good (game-feel checklist)
These details are what separate a fun skate game from a stiff one:
- **Input buffering:** a trick pressed a hair early still comes out.
- **Coyote time:** you can still ollie a few frames after rolling off a ledge.
- **Camera:** looks ahead in the direction you're moving and zooms out a little for big air.
- **Juice:** a tiny freeze-frame on big landings, light screen shake, dust puffs, grind sparks, speed lines.
- **Clear feedback:** the trick name pops up the moment you do it, and the combo counter grows on screen.
- **Tunable numbers:** gravity, pop height, flip speed, landing tolerance and so on all live in one settings file so we can tweak until it feels right.

---

## 11. Tech Plan
- **Platform:** web browser, HTML5 Canvas + plain JavaScript. Open `index.html` to play, with no install and no build step.
- **Physics:** custom skateboard physics (rolling along curved ramp surfaces, which general physics engines handle badly) plus a simple verlet ragdoll for bails.
- **Saving:** browser localStorage for progress, unlocks and custom parks.

---

## 12. Build Order (milestones)
Each milestone ends with something you can play and give feedback on.

1. **Core feel:** flat ground + one ramp, pushing, ollie, kickflip/heelflip/shove-it with realistic board animation, clean landings vs bails. *This is the most important step: if the basics don't feel good, nothing else matters.*
2. **Full trick system:** all flip sequences, spins, grabs, grinds, manuals, scoring and combos.
3. **Ragdoll bails + sound effects.**
4. **Maps + Free Skate:** all 4 maps, main menu, map select.
5. **Game of S.K.A.T.E.:** 2-player turns, letters, the last-letter rule, then the CPU opponent.
6. **Park Builder:** grid, pieces, test ride, saving, custom parks in the other modes.
7. **Unlocks & customization:** Rep, skaters, outfits, boards, music, final polish.
