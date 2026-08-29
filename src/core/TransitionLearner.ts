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
  readonly maxUniqueTransitions?: number;
}

export class TransitionLearner<TState> {
  private readonly keyOf: (state: TState) => StateKey;
  private readonly maxUniqueTransitions: number;

  private readonly transitions = new Map<StateKey, Map<StateKey, number>>();
  private readonly states = new Map<StateKey, TState>();
  private readonly observationCounts = new Map<StateKey, number>();
  private uniqueTransitionCount = 0;

  constructor(options: TransitionLearnerOptions<TState>) {
    if (
      options.maxUniqueTransitions !== undefined &&
      (!Number.isInteger(options.maxUniqueTransitions) ||
        options.maxUniqueTransitions < 1)
    ) {
      throw new Error("maxUniqueTransitions must be a positive integer");
    }

    this.keyOf = options.keyOf;
    this.maxUniqueTransitions = options.maxUniqueTransitions ?? Infinity;
  }

  observe(previous: TState, current: TState): void {
    const previousKey = this.keyOf(previous);
    const currentKey = this.keyOf(current);

    let nextStates = this.transitions.get(previousKey);

    if (!nextStates) {
      if (this.uniqueTransitionCount >= this.maxUniqueTransitions) {
        return;
      }

      nextStates = new Map<StateKey, number>();
      this.transitions.set(previousKey, nextStates);
      this.observationCounts.set(previousKey, 0);
    }

    if (!nextStates.has(currentKey)) {
      if (this.uniqueTransitionCount >= this.maxUniqueTransitions) {
        return;
      }

      nextStates.set(currentKey, 1);
      this.uniqueTransitionCount += 1;
    } else {
      nextStates.set(currentKey, nextStates.get(currentKey)! + 1);
    }

    this.observationCounts.set(
      previousKey,
      (this.observationCounts.get(previousKey) ?? 0) + 1
    );

    this.states.set(currentKey, current);
  }

  getProbability(previous: TState, next: TState): number {
    const previousKey = this.keyOf(previous);
    const nextKey = this.keyOf(next);
    const nextStates = this.transitions.get(previousKey);

    if (!nextStates) {
      return 0;
    }

    const total = this.observationCounts.get(previousKey) ?? 0;

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

    const observations = this.observationCounts.get(previousKey) ?? 0;

    if (observations === 0) {
      return null;
    }

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
