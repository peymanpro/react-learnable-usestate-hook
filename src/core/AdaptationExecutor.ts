export type AdaptationResult = "adapted" | "fallback";

export interface AdaptationExecutorResult<TState> {
  readonly result: AdaptationResult;
  readonly state: TState;
}

export interface AdaptationExecutorOptions<TState> {
  readonly fallback: () => TState;
}

export class AdaptationExecutor<TState> {
  private readonly fallback: () => TState;

  constructor(options: AdaptationExecutorOptions<TState>) {
    this.fallback = options.fallback;
  }

  execute(
    decision: "adapt" | "fallback",
    predictedState: TState
  ): AdaptationExecutorResult<TState> {
    if (decision === "adapt") {
      return {
        result: "adapted",
        state: predictedState
      };
    }

    return {
      result: "fallback",
      state: this.fallback()
    };
  }
}
