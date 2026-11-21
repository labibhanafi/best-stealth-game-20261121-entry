[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/c/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/labibhanafi/best-stealth-game-20261121-entry/rank.svg)](https://make.fun/c/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/labibhanafi/best-stealth-game-20261121-entry/reward.svg)](https://make.fun/c/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# Lantern Heist

**A stealth game in the Ember Museum — steal, hide, vanish.**

You are Wren, a thief after the Ember Star. Three museum wings stand
between you and the night: patrolling guards sweep the halls with bright
vision cones, and one wrong step raises the alarm. Slip through the
shadows, hide in the bushes, lure guards away with a thrown pebble, grab
the gems, and reach the green EXIT unseen.

Lantern Heist runs entirely in the browser — no build step, no assets,
no network. Open `game/index.html` in desktop Chrome and play.

## How to play

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Shift (hold) | Sneak — slower, quieter, harder to spot |
| Mouse click | Throw a pebble (3 per wing) to lure guards to that spot |
| P / Esc | Pause |
| R | Restart the wing |
| M | Mute |
| Enter / click | Confirm on menus |

## The stealth

- **Vision cones** — a guard's cone is yellow while calm, orange while
  suspicious, red during the alarm. Walls and crates block sight.
- **Suspicion** — standing in a cone fills a guard's meter (the arc over
  its head, and the ALERT bar). At full, every guard hunts you for 6
  seconds. Break line of sight and the meter drains.
- **Cover** — bushes hide you unless a guard comes within a few steps;
  shadow tiles halve how fast you are spotted; running is loud enough
  for nearby guards to hear.
- **Noise** — walking makes a small sound ring, a pebble makes a big
  one. Guards walk over to investigate what they hear.
- **Scoring** — gems are worth 100 each, clearing a wing is 500 plus a
  time bonus, and finishing a wing without ever raising the alarm earns
  a 300 ghost bonus. Three lives; getting caught restarts the wing.

## Wings

1. **The Quiet Gallery** — learn the patrols (3 guards).
2. **The Vault Wing** — tighter halls, more guards (4 guards).
3. **The Ember Vault** — the Star itself, five guards, no mistakes.

## Run it

Serve the `game/` folder with any static server and open
`game/index.html`, or just open the file directly — it loads nothing
from the network. Sound is synthesized live with WebAudio; there are
no audio files.

## Entry

Built for the [make.fun best stealth game bounty](https://make.fun/c/best-stealth-game-20261121-1759).
`main.ts` hands the game in: it copies `game/` and `screenshots/` to
the output directory and writes `dossier.json` with the kit's vendored
`buildDossier`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
