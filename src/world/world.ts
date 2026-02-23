/**
 * Defender world: terrain, player, enemies, humanoids, particles.
 * Horizontal wrapping world ~7 screens wide.
 */

import {
  CANVAS_WIDTH, CANVAS_HEIGHT, RENDER_SCALE,
  WORLD_WIDTH, NUM_HUMANOIDS,
  PLAY_AREA_TOP, GROUND_Y,
  PLAYER_THRUST, PLAYER_MAX_SPEED, PLAYER_DECEL, PLAYER_VERT_SPEED,
  PLAYER_RADIUS, ENEMY_RADIUS, HUMANOID_RADIUS,
  LASER_SPEED, LASER_LENGTH, LASER_LIFETIME, FIRE_COOLDOWN,
  LANDER_SPEED, LANDER_DESCENT_SPEED, MUTANT_SPEED, BAITER_SPEED,
  BOMBER_SPEED, POD_SPEED, SWARMER_SPEED,
} from '../core/constants.js';

// ── Wrapping helper ──────────────────────────────────────────────

export function wrapX(x: number): number {
  return ((x % WORLD_WIDTH) + WORLD_WIDTH) % WORLD_WIDTH;
}

export function distWrap(x1: number, x2: number): number {
  const d = Math.abs(x2 - x1);
  return Math.min(d, WORLD_WIDTH - d);
}

function dirWrap(from: number, to: number): number {
  let d = to - from;
  if (d > WORLD_WIDTH / 2) d -= WORLD_WIDTH;
  if (d < -WORLD_WIDTH / 2) d += WORLD_WIDTH;
  return Math.sign(d);
}

// ── Entity types ─────────────────────────────────────────────────

export const enum EnemyType {
  Lander,
  Mutant,
  Baiter,
  Bomber,
  Pod,
  Swarmer,
}

export interface Enemy {
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
  timer: number;        // general-purpose timer (fire, behavior)
  carryingHumanoid: number; // index of carried humanoid, or -1
}

export interface Humanoid {
  x: number;
  y: number;
  alive: boolean;
  grounded: boolean;
  falling: boolean;
  carriedBy: number; // index of enemy carrying it, or -1
  vy: number;
}

export interface Laser {
  x: number;
  y: number;
  vx: number;
  life: number;
}

export interface Mine {
  x: number;
  y: number;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingRight: boolean;
  alive: boolean;
  invulnerable: number;
}

// ── World ────────────────────────────────────────────────────────

export class World {
  player: Player = this.createPlayer();
  enemies: Enemy[] = [];
  humanoids: Humanoid[] = [];
  lasers: Laser[] = [];
  mines: Mine[] = [];
  particles: Particle[] = [];
  terrain: number[] = []; // ground height at each x position (sampled)

  fireCooldown = 0;
  cameraX = 0;
  planetDestroyed = false;

  constructor() {
    this.generateTerrain();
  }

  createPlayer(): Player {
    return {
      x: WORLD_WIDTH / 2,
      y: (PLAY_AREA_TOP + GROUND_Y) / 2,
      vx: 0, vy: 0,
      facingRight: true,
      alive: true,
      invulnerable: 2.0,
    };
  }

  reset(): void {
    this.enemies = [];
    this.lasers = [];
    this.mines = [];
    this.particles = [];
    this.fireCooldown = 0;
    this.planetDestroyed = false;
  }

  resetFull(): void {
    this.reset();
    this.player = this.createPlayer();
    this.humanoids = [];
    this.generateTerrain();
    this.spawnHumanoids();
  }

  private generateTerrain(): void {
    const samples = Math.floor(WORLD_WIDTH / (4 * RENDER_SCALE));
    this.terrain = [];
    let h = 60 * RENDER_SCALE;
    for (let i = 0; i < samples; i++) {
      h += (Math.random() - 0.48) * 8 * RENDER_SCALE;
      h = Math.max(20 * RENDER_SCALE, Math.min(90 * RENDER_SCALE, h));
      if (Math.random() < 0.05) h = (30 + Math.random() * 50) * RENDER_SCALE;
      this.terrain.push(h);
    }
  }

  getTerrainHeight(worldX: number): number {
    const wx = wrapX(worldX);
    const idx = (wx / WORLD_WIDTH) * this.terrain.length;
    const i = Math.floor(idx) % this.terrain.length;
    return GROUND_Y + this.terrain[i] * 0.3;
  }

  spawnHumanoids(): void {
    this.humanoids = [];
    for (let i = 0; i < NUM_HUMANOIDS; i++) {
      const x = Math.random() * WORLD_WIDTH;
      this.humanoids.push({
        x,
        y: GROUND_Y,
        alive: true,
        grounded: true,
        falling: false,
        carriedBy: -1,
        vy: 0,
      });
    }
  }

  // ── Player update ──────────────────────────────────────────────

  updatePlayer(dt: number, thrust: boolean, up: boolean, down: boolean): void {
    const dtSec = dt / 1000;

    // Horizontal thrust
    if (thrust) {
      const dir = this.player.facingRight ? 1 : -1;
      this.player.vx += dir * PLAYER_THRUST * dtSec;
    } else {
      // Decelerate
      if (Math.abs(this.player.vx) > 0) {
        const decel = PLAYER_DECEL * dtSec;
        if (Math.abs(this.player.vx) <= decel) {
          this.player.vx = 0;
        } else {
          this.player.vx -= Math.sign(this.player.vx) * decel;
        }
      }
    }

    // Clamp speed
    if (Math.abs(this.player.vx) > PLAYER_MAX_SPEED) {
      this.player.vx = Math.sign(this.player.vx) * PLAYER_MAX_SPEED;
    }

    // Vertical movement
    if (up) {
      this.player.vy = -PLAYER_VERT_SPEED;
    } else if (down) {
      this.player.vy = PLAYER_VERT_SPEED;
    } else {
      this.player.vy *= 0.9;
      if (Math.abs(this.player.vy) < 5) this.player.vy = 0;
    }

    // Move
    this.player.x = wrapX(this.player.x + this.player.vx * dtSec);
    this.player.y += this.player.vy * dtSec;

    // Clamp vertical
    const topLimit = PLAY_AREA_TOP + PLAYER_RADIUS;
    const botLimit = GROUND_Y - PLAYER_RADIUS;
    this.player.y = Math.max(topLimit, Math.min(botLimit, this.player.y));

    // Update camera
    this.cameraX = this.player.x - CANVAS_WIDTH / 2;

    // Invulnerability
    if (this.player.invulnerable > 0) {
      this.player.invulnerable -= dtSec;
    }

    // Fire cooldown
    if (this.fireCooldown > 0) {
      this.fireCooldown -= dtSec;
    }
  }

  fireLaser(): boolean {
    if (this.fireCooldown > 0) return false;
    this.fireCooldown = FIRE_COOLDOWN;

    const dir = this.player.facingRight ? 1 : -1;
    this.lasers.push({
      x: this.player.x + dir * PLAYER_RADIUS,
      y: this.player.y,
      vx: dir * LASER_SPEED + this.player.vx * 0.3,
      life: LASER_LIFETIME,
    });
    return true;
  }

  // ── Enemy spawning ─────────────────────────────────────────────

  spawnEnemy(type: EnemyType): void {
    // Spawn off-screen from player
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = wrapX(this.player.x + side * (CANVAS_WIDTH * 0.6 + Math.random() * CANVAS_WIDTH * 0.4));
    const y = PLAY_AREA_TOP + Math.random() * (GROUND_Y - PLAY_AREA_TOP - 50 * RENDER_SCALE);

    this.enemies.push({
      type, x, y,
      vx: 0, vy: 0,
      alive: true,
      timer: 1.0 + Math.random() * 2.0,
      carryingHumanoid: -1,
    });
  }

  // ── Enemy AI update ────────────────────────────────────────────

  updateEnemies(dt: number): void {
    const dtSec = dt / 1000;

    for (const e of this.enemies) {
      if (!e.alive) continue;

      switch (e.type) {
        case EnemyType.Lander: this.updateLander(e, dtSec); break;
        case EnemyType.Mutant: this.updateMutant(e, dtSec); break;
        case EnemyType.Baiter: this.updateBaiter(e, dtSec); break;
        case EnemyType.Bomber: this.updateBomber(e, dtSec); break;
        case EnemyType.Pod:    this.updatePod(e, dtSec); break;
        case EnemyType.Swarmer: this.updateSwarmer(e, dtSec); break;
      }

      e.x = wrapX(e.x + e.vx * dtSec);
      e.y += e.vy * dtSec;

      // Clamp vertical
      e.y = Math.max(PLAY_AREA_TOP + ENEMY_RADIUS, Math.min(GROUND_Y - ENEMY_RADIUS, e.y));
    }

    this.enemies = this.enemies.filter(e => e.alive);
  }

  private updateLander(e: Enemy, dtSec: number): void {
    if (e.carryingHumanoid >= 0) {
      // Carrying humanoid — ascend
      e.vy = -LANDER_DESCENT_SPEED * 1.5;
      e.vx += (Math.random() - 0.5) * LANDER_SPEED * dtSec * 5;
      e.vx = Math.max(-LANDER_SPEED, Math.min(LANDER_SPEED, e.vx));

      // If reached top — mutate
      if (e.y <= PLAY_AREA_TOP + ENEMY_RADIUS + 10) {
        e.type = EnemyType.Mutant;
        // Kill humanoid
        if (e.carryingHumanoid >= 0 && e.carryingHumanoid < this.humanoids.length) {
          this.humanoids[e.carryingHumanoid].alive = false;
          this.humanoids[e.carryingHumanoid].carriedBy = -1;
        }
        e.carryingHumanoid = -1;
      }
      return;
    }

    // Wander and occasionally dive to grab humanoid
    e.timer -= dtSec;
    if (e.timer <= 0) {
      e.timer = 2.0 + Math.random() * 3.0;

      // Try to target nearest humanoid
      let nearestIdx = -1;
      let nearestDist = Infinity;
      for (let i = 0; i < this.humanoids.length; i++) {
        const h = this.humanoids[i];
        if (!h.alive || !h.grounded || h.carriedBy >= 0) continue;
        const d = distWrap(e.x, h.x);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }

      if (nearestIdx >= 0 && nearestDist < CANVAS_WIDTH) {
        // Dive toward humanoid
        const h = this.humanoids[nearestIdx];
        e.vx = dirWrap(e.x, h.x) * LANDER_SPEED * 2;
        e.vy = LANDER_DESCENT_SPEED * 2;
      }
    }

    // General wander
    e.vx += (Math.random() - 0.5) * LANDER_SPEED * dtSec * 3;
    e.vy += (Math.random() - 0.5) * LANDER_SPEED * dtSec * 2;
    e.vx = Math.max(-LANDER_SPEED, Math.min(LANDER_SPEED, e.vx));
    e.vy = Math.max(-LANDER_DESCENT_SPEED, Math.min(LANDER_DESCENT_SPEED, e.vy));

    // Check grab humanoid
    for (let i = 0; i < this.humanoids.length; i++) {
      const h = this.humanoids[i];
      if (!h.alive || !h.grounded || h.carriedBy >= 0) continue;
      if (distWrap(e.x, h.x) < ENEMY_RADIUS + HUMANOID_RADIUS && Math.abs(e.y - h.y) < 20 * RENDER_SCALE) {
        e.carryingHumanoid = i;
        h.carriedBy = this.enemies.indexOf(e);
        h.grounded = false;
        break;
      }
    }
  }

  private updateMutant(e: Enemy, dtSec: number): void {
    // Aggressive — home toward player
    const dx = dirWrap(e.x, this.player.x);
    const dy = Math.sign(this.player.y - e.y);
    e.vx += dx * MUTANT_SPEED * dtSec * 3;
    e.vy += dy * MUTANT_SPEED * dtSec * 2;
    const speed = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
    if (speed > MUTANT_SPEED) {
      e.vx = (e.vx / speed) * MUTANT_SPEED;
      e.vy = (e.vy / speed) * MUTANT_SPEED;
    }
  }

  private updateBaiter(e: Enemy, dtSec: number): void {
    // Fast homing — appears when player takes too long
    const dx = dirWrap(e.x, this.player.x);
    const dy = Math.sign(this.player.y - e.y);
    e.vx += dx * BAITER_SPEED * dtSec * 4;
    e.vy += dy * BAITER_SPEED * dtSec * 2;
    const speed = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
    if (speed > BAITER_SPEED) {
      e.vx = (e.vx / speed) * BAITER_SPEED;
      e.vy = (e.vy / speed) * BAITER_SPEED;
    }
  }

  private updateBomber(e: Enemy, dtSec: number): void {
    // Slow horizontal drift, drops mines
    e.vx += (Math.random() - 0.5) * BOMBER_SPEED * dtSec * 2;
    e.vy += (Math.random() - 0.5) * BOMBER_SPEED * dtSec;
    e.vx = Math.max(-BOMBER_SPEED, Math.min(BOMBER_SPEED, e.vx));
    e.vy = Math.max(-BOMBER_SPEED * 0.5, Math.min(BOMBER_SPEED * 0.5, e.vy));

    e.timer -= dtSec;
    if (e.timer <= 0) {
      e.timer = 2.0 + Math.random() * 3.0;
      this.mines.push({ x: e.x, y: e.y, life: 8.0 });
    }
  }

  private updatePod(e: Enemy, _dtSec: number): void {
    // Slow drift
    e.vx += (Math.random() - 0.5) * POD_SPEED * 0.5;
    e.vy += (Math.random() - 0.5) * POD_SPEED * 0.3;
    e.vx = Math.max(-POD_SPEED, Math.min(POD_SPEED, e.vx));
    e.vy = Math.max(-POD_SPEED * 0.5, Math.min(POD_SPEED * 0.5, e.vy));
  }

  private updateSwarmer(e: Enemy, dtSec: number): void {
    // Fast homing
    const dx = dirWrap(e.x, this.player.x);
    const dy = Math.sign(this.player.y - e.y);
    e.vx += dx * SWARMER_SPEED * dtSec * 5;
    e.vy += dy * SWARMER_SPEED * dtSec * 3;
    // Add some erratic movement
    e.vx += (Math.random() - 0.5) * SWARMER_SPEED * dtSec * 3;
    e.vy += (Math.random() - 0.5) * SWARMER_SPEED * dtSec * 2;
    const speed = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
    if (speed > SWARMER_SPEED) {
      e.vx = (e.vx / speed) * SWARMER_SPEED;
      e.vy = (e.vy / speed) * SWARMER_SPEED;
    }
  }

  // ── Lasers ─────────────────────────────────────────────────────

  updateLasers(dt: number): void {
    const dtSec = dt / 1000;
    for (const l of this.lasers) {
      l.x = wrapX(l.x + l.vx * dtSec);
      l.life -= dtSec;
    }
    this.lasers = this.lasers.filter(l => l.life > 0);
  }

  // ── Mines ──────────────────────────────────────────────────────

  updateMines(dt: number): void {
    const dtSec = dt / 1000;
    for (const m of this.mines) {
      m.life -= dtSec;
    }
    this.mines = this.mines.filter(m => m.life > 0);
  }

  // ── Humanoids ──────────────────────────────────────────────────

  updateHumanoids(dt: number): void {
    const dtSec = dt / 1000;

    for (let i = 0; i < this.humanoids.length; i++) {
      const h = this.humanoids[i];
      if (!h.alive) continue;

      if (h.carriedBy >= 0) {
        // Being carried by enemy
        const carrier = this.enemies.find((e, idx) => idx === h.carriedBy && e.alive);
        if (carrier) {
          h.x = carrier.x;
          h.y = carrier.y + ENEMY_RADIUS + HUMANOID_RADIUS;
        } else {
          // Carrier killed — fall
          h.carriedBy = -1;
          h.falling = true;
          h.vy = 0;
        }
      } else if (h.falling) {
        // Falling — check if player catches
        h.vy += 150 * RENDER_SCALE * dtSec; // gravity
        h.y += h.vy * dtSec;

        if (h.y >= GROUND_Y) {
          // Landed safely (if planet exists) or died
          if (!this.planetDestroyed) {
            h.y = GROUND_Y;
            h.falling = false;
            h.grounded = true;
            h.vy = 0;
          } else {
            h.alive = false;
          }
        }

        // Check if above ground when planet is destroyed
        if (this.planetDestroyed && h.y > CANVAS_HEIGHT + 50) {
          h.alive = false;
        }
      }
    }
  }

  // ── Particles ──────────────────────────────────────────────────

  updateParticles(dt: number): void {
    const dtSec = dt / 1000;
    for (const p of this.particles) {
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.life -= dtSec;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  spawnExplosion(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (50 + Math.random() * 150) * RENDER_SCALE;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.5,
        color,
      });
    }
  }

  // ── Collision detection ────────────────────────────────────────

  checkLaserHits(): { type: EnemyType; x: number; y: number } | null {
    for (let li = this.lasers.length - 1; li >= 0; li--) {
      const l = this.lasers[li];

      // vs enemies
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        if (!e.alive) continue;
        if (distWrap(l.x, e.x) < LASER_LENGTH + ENEMY_RADIUS && Math.abs(l.y - e.y) < ENEMY_RADIUS) {
          this.lasers.splice(li, 1);
          const result = { type: e.type, x: e.x, y: e.y };
          this.killEnemy(ei);
          return result;
        }
      }

      // vs mines
      for (let mi = this.mines.length - 1; mi >= 0; mi--) {
        const m = this.mines[mi];
        if (distWrap(l.x, m.x) < LASER_LENGTH + 5 * RENDER_SCALE && Math.abs(l.y - m.y) < 8 * RENDER_SCALE) {
          this.lasers.splice(li, 1);
          this.spawnExplosion(m.x, m.y, '#FF4444', 6);
          this.mines.splice(mi, 1);
          break;
        }
      }
    }
    return null;
  }

  killEnemy(idx: number): void {
    const e = this.enemies[idx];
    e.alive = false;

    // Release humanoid
    if (e.carryingHumanoid >= 0 && e.carryingHumanoid < this.humanoids.length) {
      const h = this.humanoids[e.carryingHumanoid];
      h.carriedBy = -1;
      h.falling = true;
      h.vy = 0;
    }

    // Pod splits into swarmers
    if (e.type === EnemyType.Pod) {
      for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
        const s: Enemy = {
          type: EnemyType.Swarmer,
          x: e.x + (Math.random() - 0.5) * 30 * RENDER_SCALE,
          y: e.y + (Math.random() - 0.5) * 30 * RENDER_SCALE,
          vx: (Math.random() - 0.5) * SWARMER_SPEED,
          vy: (Math.random() - 0.5) * SWARMER_SPEED,
          alive: true,
          timer: 0,
          carryingHumanoid: -1,
        };
        this.enemies.push(s);
      }
    }
  }

  checkPlayerHits(): boolean {
    if (!this.player.alive || this.player.invulnerable > 0) return false;

    // vs enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (distWrap(this.player.x, e.x) < PLAYER_RADIUS + ENEMY_RADIUS &&
          Math.abs(this.player.y - e.y) < PLAYER_RADIUS + ENEMY_RADIUS) {
        return true;
      }
    }

    // vs mines
    for (const m of this.mines) {
      if (distWrap(this.player.x, m.x) < PLAYER_RADIUS + 5 * RENDER_SCALE &&
          Math.abs(this.player.y - m.y) < PLAYER_RADIUS + 5 * RENDER_SCALE) {
        return true;
      }
    }

    return false;
  }

  checkHumanoidCatch(): number {
    if (!this.player.alive) return -1;
    for (let i = 0; i < this.humanoids.length; i++) {
      const h = this.humanoids[i];
      if (!h.alive || h.grounded || h.carriedBy >= 0 || !h.falling) continue;
      if (distWrap(this.player.x, h.x) < PLAYER_RADIUS + HUMANOID_RADIUS &&
          Math.abs(this.player.y - h.y) < PLAYER_RADIUS + HUMANOID_RADIUS) {
        return i;
      }
    }
    return -1;
  }

  // ── Smart bomb ─────────────────────────────────────────────────

  smartBomb(): number {
    let kills = 0;
    // Kill all enemies on screen
    const halfW = CANVAS_WIDTH / 2;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      if (distWrap(this.player.x, e.x) < halfW + 100 * RENDER_SCALE) {
        this.spawnExplosion(e.x, e.y, '#FFFFFF', 8);
        this.killEnemy(i);
        kills++;
      }
    }
    // Kill mines on screen
    for (let i = this.mines.length - 1; i >= 0; i--) {
      if (distWrap(this.player.x, this.mines[i].x) < halfW + 100 * RENDER_SCALE) {
        this.spawnExplosion(this.mines[i].x, this.mines[i].y, '#FF4444', 4);
        this.mines.splice(i, 1);
      }
    }
    return kills;
  }
}
