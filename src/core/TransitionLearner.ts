export type StateKey = string;

export interface TransitionPrediction {
  readonly state: StateKey;
  readonly probability: number;
}

export class TransitionLearner {
  private readonly transitions = new Map<StateKey, Map<StateKey, number>>();

  observe(previous: StateKey, current: StateKey): void {
    let nextStates = this.transitions.get(previous);

    if (!nextStates) {
      nextStates = new Map<StateKey, number>();
      this.transitions.set(previous, nextStates);
    }

    nextStates.set(current, (nextStates.get(current) ?? 0) + 1);
  }

  getProbability(previous: StateKey, next: StateKey): number {
    const nextStates = this.transitions.get(previous);

    if (!nextStates) {
      return 0;
    }

    const total = Array.from(nextStates.values())
      .reduce((sum, count) => sum + count, 0);

    if (total === 0) {
      return 0;
    }

    return (nextStates.get(next) ?? 0) / total;
  }

  predictNext(previous: StateKey): TransitionPrediction | null {
    const nextStates = this.transitions.get(previous);

    if (!nextStates || nextStates.size === 0) {
      return null;
    }

    let bestState: StateKey | null = null;
    let bestCount = -1;

    for (const [state, count] of nextStates) {
      if (count > bestCount) {
        bestState = state;
        bestCount = count;
      }
    }

    if (bestState === null) {
      return null;
    }

    const total = Array.from(nextStates.values())
      .reduce((sum, count) => sum + count, 0);

    return {
      state: bestState,
      probability: bestCount / total
    };
  }
}
