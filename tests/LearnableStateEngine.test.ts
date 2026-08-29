import { describe, expect, it } from "vitest";
import { AdaptationDecisionEngine } from "../src/core/AdaptationDecisionEngine.js";
import { AdaptationExecutor } from "../src/core/AdaptationExecutor.js";
import { DecisionPolicy } from "../src/core/DecisionPolicy.js";
import { LearnableStateEngine } from "../src/core/LearnableStateEngine.js";
import { SafetyConstraints } from "../src/core/SafetyConstraints.js";
import { TransitionLearner } from "../src/core/TransitionLearner.js";

function createEngine<TState>(
  keyOf: (state: TState) => string,
  confidenceThreshold = 0.2,
  constraints: readonly ((state: TState) => boolean)[] = []
) {
  const learner = new TransitionLearner<TState>({ keyOf });
  const policy = new DecisionPolicy({ confidenceThreshold });
  const safety = new SafetyConstraints<TState>(constraints);
  const decisionEngine = new AdaptationDecisionEngine<TState>({
    policy,
    safety
  });
  const executor = new AdaptationExecutor<TState>();

  return {
    learner,
    engine: new LearnableStateEngine({
      learner,
      decisionEngine,
      executor
    })
  };
}

describe("LearnableStateEngine", () => {
  it("returns fallback when no prediction is available", () => {
    const learner = new TransitionLearner<string>({
      keyOf: state => state
    });
    const policy = new DecisionPolicy({ confidenceThreshold: 0.8 });
    const safety = new SafetyConstraints<string>();
    const decisionEngine = new AdaptationDecisionEngine({ policy, safety });
    const executor = new AdaptationExecutor<string>();

    const engine = new LearnableStateEngine({
      learner,
      decisionEngine,
      executor
    });

    const evaluation = engine.evaluate("home");

    expect(evaluation.prediction).toBeNull();
    expect(evaluation.decision).toBeNull();
    expect(evaluation.result).toBe("fallback");
    expect(evaluation.state).toBe("home");
  });

  it("observes transitions and adapts when the prediction is accepted", () => {
    const { learner, engine } = createEngine<string>(
      state => state,
      0.2
    );

    learner.observe("home", "search");
    learner.observe("home", "search");
    learner.observe("home", "search");

    const evaluation = engine.evaluate("home");

    expect(evaluation.prediction?.state).toBe("search");
    expect(evaluation.prediction?.probability).toBe(1);
    expect(evaluation.decision?.decision).toBe("adapt");
    expect(evaluation.result).toBe("adapted");
    expect(evaluation.state).toBe("search");
  });

  it("falls back when the prediction fails the confidence policy", () => {
    const learner = new TransitionLearner<string>({
      keyOf: state => state
    });
    const policy = new DecisionPolicy({ confidenceThreshold: 0.9 });
    const safety = new SafetyConstraints<string>();
    const decisionEngine = new AdaptationDecisionEngine({ policy, safety });
    const executor = new AdaptationExecutor<string>();

    const engine = new LearnableStateEngine({
      learner,
      decisionEngine,
      executor
    });

    learner.observe("home", "search");

    const evaluation = engine.evaluate("home");

    expect(evaluation.prediction?.state).toBe("search");
    expect(evaluation.decision?.decision).toBe("fallback");
    expect(evaluation.result).toBe("fallback");
    expect(evaluation.state).toBe("home");
  });

  it("falls back when safety rejects the predicted state", () => {
    const learner = new TransitionLearner<string>({
      keyOf: state => state
    });
    const policy = new DecisionPolicy({ confidenceThreshold: 0.2 });
    const safety = new SafetyConstraints<string>([
      state => state !== "blocked"
    ]);
    const decisionEngine = new AdaptationDecisionEngine({ policy, safety });
    const executor = new AdaptationExecutor<string>();

    const engine = new LearnableStateEngine({
      learner,
      decisionEngine,
      executor
    });

    learner.observe("home", "blocked");
    learner.observe("home", "blocked");
    learner.observe("home", "blocked");

    const evaluation = engine.evaluate("home");

    expect(evaluation.prediction?.state).toBe("blocked");
    expect(evaluation.decision?.decision).toBe("fallback");
    expect(evaluation.decision?.safetyAllowed).toBe(false);
    expect(evaluation.result).toBe("fallback");
    expect(evaluation.state).toBe("home");
  });
});
