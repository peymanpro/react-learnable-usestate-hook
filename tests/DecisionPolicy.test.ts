import { describe, expect, it } from "vitest";
import { DecisionPolicy } from "../src/core/DecisionPolicy.js";

describe("DecisionPolicy", () => {
  it("adapts when confidence and margin reach their thresholds", () => {
    const policy = new DecisionPolicy({
      confidenceThreshold: 0.8,
      marginThreshold: 0.3
    });

    expect(policy.decide({ confidence: 0.8, margin: 0.3 })).toBe("adapt");
    expect(policy.decide({ confidence: 0.9, margin: 0.5 })).toBe("adapt");
  });

  it("falls back when confidence is below the threshold", () => {
    const policy = new DecisionPolicy({
      confidenceThreshold: 0.8,
      marginThreshold: 0.3
    });

    expect(policy.decide({ confidence: 0.79, margin: 0.9 })).toBe("fallback");
  });

  it("falls back when margin is below the threshold", () => {
    const policy = new DecisionPolicy({
      confidenceThreshold: 0.8,
      marginThreshold: 0.3
    });

    expect(policy.decide({ confidence: 0.95, margin: 0.29 })).toBe("fallback");
  });

  it("defaults margin threshold to zero", () => {
    const policy = new DecisionPolicy({
      confidenceThreshold: 0.8
    });

    expect(policy.decide({ confidence: 0.8, margin: 0 })).toBe("adapt");
  });

  it("allows zero and one thresholds", () => {
    const policy = new DecisionPolicy({
      confidenceThreshold: 1,
      marginThreshold: 1
    });

    expect(policy.decide({ confidence: 1, margin: 1 })).toBe("adapt");
    expect(policy.decide({ confidence: 0.999, margin: 1 })).toBe("fallback");
    expect(policy.decide({ confidence: 1, margin: 0.999 })).toBe("fallback");
  });

  it("rejects invalid thresholds and inputs", () => {
    expect(() => new DecisionPolicy({ confidenceThreshold: -0.1 })).toThrow();
    expect(() => new DecisionPolicy({ confidenceThreshold: 1.1 })).toThrow();
    expect(() => new DecisionPolicy({ confidenceThreshold: 0.5, marginThreshold: -0.1 })).toThrow();
    expect(() => new DecisionPolicy({ confidenceThreshold: 0.5, marginThreshold: 1.1 })).toThrow();

    const policy = new DecisionPolicy({ confidenceThreshold: 0.8 });

    expect(() => policy.decide({ confidence: -0.1, margin: 0.5 })).toThrow();
    expect(() => policy.decide({ confidence: 0.8, margin: -0.1 })).toThrow();
    expect(() => policy.decide({ confidence: 1.1, margin: 0.5 })).toThrow();
    expect(() => policy.decide({ confidence: 0.8, margin: 1.1 })).toThrow();
  });
});
