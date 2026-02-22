# CLAUDE.md

## Build & Run Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server at http://localhost:5173
npm run build        # TypeScript compile + Vite bundle to /dist
npm run preview      # Preview production build locally
```

There are no tests or linting configured.

## Architecture

Defender (1981) arcade clone built with **TypeScript + HTML5 Canvas 2D**. Zero external runtime dependencies — all graphics drawn procedurally via Canvas, all sounds synthesized via Web Audio API.

### Entry Flow

`index.html` → `src/main.ts` → `Game` constructor → FSM starts at `Attract` state → `requestAnimationFrame` loop.

### Core Game Loop

Fixed-timestep accumulator pattern: physics update at locked 60 FPS (16.67ms) while rendering runs at display refresh rate.

### Key Modules

| Directory | Purpose |
|-----------|---------|
| `src/core/` | Constants, enums, input handling (5-button + joystick mapping), math utilities |
| `src/entities/` | Player ship, Landers, Mutants, Baiters, Bombers, Pods, Swarmers, Humanoids, Projectiles |
| `src/world/` | Side-scrolling world with wrap-around (~7x screen width), terrain, scanner/minimap |
| `src/rendering/` | Canvas 2D renderer — raster-style sprites, terrain, scanner overlay, particle effects |
| `src/systems/` | Level/wave configs, sound manager, scoring, collision |
| `src/states/` | FSM: Attract, Ready, Playing, Death, GameOver |

### World

Side-scrolling with wrapping world ~7x screen width. Terrain at bottom. Scanner/minimap at top shows full world with entity positions.

### Gameplay

- Thrust left/right, fire laser, smart bomb (3 per life), hyperspace
- 6 enemy types: Landers (grab humanoids), Mutants (aggressive), Baiters (speed-match), Bombers (mines), Pods (burst into Swarmers), Swarmers (fast homing)
- 10 humanoids to protect; if all lost, planet explodes (all Landers become Mutants)
- Humanoids replenish every 5th wave

## TypeScript Conventions

- **Strict mode** with `noUnusedLocals` and `noUnusedParameters`
- Zero use of `any`
- ES2022 target, ESNext modules, bundler resolution
- All imports use `.js` extensions for ESM compatibility
