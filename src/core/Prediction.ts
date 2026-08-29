export interface PredictionResult<TState> {
  readonly state: TState;
  readonly probability: number;
  readonly observations: number;
  readonly confidence: number;
}
