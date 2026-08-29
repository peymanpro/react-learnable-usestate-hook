import { describe, expect, it } from "vitest";
import { AdaptationDecisionEngine } from "../src/core/AdaptationDecisionEngine.js";
import { DecisionPolicy } from "../src/core/DecisionPolicy.js";
import { SafetyConstraints } from "../src/core/SafetyConstraints.js";
import type { PredictionResult } from "../src/core/Prediction.js";

describe("AdaptationDecisionEngine", () => {
  it("falls back when confidence is below the policy threshold", () => {
    const engine = new AdaptationDecisionEngine<string>({
      policy: new DecisionPolicy({ confidenceThreshold: 0.8, marginThreshold: 0.3 }),
      safety: new SafetyConstraints<string>()
    });

    const prediction: PredictionResult<string> = {
      state: "search",
      probability: 0.7,
      runnerUpProbability: 0.3,
      margin: 0.4,
      observations: 10,
      confidence: 0.5
    };

    expect(engine.decide(prediction).decision).toBe("fallback");
  });

  it("falls back when prediction margin is too small", () => {
    const engine = new AdaptationDecisionEngine<string>({
      policy: new DecisionPolicy({ confidenceThreshold: 0.8, marginThreshold: 0.3 }),
      safety: new SafetyConstraints<string>()
    });

    const prediction: PredictionResult<string> = {
      state: "search",
      probability: 0.55,
      runnerUpProbability: 0.45,
      margin: 0.1,
      observations: 100,
      confidence: 0.9
    };

    expect(engine.decide(prediction).decision).toBe("fallback");
  });

  it("falls back when safety rejects a high-confidence prediction", () => {
    const engine = new AdaptationDecisionEngine<string>({
      policy: new DecisionPolicy({ confidenceThreshold: 0.8, marginThreshold: 0.3 }),
      safety: new SafetyConstraints<string>([state => state !== "blocked"])
    });

    const prediction: PredictionResult<string> = {
      state: "blocked",
      probability: 0.95,
      runnerUpProbability: 0.05,
      margin: 0.9,
      observations: 100,
      confidence: 0.9
    };

    const decision = engine.decide(prediction);

    expect(decision.decision).toBe("fallback");
    expect(decision.safetyAllowed).toBe(false);
  });

  it("returns adapt when confidence, margin, and safety all pass", () => {
    const engine = new AdaptationDecisionEngine<string>({
      policy: new DecisionPolicy({ confidenceThreshold: 0.8, marginThreshold: 0.3 }),
      safety: new SafetyConstraints<string>()
    });

    const prediction: PredictionResult<string> = {
      state: "search",
      probability: 0.95,
      runnerUpProbability: 0.05,
      margin: 0.9,
      observations: 100,
      confidence: 0.9
    };

    expect(engine.decide(prediction).decision).toBe("adapt");
    expect(engine.decide(prediction).safetyAllowed).toBe(true);
  });
});
