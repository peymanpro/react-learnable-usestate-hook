export interface PredictionResult<TState> {
  readonly state: TState;
  readonly probability: number;
  readonly runnerUpProbability: number;
  readonly margin: number;
  readonly observations: number;
  readonly confidence: number;
}
