import { describe, expect, it } from "vitest";
import { AdaptationExecutor } from "../src/core/AdaptationExecutor.js";

describe("AdaptationExecutor", () => {
  it("applies the predicted state when adaptation is accepted", () => {
    const executor = new AdaptationExecutor<string>({
      fallback: () => "home"
    });

    expect(executor.execute("adapt", "search")).toEqual({
      result: "adapted",
      state: "search"
    });
  });

  it("uses deterministic fallback when adaptation is rejected", () => {
    const executor = new AdaptationExecutor<string>({
      fallback: () => "home"
    });

    expect(executor.execute("fallback", "search")).toEqual({
      result: "fallback",
      state: "home"
    });
  });

  it("evaluates the fallback lazily", () => {
    let fallbackCalls = 0;

    const executor = new AdaptationExecutor<number>({
      fallback: () => {
        fallbackCalls += 1;
        return 42;
      }
    });

    expect(fallbackCalls).toBe(0);

    executor.execute("adapt", 10);

    expect(fallbackCalls).toBe(0);

    executor.execute("fallback", 10);

    expect(fallbackCalls).toBe(1);
  });
});
