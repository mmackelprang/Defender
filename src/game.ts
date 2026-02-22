import { StateMachine } from './states/state-machine.js';
import { InputManager } from './core/input.js';
import { SoundManager } from './systems/sound.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, FRAME_TIME } from './core/constants.js';

export class Game {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly input: InputManager;
  readonly sound: SoundManager;
  readonly fsm: StateMachine<string, Game>;

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
    this.fsm = new StateMachine<string, Game>(this);

    this.scaleCanvas();
    window.addEventListener('resize', () => this.scaleCanvas());

    requestAnimationFrame((t) => this.loop(t));
  }

  private scaleCanvas(): void {
    const scaleX = window.innerWidth / this.canvas.width;
    const scaleY = window.innerHeight / this.canvas.height;
    const scale = Math.min(scaleX, scaleY);
    this.canvas.style.width = `${this.canvas.width * scale}px`;
    this.canvas.style.height = `${this.canvas.height * scale}px`;
  }

  private loop(time: number): void {
    const delta = time - this.lastTime;
    this.lastTime = time;
    this.accumulator += Math.min(delta, 100);

    while (this.accumulator >= FRAME_TIME) {
      this.fsm.update(FRAME_TIME);
      this.accumulator -= FRAME_TIME;
    }

    this.fsm.render();
    requestAnimationFrame((t) => this.loop(t));
  }
}
