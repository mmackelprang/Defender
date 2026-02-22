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
export const WORLD_WIDTH = NATIVE_WIDTH * WORLD_WIDTH_SCREENS;
export const NUM_HUMANOIDS = 10;

/** Scanner (minimap at top of screen) */
export const SCANNER_HEIGHT = 20;

/** Player physics */
export const PLAYER_THRUST = 400;
export const PLAYER_MAX_SPEED = 300;
export const PLAYER_DECEL = 200;
export const LASER_SPEED = 600;
export const SMART_BOMBS_PER_LIFE = 3;

/** Colors — Defender's distinctive palette */
export const COLORS = {
  background: '#000000',
  terrain: '#00AA00',
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
  scanner: '#0044AA',
  scannerPlayer: '#FFFFFF',
  scannerEnemy: '#FF0000',
  scannerHumanoid: '#00FF00',
  text: '#FFFFFF',
  scoreText: '#FFFFFF',
};

/** Scoring */
export const SCORE_LANDER = 150;
export const SCORE_MUTANT = 150;
export const SCORE_BAITER = 200;
export const SCORE_BOMBER = 250;
export const SCORE_POD = 1000;
export const SCORE_SWARMER = 150;
export const SCORE_HUMANOID_CATCH = 500;  // catching falling human
export const SCORE_HUMANOID_RETURN = 500; // plus 500 for returning to ground
export const SCORE_EXTRA_LIFE = 10000;
