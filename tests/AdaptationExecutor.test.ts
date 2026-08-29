import { describe, expect, it } from "vitest";
import { AdaptationExecutor } from "../src/core/AdaptationExecutor.js";

describe("AdaptationExecutor", () => {
  it("applies the predicted state when adaptation is accepted", () => {
    const executor = new AdaptationExecutor<string>();

    expect(executor.execute("adapt", "search", "home")).toEqual({
      result: "adapted",
      state: "search"
    });
  });

  it("uses the current deterministic state when adaptation is rejected", () => {
    const executor = new AdaptationExecutor<string>();

    expect(executor.execute("fallback", "search", "home")).toEqual({
      result: "fallback",
      state: "home"
    });
  });

  it("uses the fallback state supplied for each evaluation", () => {
    const executor = new AdaptationExecutor<number>();

    expect(executor.execute("fallback", 10, 42).state).toBe(42);
    expect(executor.execute("fallback", 20, 7).state).toBe(7);
  });
});
