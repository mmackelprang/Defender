/**
 * Defender renderer — side-scrolling view with scanner minimap.
 */

import {
  CANVAS_WIDTH, CANVAS_HEIGHT, RENDER_SCALE,
  WORLD_WIDTH, SCANNER_HEIGHT,
  COLORS, LASER_LENGTH, ENEMY_RADIUS, HUMANOID_RADIUS,
} from '../core/constants.js';
import { World, EnemyType, wrapX } from '../world/world.js';

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  // ── Main gameplay render ──────────────────────────────────────

  renderPlaying(
    world: World, score: number, highScore: number,
    lives: number, smartBombs: number, wave: number,
  ): void {
    const { ctx } = this;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Terrain
    this.drawTerrain(world);

    // Humanoids
    for (const h of world.humanoids) {
      if (!h.alive) continue;
      this.drawHumanoid(h.x, h.y, world, h.carriedBy >= 0);
    }

    // Enemies
    for (const e of world.enemies) {
      if (!e.alive) continue;
      this.drawEnemy(e, world);
    }

    // Mines
    for (const m of world.mines) {
      this.drawMine(m.x, m.y, world);
    }

    // Lasers
    for (const l of world.lasers) {
      this.drawLaser(l, world);
    }

    // Player
    if (world.player.alive) {
      this.drawPlayer(world);
    }

    // Particles
    for (const p of world.particles) {
      this.drawParticle(p, world);
    }

    // Scanner
    this.drawScanner(world);

    // HUD
    this.drawHud(score, highScore, lives, smartBombs, wave);
  }

  // ── World-to-screen coordinate ─────────────────────────────────

  private worldToScreenX(worldX: number, cameraX: number): number {
    let dx = worldX - cameraX;
    if (dx > WORLD_WIDTH / 2) dx -= WORLD_WIDTH;
    if (dx < -WORLD_WIDTH / 2) dx += WORLD_WIDTH;
    return dx;
  }

  private isOnScreen(screenX: number): boolean {
    return screenX > -50 * RENDER_SCALE && screenX < CANVAS_WIDTH + 50 * RENDER_SCALE;
  }

  // ── Terrain ───────────────────────────────────────────────────

  private drawTerrain(world: World): void {
    const { ctx } = this;
    ctx.strokeStyle = COLORS.terrain;
    ctx.lineWidth = 2 * RENDER_SCALE;

    ctx.beginPath();
    let first = true;
    for (let sx = -5 * RENDER_SCALE; sx < CANVAS_WIDTH + 5 * RENDER_SCALE; sx += 4 * RENDER_SCALE) {
      const wx = wrapX(world.cameraX + sx);
      const h = world.getTerrainHeight(wx);
      if (first) { ctx.moveTo(sx, h); first = false; }
      else ctx.lineTo(sx, h);
    }
    ctx.stroke();

    // Fill below terrain (very dim)
    ctx.lineTo(CANVAS_WIDTH + 5 * RENDER_SCALE, CANVAS_HEIGHT);
    ctx.lineTo(-5 * RENDER_SCALE, CANVAS_HEIGHT);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 60, 0, 0.3)';
    ctx.fill();
  }

  // ── Player ────────────────────────────────────────────────────

  private drawPlayer(world: World): void {
    const { ctx } = this;
    const p = world.player;
    if (p.invulnerable > 0 && Math.sin(p.invulnerable * 20) > 0) return;

    const sx = this.worldToScreenX(p.x, world.cameraX);
    const size = 10 * RENDER_SCALE;
    const dir = p.facingRight ? 1 : -1;

    ctx.fillStyle = COLORS.player;
    ctx.strokeStyle = COLORS.player;
    ctx.lineWidth = 2 * RENDER_SCALE;

    // Ship shape — elongated triangle
    ctx.beginPath();
    ctx.moveTo(sx + dir * size * 1.2, p.y);
    ctx.lineTo(sx - dir * size * 0.6, p.y - size * 0.6);
    ctx.lineTo(sx - dir * size * 0.3, p.y);
    ctx.lineTo(sx - dir * size * 0.6, p.y + size * 0.6);
    ctx.closePath();
    ctx.stroke();

    // Thrust flame
    if (world.player.vx !== 0 && Math.random() > 0.3) {
      const flameLen = (5 + Math.random() * 8) * RENDER_SCALE;
      ctx.strokeStyle = COLORS.playerThrust;
      ctx.beginPath();
      ctx.moveTo(sx - dir * size * 0.6, p.y - size * 0.3);
      ctx.lineTo(sx - dir * (size * 0.6 + flameLen), p.y);
      ctx.lineTo(sx - dir * size * 0.6, p.y + size * 0.3);
      ctx.stroke();
    }
  }

  // ── Enemy ─────────────────────────────────────────────────────

  private drawEnemy(e: { type: EnemyType; x: number; y: number }, world: World): void {
    const { ctx } = this;
    const sx = this.worldToScreenX(e.x, world.cameraX);
    if (!this.isOnScreen(sx)) return;

    const r = ENEMY_RADIUS;
    let color: string;

    switch (e.type) {
      case EnemyType.Lander:  color = COLORS.lander; break;
      case EnemyType.Mutant:  color = COLORS.mutant; break;
      case EnemyType.Baiter:  color = COLORS.baiter; break;
      case EnemyType.Bomber:  color = COLORS.bomber; break;
      case EnemyType.Pod:     color = COLORS.pod; break;
      case EnemyType.Swarmer: color = COLORS.swarmer; break;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * RENDER_SCALE;

    switch (e.type) {
      case EnemyType.Lander:
        // Rounded body with antennae
        ctx.beginPath();
        ctx.arc(sx, e.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx - r * 0.5, e.y - r);
        ctx.lineTo(sx - r * 0.8, e.y - r * 1.4);
        ctx.moveTo(sx + r * 0.5, e.y - r);
        ctx.lineTo(sx + r * 0.8, e.y - r * 1.4);
        ctx.stroke();
        break;

      case EnemyType.Mutant:
        // Jagged star shape
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const rad = i % 2 === 0 ? r : r * 0.5;
          const px = sx + Math.cos(angle) * rad;
          const py = e.y + Math.sin(angle) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        break;

      case EnemyType.Baiter:
        // Diamond shape
        ctx.beginPath();
        ctx.moveTo(sx, e.y - r);
        ctx.lineTo(sx + r * 1.5, e.y);
        ctx.lineTo(sx, e.y + r);
        ctx.lineTo(sx - r * 1.5, e.y);
        ctx.closePath();
        ctx.stroke();
        break;

      case EnemyType.Bomber:
        // Square with inner cross
        ctx.strokeRect(sx - r, e.y - r, r * 2, r * 2);
        ctx.beginPath();
        ctx.moveTo(sx - r, e.y);
        ctx.lineTo(sx + r, e.y);
        ctx.moveTo(sx, e.y - r);
        ctx.lineTo(sx, e.y + r);
        ctx.stroke();
        break;

      case EnemyType.Pod:
        // Hexagon
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const px = sx + Math.cos(angle) * r;
          const py = e.y + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        break;

      case EnemyType.Swarmer:
        // Small filled diamond
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(sx, e.y - r * 0.5);
        ctx.lineTo(sx + r * 0.5, e.y);
        ctx.lineTo(sx, e.y + r * 0.5);
        ctx.lineTo(sx - r * 0.5, e.y);
        ctx.closePath();
        ctx.fill();
        break;
    }
  }

  // ── Humanoid ──────────────────────────────────────────────────

  private drawHumanoid(x: number, y: number, world: World, carried: boolean): void {
    const { ctx } = this;
    const sx = this.worldToScreenX(x, world.cameraX);
    if (!this.isOnScreen(sx)) return;

    const r = HUMANOID_RADIUS;
    ctx.fillStyle = carried ? COLORS.humanoidCarried : COLORS.humanoid;

    // Simple stick figure
    ctx.fillRect(sx - r * 0.3, y - r, r * 0.6, r * 0.6); // head
    ctx.fillRect(sx - r * 0.2, y - r * 0.3, r * 0.4, r * 1.0); // body
    ctx.fillRect(sx - r * 0.6, y - r * 0.1, r * 1.2, r * 0.2); // arms
    ctx.fillRect(sx - r * 0.4, y + r * 0.7, r * 0.25, r * 0.5); // left leg
    ctx.fillRect(sx + r * 0.15, y + r * 0.7, r * 0.25, r * 0.5); // right leg
  }

  // ── Laser ─────────────────────────────────────────────────────

  private drawLaser(l: { x: number; y: number; vx: number }, world: World): void {
    const { ctx } = this;
    const sx = this.worldToScreenX(l.x, world.cameraX);
    if (!this.isOnScreen(sx)) return;

    const dir = Math.sign(l.vx);
    ctx.strokeStyle = COLORS.laser;
    ctx.lineWidth = 2 * RENDER_SCALE;
    ctx.shadowColor = COLORS.laser;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(sx, l.y);
    ctx.lineTo(sx + dir * LASER_LENGTH, l.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── Mine ──────────────────────────────────────────────────────

  private drawMine(x: number, y: number, world: World): void {
    const { ctx } = this;
    const sx = this.worldToScreenX(x, world.cameraX);
    if (!this.isOnScreen(sx)) return;

    ctx.fillStyle = COLORS.mine;
    const s = 3 * RENDER_SCALE;
    ctx.fillRect(sx - s, y - s, s * 2, s * 2);
  }

  // ── Particle ──────────────────────────────────────────────────

  private drawParticle(p: { x: number; y: number; life: number; color: string }, world: World): void {
    const { ctx } = this;
    const sx = this.worldToScreenX(p.x, world.cameraX);
    if (!this.isOnScreen(sx)) return;

    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    const s = 2 * RENDER_SCALE;
    ctx.fillRect(sx - s / 2, p.y - s / 2, s, s);
    ctx.globalAlpha = 1.0;
  }

  // ── Scanner (minimap) ─────────────────────────────────────────

  private drawScanner(world: World): void {
    const { ctx } = this;

    // Scanner background
    ctx.fillStyle = COLORS.scanner;
    ctx.fillRect(0, 0, CANVAS_WIDTH, SCANNER_HEIGHT);
    ctx.strokeStyle = COLORS.scannerBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, CANVAS_WIDTH, SCANNER_HEIGHT);

    // View window indicator
    const viewFrac = CANVAS_WIDTH / WORLD_WIDTH;
    const viewX = (wrapX(world.cameraX) / WORLD_WIDTH) * CANVAS_WIDTH;
    const viewW = viewFrac * CANVAS_WIDTH;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.strokeRect(viewX, 1, viewW, SCANNER_HEIGHT - 2);

    // Terrain on scanner
    ctx.strokeStyle = COLORS.terrain;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const terrainCount = world.terrain.length;
    for (let i = 0; i < terrainCount; i++) {
      const sx = (i / terrainCount) * CANVAS_WIDTH;
      const h = world.terrain[i] * 0.3;
      const sy = SCANNER_HEIGHT - (h / CANVAS_HEIGHT) * SCANNER_HEIGHT * 0.4;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Player on scanner
    const px = (wrapX(world.player.x) / WORLD_WIDTH) * CANVAS_WIDTH;
    ctx.fillStyle = COLORS.scannerPlayer;
    ctx.fillRect(px - 2, SCANNER_HEIGHT * 0.3, 4, 4);

    // Enemies on scanner
    for (const e of world.enemies) {
      if (!e.alive) continue;
      const ex = (wrapX(e.x) / WORLD_WIDTH) * CANVAS_WIDTH;
      ctx.fillStyle = COLORS.scannerEnemy;
      ctx.fillRect(ex - 1, SCANNER_HEIGHT * 0.2 + (e.y / CANVAS_HEIGHT) * SCANNER_HEIGHT * 0.6, 2, 2);
    }

    // Humanoids on scanner
    for (const h of world.humanoids) {
      if (!h.alive) continue;
      const hx = (wrapX(h.x) / WORLD_WIDTH) * CANVAS_WIDTH;
      ctx.fillStyle = COLORS.scannerHumanoid;
      ctx.fillRect(hx - 1, SCANNER_HEIGHT * 0.7, 2, 3);
    }
  }

  // ── HUD ───────────────────────────────────────────────────────

  private drawHud(score: number, highScore: number, lives: number, smartBombs: number, wave: number): void {
    const { ctx } = this;
    const fontSize = 12 * RENDER_SCALE;
    const smallFontSize = 9 * RENDER_SCALE;

    ctx.font = `bold ${fontSize}px "Courier New", monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = COLORS.text;

    // Score — below scanner left
    const hudY = SCANNER_HEIGHT + 3 * RENDER_SCALE;
    ctx.textAlign = 'left';
    ctx.fillText(score.toString().padStart(7, '0'), 5 * RENDER_SCALE, hudY);

    // High score — below scanner center
    ctx.textAlign = 'center';
    ctx.font = `${smallFontSize}px "Courier New", monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`HI ${highScore.toString().padStart(7, '0')}`, CANVAS_WIDTH / 2, hudY);

    // Wave — below scanner right
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`WAVE ${wave}`, CANVAS_WIDTH - 5 * RENDER_SCALE, hudY);

    // Lives — bottom left as ship icons
    ctx.fillStyle = COLORS.player;
    ctx.font = `${smallFontSize}px "Courier New", monospace`;
    ctx.textAlign = 'left';
    for (let i = 0; i < Math.min(lives - 1, 5); i++) {
      ctx.fillText('\u25B6', 5 * RENDER_SCALE + i * 14 * RENDER_SCALE, CANVAS_HEIGHT - 15 * RENDER_SCALE);
    }

    // Smart bombs — bottom left after lives
    ctx.fillStyle = '#FF8800';
    for (let i = 0; i < smartBombs; i++) {
      ctx.fillText('\u25CF', 5 * RENDER_SCALE + (Math.min(lives - 1, 5)) * 14 * RENDER_SCALE + 10 * RENDER_SCALE + i * 14 * RENDER_SCALE, CANVAS_HEIGHT - 15 * RENDER_SCALE);
    }
  }

  // ── Attract screen ────────────────────────────────────────────

  renderAttract(highScore: number, time: number): void {
    const { ctx } = this;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const titleSize = 40 * RENDER_SCALE;
    ctx.font = `bold ${titleSize}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Rainbow-ish title colors cycling
    const hue = (time * 60) % 360;
    ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 15;
    ctx.fillText('DEFENDER', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.28);
    ctx.shadowBlur = 0;

    const scoreFontSize = 14 * RENDER_SCALE;
    ctx.font = `bold ${scoreFontSize}px "Courier New", monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`HIGH SCORE  ${highScore.toString().padStart(7, '0')}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.48);

    // Controls
    const smallSize = 10 * RENDER_SCALE;
    ctx.font = `${smallSize}px "Courier New", monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    const y0 = CANVAS_HEIGHT * 0.57;
    const lh = 14 * RENDER_SCALE;
    ctx.fillText('ARROWS / WASD — MOVE + THRUST', CANVAS_WIDTH / 2, y0);
    ctx.fillText('SPACE — FIRE LASER', CANVAS_WIDTH / 2, y0 + lh);
    ctx.fillText('Z — SMART BOMB    X — HYPERSPACE', CANVAS_WIDTH / 2, y0 + lh * 2);

    if (Math.sin(time * 4) > 0) {
      ctx.fillStyle = COLORS.text;
      ctx.font = `bold ${scoreFontSize}px "Courier New", monospace`;
      ctx.shadowColor = COLORS.text;
      ctx.shadowBlur = 4;
      ctx.fillText('PRESS ANY KEY TO START', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.82);
      ctx.shadowBlur = 0;
    }

    ctx.font = `${smallSize}px "Courier New", monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('\u00A9 1981 WILLIAMS', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.92);
  }

  // ── Game Over ─────────────────────────────────────────────────

  renderGameOver(score: number, highScore: number): void {
    const { ctx } = this;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const titleSize = 32 * RENDER_SCALE;
    ctx.font = `bold ${titleSize}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FF4444';
    ctx.shadowColor = '#FF4444';
    ctx.shadowBlur = 10;
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.35);
    ctx.shadowBlur = 0;

    const scoreFontSize = 16 * RENDER_SCALE;
    ctx.font = `bold ${scoreFontSize}px "Courier New", monospace`;
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`SCORE  ${score.toString().padStart(7, '0')}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.50);

    const isNewHigh = score >= highScore && score > 0;
    ctx.fillStyle = isNewHigh ? '#FFFF00' : 'rgba(255,255,255,0.5)';
    if (isNewHigh) {
      ctx.fillText('NEW HIGH SCORE!', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.58);
    } else {
      ctx.fillText(`HIGH   ${highScore.toString().padStart(7, '0')}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.58);
    }

    const smallSize = 12 * RENDER_SCALE;
    ctx.font = `bold ${smallSize}px "Courier New", monospace`;
    ctx.fillStyle = COLORS.text;
    ctx.fillText('PRESS ANY KEY', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.72);
  }
}
