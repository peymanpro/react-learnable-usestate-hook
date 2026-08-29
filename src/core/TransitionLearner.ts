import { wilsonLowerBound } from "./Confidence.js";

export type StateKey = string | number;

export interface TransitionPrediction<TState> {
  readonly state: TState;
  readonly probability: number;
  readonly observations: number;
  readonly confidence: number;
}

export interface TransitionLearnerOptions<TState> {
  readonly keyOf: (state: TState) => StateKey;
}

export class TransitionLearner<TState> {
  private readonly keyOf: (state: TState) => StateKey;

  private readonly transitions = new Map<StateKey, Map<StateKey, number>>();
  private readonly states = new Map<StateKey, TState>();

  constructor(options: TransitionLearnerOptions<TState>) {
    this.keyOf = options.keyOf;
  }

  observe(previous: TState, current: TState): void {
    const previousKey = this.keyOf(previous);
    const currentKey = this.keyOf(current);

    this.states.set(previousKey, previous);
    this.states.set(currentKey, current);

    let nextStates = this.transitions.get(previousKey);

    if (!nextStates) {
      nextStates = new Map<StateKey, number>();
      this.transitions.set(previousKey, nextStates);
    }

    nextStates.set(currentKey, (nextStates.get(currentKey) ?? 0) + 1);
  }

  getProbability(previous: TState, next: TState): number {
    const previousKey = this.keyOf(previous);
    const nextKey = this.keyOf(next);
    const nextStates = this.transitions.get(previousKey);

    if (!nextStates) {
      return 0;
    }

    const total = Array.from(nextStates.values()).reduce((sum, count) => sum + count, 0);

    if (total === 0) {
      return 0;
    }

    return (nextStates.get(nextKey) ?? 0) / total;
  }

  predictNext(previous: TState): TransitionPrediction<TState> | null {
    const previousKey = this.keyOf(previous);
    const nextStates = this.transitions.get(previousKey);

    if (!nextStates || nextStates.size === 0) {
      return null;
    }

    let bestKey: StateKey | null = null;
    let bestCount = -1;

    for (const [stateKey, count] of nextStates) {
      if (count > bestCount) {
        bestKey = stateKey;
        bestCount = count;
      }
    }

    if (bestKey === null) {
      return null;
    }

    const state = this.states.get(bestKey);

    if (state === undefined) {
      return null;
    }

    const observations = Array.from(nextStates.values()).reduce((sum, count) => sum + count, 0);
    const probability = bestCount / observations;
    const confidence = wilsonLowerBound(bestCount, observations);

    return {
      state,
      probability,
      observations,
      confidence
    };
  }
}
