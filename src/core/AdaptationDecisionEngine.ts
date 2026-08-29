import type { PredictionResult } from "./Prediction.js";
import { DecisionPolicy } from "./DecisionPolicy.js";
import type { SafetyConstraints } from "./SafetyConstraints.js";

export interface AdaptationDecisionResult<TState> {
  readonly prediction: PredictionResult<TState>;
  readonly decision: "adapt" | "fallback";
  readonly safetyAllowed: boolean;
}

export interface AdaptationDecisionEngineOptions<TState> {
  readonly policy: DecisionPolicy;
  readonly safety: SafetyConstraints<TState>;
}

export class AdaptationDecisionEngine<TState> {
  private readonly policy: DecisionPolicy;
  private readonly safety: SafetyConstraints<TState>;

  constructor(options: AdaptationDecisionEngineOptions<TState>) {
    this.policy = options.policy;
    this.safety = options.safety;
  }

  decide(prediction: PredictionResult<TState>): AdaptationDecisionResult<TState> {
    const policyDecision = this.policy.decide(prediction.confidence);
    const safetyEvaluation = this.safety.evaluate(prediction.state);

    const shouldAdapt =
      policyDecision === "adapt" && safetyEvaluation.allowed;

    return {
      prediction,
      decision: shouldAdapt ? "adapt" : "fallback",
      safetyAllowed: safetyEvaluation.allowed
    };
  }
}
