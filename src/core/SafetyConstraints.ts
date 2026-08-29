export type SafetyConstraint<TState> = (state: TState) => boolean;

export interface SafetyEvaluation<TState> {
  readonly state: TState;
  readonly allowed: boolean;
}

export class SafetyConstraints<TState> {
  private readonly constraints: readonly SafetyConstraint<TState>[];

  constructor(constraints: readonly SafetyConstraint<TState>[] = []) {
    this.constraints = [...constraints];
  }

  evaluate(state: TState): SafetyEvaluation<TState> {
    const allowed = this.constraints.every(constraint => constraint(state));

    return {
      state,
      allowed
    };
  }
}
