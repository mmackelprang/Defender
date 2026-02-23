import { StateMachine } from './states/state-machine.js';
import { InputManager } from './core/input.js';
import { SoundManager } from './systems/sound.js';
import { Renderer } from './rendering/renderer.js';
import { World, EnemyType } from './world/world.js';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, FRAME_TIME, RENDER_SCALE, WORLD_WIDTH,
  SMART_BOMBS_PER_LIFE, WAVE_CONFIGS,
  SCORE_LANDER, SCORE_MUTANT, SCORE_BAITER, SCORE_BOMBER,
  SCORE_POD, SCORE_SWARMER, SCORE_HUMANOID_CATCH, SCORE_HUMANOID_RETURN,
  SCORE_EXTRA_LIFE, PLAY_AREA_TOP, GROUND_Y,
} from './core/constants.js';

const STORAGE_KEY = 'defender_high_score';

type GameStateKey = 'attract' | 'playing' | 'death' | 'gameOver';

export class Game {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly input: InputManager;
  readonly sound: SoundManager;
  readonly renderer: Renderer;
  readonly fsm: StateMachine<GameStateKey, Game>;

  world = new World();

  score = 0;
  highScore = 0;
  lives = 3;
  smartBombs = SMART_BOMBS_PER_LIFE;
  wave = 1;

  // Wave management
  enemiesSpawned = 0;
  waveEnemyTotal = 0;
  spawnTimer = 0;
  baiterTimer = 20; // baiter spawns if wave takes too long
  carriedHumanoidIdx = -1; // humanoid being carried by player

  stateTimer = 0;
  attractTime = 0;

  private lastTime = 0;
  private accumulator = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d')!;
    this.input = new InputManager();
    this.sound = new SoundManager();
    this.renderer = new Renderer(this.ctx);
    this.fsm = new StateMachine<GameStateKey, Game>(this);

    this.highScore = this.loadHighScore();

    this.registerStates();
    this.scaleCanvas();
    window.addEventListener('resize', () => this.scaleCanvas());

    this.fsm.transition('attract');
    requestAnimationFrame((t) => this.loop(t));
  }

  // ── High score ────────────────────────────────────────────────

  private loadHighScore(): number {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v ? parseInt(v, 10) || 0 : 0;
    } catch { return 0; }
  }

  private saveHighScore(): void {
    try { localStorage.setItem(STORAGE_KEY, this.highScore.toString()); }
    catch { /* ignore */ }
  }

  // ── Scoring ───────────────────────────────────────────────────

  addScore(points: number): void {
    const oldThreshold = Math.floor(this.score / SCORE_EXTRA_LIFE);
    this.score += points;
    const newThreshold = Math.floor(this.score / SCORE_EXTRA_LIFE);

    if (newThreshold > oldThreshold) {
      this.lives++;
      this.smartBombs = Math.min(this.smartBombs + SMART_BOMBS_PER_LIFE, 9);
      this.sound.playExtraLife();
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }
  }

  private scoreForEnemy(type: EnemyType): number {
    switch (type) {
      case EnemyType.Lander: return SCORE_LANDER;
      case EnemyType.Mutant: return SCORE_MUTANT;
      case EnemyType.Baiter: return SCORE_BAITER;
      case EnemyType.Bomber: return SCORE_BOMBER;
      case EnemyType.Pod: return SCORE_POD;
      case EnemyType.Swarmer: return SCORE_SWARMER;
    }
  }

  private enemyColor(type: EnemyType): string {
    switch (type) {
      case EnemyType.Lander: return '#00FF00';
      case EnemyType.Mutant: return '#FF00FF';
      case EnemyType.Baiter: return '#FFFF00';
      case EnemyType.Bomber: return '#FF0000';
      case EnemyType.Pod: return '#00FFFF';
      case EnemyType.Swarmer: return '#FF8800';
    }
  }

  // ── New game ──────────────────────────────────────────────────

  startNewGame(): void {
    this.score = 0;
    this.lives = 3;
    this.smartBombs = SMART_BOMBS_PER_LIFE;
    this.wave = 1;
    this.carriedHumanoidIdx = -1;
    this.world.resetFull();
    this.startWave();
  }

  // ── Wave management ───────────────────────────────────────────

  startWave(): void {
    this.enemiesSpawned = 0;
    this.spawnTimer = 1.0;
    this.baiterTimer = 20;

    const cfg = WAVE_CONFIGS[Math.min(this.wave - 1, WAVE_CONFIGS.length - 1)];
    this.waveEnemyTotal = cfg.landers + cfg.bombers + cfg.pods;
  }

  private spawnWaveEnemy(): void {
    const cfg = WAVE_CONFIGS[Math.min(this.wave - 1, WAVE_CONFIGS.length - 1)];
    const landerCount = this.world.enemies.filter(e => e.type === EnemyType.Lander && e.alive).length;
    const bomberCount = this.world.enemies.filter(e => e.type === EnemyType.Bomber && e.alive).length;
    const podCount = this.world.enemies.filter(e => e.type === EnemyType.Pod && e.alive).length;

    if (landerCount < cfg.landers && Math.random() < 0.6) {
      this.world.spawnEnemy(EnemyType.Lander);
    } else if (bomberCount < cfg.bombers && Math.random() < 0.3) {
      this.world.spawnEnemy(EnemyType.Bomber);
    } else if (podCount < cfg.pods) {
      this.world.spawnEnemy(EnemyType.Pod);
    } else {
      this.world.spawnEnemy(EnemyType.Lander);
    }
    this.enemiesSpawned++;
  }

  private isWaveComplete(): boolean {
    return this.enemiesSpawned >= this.waveEnemyTotal &&
           this.world.enemies.filter(e => e.alive).length === 0;
  }

  // ── Input handling ─────────────────────────────────────────────

  private handlePlayingInput(dt: number): void {
    if (!this.world.player.alive) return;

    // Reverse direction
    if (this.input.isAnyKeyPressed('KeyA') || this.input.isAnyKeyPressed('ArrowLeft')) {
      this.world.player.facingRight = false;
    }
    if (this.input.isAnyKeyPressed('KeyD') || this.input.isAnyKeyPressed('ArrowRight')) {
      this.world.player.facingRight = true;
    }

    // Thrust (always engaged when holding direction)
    const thrust = this.input.isKeyDown('ArrowRight') || this.input.isKeyDown('ArrowLeft') ||
                   this.input.isKeyDown('KeyD') || this.input.isKeyDown('KeyA');

    // Vertical
    const up = this.input.isKeyDown('ArrowUp') || this.input.isKeyDown('KeyW');
    const down = this.input.isKeyDown('ArrowDown') || this.input.isKeyDown('KeyS');

    this.world.updatePlayer(dt, thrust, up, down);

    // Thrust sound
    if (thrust && Math.abs(this.world.player.vx) > 50 * RENDER_SCALE) {
      this.sound.startThrust();
    } else {
      this.sound.stopThrust();
    }

    // Fire laser
    if (this.input.isKeyDown('Space')) {
      if (this.world.fireLaser()) {
        this.sound.playLaser();
      }
    }

    // Smart bomb
    if (this.input.isAnyKeyPressed('KeyZ') && this.smartBombs > 0) {
      this.smartBombs--;
      this.world.smartBomb();
      this.sound.playSmartBomb();
    }

    // Hyperspace
    if (this.input.isAnyKeyPressed('KeyX') || this.input.isAnyKeyPressed('ShiftLeft')) {
      this.sound.playHyperspace();
      // Random teleport with risk
      if (Math.random() < 0.15) {
        // Hyperspace death
        this.world.spawnExplosion(this.world.player.x, this.world.player.y, '#FFFFFF', 15);
        this.world.player.alive = false;
        this.sound.stopThrust();
        this.sound.playDeath();
        this.fsm.transition('death');
        return;
      }
      this.world.player.x = Math.random() * WORLD_WIDTH;
      this.world.player.y = PLAY_AREA_TOP + Math.random() * (GROUND_Y - PLAY_AREA_TOP - 50 * RENDER_SCALE);
      this.world.player.invulnerable = 1.0;
    }

    // Mute toggle
    if (this.input.isAnyKeyPressed('KeyM')) {
      this.sound.toggleMute();
    }

    // Carry humanoid: check if player is near ground to release
    if (this.carriedHumanoidIdx >= 0) {
      const h = this.world.humanoids[this.carriedHumanoidIdx];
      if (h.alive) {
        h.x = this.world.player.x;
        h.y = this.world.player.y + 15 * RENDER_SCALE;

        // Release near ground
        if (this.world.player.y > GROUND_Y - 40 * RENDER_SCALE) {
          h.y = GROUND_Y;
          h.grounded = true;
          h.falling = false;
          h.carriedBy = -1;
          this.addScore(SCORE_HUMANOID_RETURN);
          this.carriedHumanoidIdx = -1;
        }
      } else {
        this.carriedHumanoidIdx = -1;
      }
    }
  }

  // ── State registration ──────────────────────────────────────────

  private registerStates(): void {
    this.fsm.register('attract', {
      enter: (g) => {
        g.attractTime = 0;
        g.sound.stopAllLoops();
      },
      update: (g, dt) => {
        g.attractTime += dt / 1000;
        if (g.input.isAnyKeyPressed()) {
          g.sound.ensureContext();
          g.startNewGame();
          g.fsm.transition('playing');
        }
      },
      render: (g) => {
        g.renderer.renderAttract(g.highScore, g.attractTime);
      },
    });

    this.fsm.register('playing', {
      update: (g, dt) => {
        const dtSec = dt / 1000;

        g.handlePlayingInput(dt);

        // Spawn enemies
        g.spawnTimer -= dtSec;
        if (g.spawnTimer <= 0 && g.enemiesSpawned < g.waveEnemyTotal) {
          g.spawnWaveEnemy();
          g.spawnTimer = 1.0 + Math.random() * 2.0;
        }

        // Baiter timer — spawn baiters if wave takes too long
        g.baiterTimer -= dtSec;
        if (g.baiterTimer <= 0 && g.world.enemies.filter(e => e.alive).length > 0) {
          g.world.spawnEnemy(EnemyType.Baiter);
          g.baiterTimer = 10;
        }

        // Update world
        g.world.updateEnemies(dt);
        g.world.updateLasers(dt);
        g.world.updateMines(dt);
        g.world.updateHumanoids(dt);
        g.world.updateParticles(dt);

        // Laser hits
        const hit = g.world.checkLaserHits();
        if (hit) {
          g.addScore(g.scoreForEnemy(hit.type));
          g.world.spawnExplosion(hit.x, hit.y, g.enemyColor(hit.type), 10);
          g.sound.playExplosion();
        }

        // Player collision
        if (g.world.checkPlayerHits()) {
          g.world.spawnExplosion(g.world.player.x, g.world.player.y, '#FFFFFF', 15);
          g.world.player.alive = false;
          g.sound.stopThrust();
          g.sound.playDeath();

          // Release carried humanoid
          if (g.carriedHumanoidIdx >= 0 && g.carriedHumanoidIdx < g.world.humanoids.length) {
            const h = g.world.humanoids[g.carriedHumanoidIdx];
            h.falling = true;
            h.vy = 0;
          }
          g.carriedHumanoidIdx = -1;
          g.fsm.transition('death');
          return;
        }

        // Humanoid catch
        if (g.carriedHumanoidIdx < 0) {
          const caughtIdx = g.world.checkHumanoidCatch();
          if (caughtIdx >= 0) {
            g.carriedHumanoidIdx = caughtIdx;
            g.world.humanoids[caughtIdx].falling = false;
            g.world.humanoids[caughtIdx].carriedBy = -1;
            g.addScore(SCORE_HUMANOID_CATCH);
            g.sound.playHumanoidCatch();
          }
        }

        // Wave completion
        if (g.isWaveComplete()) {
          g.wave++;
          g.startWave();
        }
      },
      render: (g) => {
        g.renderer.renderPlaying(g.world, g.score, g.highScore, g.lives, g.smartBombs, g.wave);
      },
    });

    this.fsm.register('death', {
      enter: (g) => {
        g.stateTimer = 0;
      },
      update: (g, dt) => {
        g.stateTimer += dt;
        g.world.updateParticles(dt);
        g.world.updateEnemies(dt);
        g.world.updateHumanoids(dt);

        if (g.stateTimer >= 2000) {
          g.lives--;
          if (g.lives <= 0) {
            g.fsm.transition('gameOver');
          } else {
            g.smartBombs = SMART_BOMBS_PER_LIFE;
            g.world.player = g.world.createPlayer();
            g.world.lasers = [];
            g.carriedHumanoidIdx = -1;
            g.fsm.transition('playing');
          }
        }
      },
      render: (g) => {
        g.renderer.renderPlaying(g.world, g.score, g.highScore, g.lives, g.smartBombs, g.wave);
      },
    });

    this.fsm.register('gameOver', {
      enter: (g) => {
        g.stateTimer = 0;
        g.sound.stopAllLoops();
      },
      update: (g, dt) => {
        g.stateTimer += dt;
        if (g.stateTimer >= 2000 && g.input.isAnyKeyPressed()) {
          g.fsm.transition('attract');
        }
      },
      render: (g) => {
        g.renderer.renderGameOver(g.score, g.highScore);
      },
    });
  }

  // ── Canvas scaling ──────────────────────────────────────────────

  private scaleCanvas(): void {
    const scaleX = window.innerWidth / this.canvas.width;
    const scaleY = window.innerHeight / this.canvas.height;
    const scale = Math.min(scaleX, scaleY);
    this.canvas.style.width = `${this.canvas.width * scale}px`;
    this.canvas.style.height = `${this.canvas.height * scale}px`;
  }

  // ── Main loop ───────────────────────────────────────────────────

  private loop(time: number): void {
    const delta = time - this.lastTime;
    this.lastTime = time;
    this.accumulator += Math.min(delta, 100);

    while (this.accumulator >= FRAME_TIME) {
      this.fsm.update(FRAME_TIME);
      this.input.endFrame();
      this.accumulator -= FRAME_TIME;
    }

    this.fsm.render();
    requestAnimationFrame((t) => this.loop(t));
  }
}
