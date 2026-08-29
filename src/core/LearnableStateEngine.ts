import type { PredictionResult } from "./Prediction.js";
import { AdaptationDecisionEngine } from "./AdaptationDecisionEngine.js";
import { AdaptationExecutor } from "./AdaptationExecutor.js";
import { TransitionLearner } from "./TransitionLearner.js";
import type { AdaptationDecisionResult } from "./AdaptationDecisionEngine.js";

export interface LearnableStateEvaluation<TState> {
  readonly prediction: PredictionResult<TState> | null;
  readonly decision: AdaptationDecisionResult<TState> | null;
  readonly result: "adapted" | "fallback";
  readonly state: TState;
}

export interface LearnableStateEngineOptions<TState> {
  readonly learner: TransitionLearner<TState>;
  readonly decisionEngine: AdaptationDecisionEngine<TState>;
  readonly executor: AdaptationExecutor<TState>;
}

export class LearnableStateEngine<TState> {
  private readonly learner: TransitionLearner<TState>;
  private readonly decisionEngine: AdaptationDecisionEngine<TState>;
  private readonly executor: AdaptationExecutor<TState>;

  constructor(options: LearnableStateEngineOptions<TState>) {
    this.learner = options.learner;
    this.decisionEngine = options.decisionEngine;
    this.executor = options.executor;
  }

  observe(previous: TState, current: TState): void {
    this.learner.observe(previous, current);
  }

  evaluate(currentState: TState): LearnableStateEvaluation<TState> {
    const prediction = this.learner.predictNext(currentState);

    if (!prediction) {
      const fallback = this.executor.execute("fallback", currentState);

      return {
        prediction: null,
        decision: null,
        result: fallback.result,
        state: fallback.state
      };
    }

    const decision = this.decisionEngine.decide(prediction);
    const execution = this.executor.execute(decision.decision, prediction.state);

    return {
      prediction,
      decision,
      result: execution.result,
      state: execution.state
    };
  }
}
