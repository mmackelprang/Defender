/** Defender native resolution */
export const NATIVE_WIDTH = 292;
export const NATIVE_HEIGHT = 240;

export const RENDER_SCALE = 3;
export const CANVAS_WIDTH = NATIVE_WIDTH * RENDER_SCALE;   // 876
export const CANVAS_HEIGHT = NATIVE_HEIGHT * RENDER_SCALE;  // 720

export const TARGET_FPS = 60;
export const FRAME_TIME = 1000 / TARGET_FPS;

/** World dimensions */
export const WORLD_WIDTH_SCREENS = 7;
export const WORLD_WIDTH = NATIVE_WIDTH * WORLD_WIDTH_SCREENS * RENDER_SCALE;
export const NUM_HUMANOIDS = 10;

/** Scanner (minimap at top of screen) */
export const SCANNER_HEIGHT = 22 * RENDER_SCALE;
export const PLAY_AREA_TOP = SCANNER_HEIGHT + 4 * RENDER_SCALE;
export const GROUND_Y = CANVAS_HEIGHT - 30 * RENDER_SCALE;

/** Player physics */
export const PLAYER_THRUST = 500 * RENDER_SCALE;
export const PLAYER_MAX_SPEED = 350 * RENDER_SCALE;
export const PLAYER_DECEL = 250 * RENDER_SCALE;
export const PLAYER_VERT_SPEED = 200 * RENDER_SCALE;
export const LASER_SPEED = 800 * RENDER_SCALE;
export const LASER_LENGTH = 30 * RENDER_SCALE;
export const LASER_LIFETIME = 0.4;
export const SMART_BOMBS_PER_LIFE = 3;
export const FIRE_COOLDOWN = 0.1;

/** Enemy speeds (in render-scaled pixels/sec) */
export const LANDER_SPEED = 50 * RENDER_SCALE;
export const LANDER_DESCENT_SPEED = 30 * RENDER_SCALE;
export const MUTANT_SPEED = 120 * RENDER_SCALE;
export const BAITER_SPEED = 180 * RENDER_SCALE;
export const BOMBER_SPEED = 40 * RENDER_SCALE;
export const POD_SPEED = 35 * RENDER_SCALE;
export const SWARMER_SPEED = 160 * RENDER_SCALE;

/** Enemy sizes (radius) */
export const ENEMY_RADIUS = 8 * RENDER_SCALE;
export const HUMANOID_RADIUS = 6 * RENDER_SCALE;
export const PLAYER_RADIUS = 10 * RENDER_SCALE;

/** Colors — Defender's distinctive palette */
export const COLORS = {
  background: '#000000',
  terrain: '#00AA00',
  terrainBright: '#00DD00',
  player: '#FFFFFF',
  playerThrust: '#FF8800',
  laser: '#FFFFFF',
  lander: '#00FF00',
  mutant: '#FF00FF',
  baiter: '#FFFF00',
  bomber: '#FF0000',
  pod: '#00FFFF',
  swarmer: '#FF8800',
  humanoid: '#00FF00',
  humanoidCarried: '#FF8800',
  scanner: '#001133',
  scannerBorder: '#0066CC',
  scannerPlayer: '#FFFFFF',
  scannerEnemy: '#FF0000',
  scannerHumanoid: '#00FF00',
  text: '#FFFFFF',
  explosion: '#FFFF00',
  mine: '#FF4444',
};

/** Scoring */
export const SCORE_LANDER = 150;
export const SCORE_MUTANT = 150;
export const SCORE_BAITER = 200;
export const SCORE_BOMBER = 250;
export const SCORE_POD = 1000;
export const SCORE_SWARMER = 150;
export const SCORE_HUMANOID_CATCH = 500;
export const SCORE_HUMANOID_RETURN = 500;
export const SCORE_EXTRA_LIFE = 10000;

/** Wave configuration */
export const WAVE_CONFIGS = [
  { landers: 5,  bombers: 0, pods: 0 },
  { landers: 8,  bombers: 1, pods: 0 },
  { landers: 10, bombers: 2, pods: 1 },
  { landers: 12, bombers: 3, pods: 2 },
  { landers: 15, bombers: 4, pods: 3 },
];
