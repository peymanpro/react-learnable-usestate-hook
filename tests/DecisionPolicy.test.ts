import { describe, expect, it } from "vitest";
import { DecisionPolicy } from "../src/core/DecisionPolicy.js";

describe("DecisionPolicy", () => {
  it("adapts when confidence reaches the threshold", () => {
    const policy = new DecisionPolicy({
      confidenceThreshold: 0.8
    });

    expect(policy.decide(0.8)).toBe("adapt");
    expect(policy.decide(0.9)).toBe("adapt");
  });

  it("falls back when confidence is below the threshold", () => {
    const policy = new DecisionPolicy({
      confidenceThreshold: 0.8
    });

    expect(policy.decide(0.79)).toBe("fallback");
    expect(policy.decide(0)).toBe("fallback");
  });

  it("allows threshold zero", () => {
    const policy = new DecisionPolicy({
      confidenceThreshold: 0
    });

    expect(policy.decide(0)).toBe("adapt");
  });

  it("allows threshold one", () => {
    const policy = new DecisionPolicy({
      confidenceThreshold: 1
    });

    expect(policy.decide(1)).toBe("adapt");
    expect(policy.decide(0.999)).toBe("fallback");
  });

  it("rejects an invalid threshold", () => {
    expect(() => new DecisionPolicy({
      confidenceThreshold: -0.1
    })).toThrow();

    expect(() => new DecisionPolicy({
      confidenceThreshold: 1.1
    })).toThrow();
  });

  it("rejects invalid confidence values", () => {
    const policy = new DecisionPolicy({
      confidenceThreshold: 0.8
    });

    expect(() => policy.decide(-0.1)).toThrow();
    expect(() => policy.decide(1.1)).toThrow();
  });
});
