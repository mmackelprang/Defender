export class InputManager {
  private keys = new Set<string>();
  private justPressed = new Set<string>();
  private anyKeyFlag = false;

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.keys.has(e.code)) {
      this.justPressed.add(e.code);
    }
    this.keys.add(e.code);
    this.anyKeyFlag = true;

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space',
         'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyX', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
      e.preventDefault();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  isAnyKeyPressed(code?: string): boolean {
    if (code !== undefined) {
      return this.justPressed.has(code);
    }
    return this.anyKeyFlag;
  }

  endFrame(): void {
    this.justPressed.clear();
    this.anyKeyFlag = false;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}
