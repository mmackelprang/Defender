export class InputManager {
  private keys = new Set<string>();
  private anyKeyFlag = false;

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    this.anyKeyFlag = true;

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space',
         'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyX', 'ShiftLeft'].includes(e.code)) {
      e.preventDefault();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  isAnyKeyPressed(): boolean {
    if (this.anyKeyFlag) {
      this.anyKeyFlag = false;
      return true;
    }
    return false;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}
