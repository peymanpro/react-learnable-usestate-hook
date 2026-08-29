import type { AdaptationDecisionResult } from "../core/AdaptationDecisionEngine.js";
import type { PredictionResult } from "../core/Prediction.js";
import type { SafetyConstraint } from "../core/SafetyConstraints.js";
import type { StateKey } from "../core/TransitionLearner.js";

export interface LearnableStateOptions<TState> {
  readonly keyOf?: (state: TState) => StateKey;
  readonly confidenceThreshold?: number;
  readonly safetyConstraints?: readonly SafetyConstraint<TState>[];
}

export interface LearnableStateLearning<TState> {
  readonly prediction: PredictionResult<TState> | null;
  readonly decision: AdaptationDecisionResult<TState> | null;
  readonly observations: number;
  readonly lastResult: "adapted" | "fallback" | null;
  readonly advance: () => "adapted" | "fallback";
}
