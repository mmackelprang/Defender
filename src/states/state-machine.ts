export interface State<TContext> {
  enter?(ctx: TContext): void;
  update?(ctx: TContext, dt: number): void;
  render?(ctx: TContext): void;
  exit?(ctx: TContext): void;
}

export class StateMachine<TKey extends string, TContext> {
  private states = new Map<TKey, State<TContext>>();
  private _currentKey: TKey | null = null;

  constructor(private context: TContext) {}

  get currentKey(): TKey | null {
    return this._currentKey;
  }

  register(key: TKey, state: State<TContext>): void {
    this.states.set(key, state);
  }

  transition(key: TKey): void {
    if (this._currentKey !== null) {
      this.states.get(this._currentKey)?.exit?.(this.context);
    }
    this._currentKey = key;
    this.states.get(key)?.enter?.(this.context);
  }

  update(dt: number): void {
    if (this._currentKey !== null) {
      this.states.get(this._currentKey)?.update?.(this.context, dt);
    }
  }

  render(): void {
    if (this._currentKey !== null) {
      this.states.get(this._currentKey)?.render?.(this.context);
    }
  }
}
