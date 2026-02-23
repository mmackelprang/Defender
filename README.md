# Defender

A faithful TypeScript recreation of Williams' **Defender** (1981), the legendary side-scrolling space shooter designed by Eugene Jarvis and Larry DeMar.

Built with Canvas 2D and Web Audio API — zero runtime dependencies, no sprite sheets, no audio files. All graphics and sounds are generated procedurally.

## Play

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Controls

| Key | Action |
|-----|--------|
| Left/Right Arrow (or A/D) | Thrust (sets facing direction) |
| Up/Down Arrow (or W/S) | Move up/down |
| Space | Fire laser (hold for rapid fire) |
| Z | Smart bomb (destroys all on-screen enemies) |
| X or Shift | Hyperspace (risky random teleport) |
| M | Toggle mute |

## Gameplay

You pilot a spaceship defending humanoids on a planetary surface from alien abduction. The world wraps horizontally (~7 screens wide) and a scanner minimap at the top shows the full battlefield.

### Enemies

- **Lander** (150 pts, green) — Descends to grab humanoids; if it reaches the top with one, it mutates
- **Mutant** (150 pts, magenta) — Former Lander that mutated; aggressively homes toward you
- **Baiter** (200 pts, yellow) — Fast homing enemy that spawns when waves take too long
- **Bomber** (250 pts, red) — Drifts slowly, dropping persistent mines
- **Pod** (1,000 pts, cyan) — Splits into 3-5 Swarmers when destroyed
- **Swarmer** (150 pts, orange) — Fast, erratic, homes toward you

### Humanoid Rescue

- Catch falling humanoids after their Lander is destroyed (+500 pts)
- Return them safely to the ground (+500 bonus)
- If all 10 humanoids die, the planet is destroyed

### Features

- **Scanner minimap** — Full-width minimap showing terrain, enemies (red), humanoids (green), and player (white)
- **7-screen wrapping world** — Continuous horizontal world with procedural terrain
- **Smart bombs** — 3 per life; destroys all on-screen enemies
- **Hyperspace** — Emergency teleport to random location (15% death chance)
- **Wave progression** — Increasing enemy counts and types across 5+ wave configs
- **Extra lives** — Every 10,000 points (with smart bomb refill)

## Architecture

| Module | Purpose |
|--------|---------|
| `src/game.ts` | Main orchestrator — FSM states, input, scoring, wave management |
| `src/world/world.ts` | World state — player, 6 enemy types, humanoids, terrain, collisions |
| `src/rendering/renderer.ts` | Side-scrolling view, scanner minimap, HUD, attract/game over |
| `src/systems/sound.ts` | Web Audio procedural synthesis |
| `src/states/` | Generic FSM: Attract, Playing, Death, GameOver |

### Technical Highlights

- **Horizontal wrapping** — All positions, distances, and directions account for world wrap-around
- **6 distinct enemy AIs** — Landers grab humanoids, Mutants home aggressively, Baiters punish slow play, Bombers drop mines, Pods split into Swarmers
- **Humanoid lifecycle** — Grounded, grabbed, falling, caught by player, returned to ground
- **Scanner minimap** — Compressed view of entire world with real-time entity positions
- **Fixed-timestep accumulator** — Physics locked at 60 FPS, rendering at display refresh rate
- **3x render scale** — 876x720 canvas (292x240 native)

## History

Defender was released by Williams Electronics in December 1980, designed by Eugene Jarvis and Larry DeMar. Despite initially confusing players with its complex 5-button control scheme, it became one of the highest-grossing arcade games of the early 1980s, earning over $1 billion in quarters.

The game ran on a Motorola 6809 CPU at 1 MHz with a custom bit-blitter for graphics. The original hardware used an 8-bit DAC for sound, producing the game's distinctive synthesized audio. Defender was notable for introducing several innovations: the scrolling game world, the minimap radar/scanner, and the concept of protecting NPCs (humanoids) as a core game mechanic.

Eugene Jarvis went on to create Robotron: 2084 and Smash TV, both of which built on Defender's intense gameplay philosophy.

## Build

```bash
npm run build     # TypeScript compile + Vite bundle to /dist
npm run preview   # Preview production build
```

## License

MIT
