import { describe, expect, it } from "vitest";
import { AdaptationDecisionEngine } from "../src/core/AdaptationDecisionEngine.js";
import { DecisionPolicy } from "../src/core/DecisionPolicy.js";
import { SafetyConstraints } from "../src/core/SafetyConstraints.js";
import type { PredictionResult } from "../src/core/Prediction.js";

describe("AdaptationDecisionEngine", () => {
  it("falls back when confidence is below the policy threshold", () => {
    const engine = new AdaptationDecisionEngine<string>({
      policy: new DecisionPolicy({ confidenceThreshold: 0.8 }),
      safety: new SafetyConstraints<string>()
    });

    const prediction: PredictionResult<string> = {
      state: "search",
      probability: 0.7,
      observations: 10,
      confidence: 0.5
    };

    expect(engine.decide(prediction)).toEqual({
      prediction,
      decision: "fallback",
      safetyAllowed: true
    });
  });

  it("falls back when safety rejects a high-confidence prediction", () => {
    const engine = new AdaptationDecisionEngine<string>({
      policy: new DecisionPolicy({ confidenceThreshold: 0.8 }),
      safety: new SafetyConstraints<string>([
        state => state !== "blocked"
      ])
    });

    const prediction: PredictionResult<string> = {
      state: "blocked",
      probability: 0.95,
      observations: 100,
      confidence: 0.9
    };

    expect(engine.decide(prediction)).toEqual({
      prediction,
      decision: "fallback",
      safetyAllowed: false
    });
  });

  it("returns adapt when confidence and safety requirements pass", () => {
    const engine = new AdaptationDecisionEngine<string>({
      policy: new DecisionPolicy({ confidenceThreshold: 0.8 }),
      safety: new SafetyConstraints<string>([
        state => state !== "blocked"
      ])
    });

    const prediction: PredictionResult<string> = {
      state: "search",
      probability: 0.95,
      observations: 100,
      confidence: 0.9
    };

    expect(engine.decide(prediction)).toEqual({
      prediction,
      decision: "adapt",
      safetyAllowed: true
    });
  });
});
 
it("adapts when confidence is exactly at the threshold", () => {
  const engine = new AdaptationDecisionEngine<string>({
    policy: new DecisionPolicy({ confidenceThreshold: 0.8 }),
    safety: new SafetyConstraints<string>()
  });
 
  const prediction: PredictionResult<string> = {
    state: "search",
    probability: 0.9,
    observations: 50,
    confidence: 0.8
  };
 
  expect(engine.decide(prediction).decision).toBe("adapt");
});
