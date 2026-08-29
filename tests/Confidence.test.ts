import { describe, expect, it } from "vitest";
import { estimateConfidence, wilsonLowerBound } from "../src/core/Confidence.js";

describe("wilsonLowerBound", () => {
  it("returns zero when there are no observations", () => {
    expect(wilsonLowerBound(0, 0)).toBe(0);
  });

  it("returns a bounded value for zero successes", () => {
    const lowerBound = wilsonLowerBound(0, 10);

    expect(lowerBound).toBeGreaterThanOrEqual(0);
    expect(lowerBound).toBeLessThanOrEqual(1);
  });

  it("returns a bounded value for all successes", () => {
    const lowerBound = wilsonLowerBound(10, 10);

    expect(lowerBound).toBeGreaterThan(0);
    expect(lowerBound).toBeLessThanOrEqual(1);
  });

  it("distinguishes evidence size when the observed proportion is equal", () => {
    const smallSample = wilsonLowerBound(9, 10);
    const largeSample = wilsonLowerBound(900, 1000);

    expect(largeSample).toBeGreaterThan(smallSample);
  });

  it("increases the lower bound when stronger evidence supports the same proportion", () => {
    const smallSample = wilsonLowerBound(9, 10);
    const mediumSample = wilsonLowerBound(90, 100);
    const largeSample = wilsonLowerBound(900, 1000);

    expect(mediumSample).toBeGreaterThan(smallSample);
    expect(largeSample).toBeGreaterThan(mediumSample);
  });

  it("rejects invalid counts", () => {
    expect(() => wilsonLowerBound(-1, 10)).toThrow();
    expect(() => wilsonLowerBound(11, 10)).toThrow();
    expect(() => wilsonLowerBound(1, -10)).toThrow();
  });
});

describe("estimateConfidence", () => {
  it("returns probability and confidence information", () => {
    const result = estimateConfidence(9, 10);

    expect(result.successes).toBe(9);
    expect(result.observations).toBe(10);
    expect(result.probability).toBeCloseTo(0.9);
    expect(result.lowerBound).toBeGreaterThan(0);
    expect(result.lowerBound).toBeLessThan(0.9);
  });
});
