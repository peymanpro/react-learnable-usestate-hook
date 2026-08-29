export type AdaptationResult = "adapted" | "fallback";

export interface AdaptationExecutorResult<TState> {
  readonly result: AdaptationResult;
  readonly state: TState;
}

export class AdaptationExecutor<TState> {
  execute(
    decision: "adapt" | "fallback",
    predictedState: TState,
    fallbackState: TState
  ): AdaptationExecutorResult<TState> {
    if (decision === "adapt") {
      return {
        result: "adapted",
        state: predictedState
      };
    }

    return {
      result: "fallback",
      state: fallbackState
    };
  }
}
