import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useLearnableState } from "../src/index.js";

describe("useLearnableState", () => {
  it("preserves useState-compatible behavior", () => {
    const { result } = renderHook(() => useLearnableState(0));

    expect(result.current[0]).toBe(0);

    act(() => { result.current[1](5); });
    expect(result.current[0]).toBe(5);

    act(() => { result.current[1](value => value + 5); });
    expect(result.current[0]).toBe(10);
  });

  it("rejects adaptation when prediction margin is below the threshold", () => {
    const { result } = renderHook(() => useLearnableState("home", {
      confidenceThreshold: 0.1,
      marginThreshold: 0.6
    }));

    act(() => { result.current[1]("search"); });
    act(() => { result.current[1]("home"); });
    act(() => { result.current[1]("profile"); });
    act(() => { result.current[1]("home"); });

    expect(result.current[2].prediction?.probability).toBe(0.5);
    expect(result.current[2].prediction?.runnerUpProbability).toBe(0.5);
    expect(result.current[2].prediction?.margin).toBe(0);
    expect(result.current[2].decision?.decision).toBe("fallback");
  });

  it("rejects a balanced prediction even when confidence is sufficient", () => {
    const { result } = renderHook(() => useLearnableState("home", {
      confidenceThreshold: 0.5,
      marginThreshold: 0.4
    }));

    act(() => { result.current[1]("search"); });
    act(() => { result.current[1]("home"); });
    act(() => { result.current[1]("profile"); });
    act(() => { result.current[1]("home"); });

    expect(result.current[2].prediction?.probability).toBe(0.5);
    expect(result.current[2].prediction?.runnerUpProbability).toBe(0.5);
    expect(result.current[2].prediction?.margin).toBe(0);
    expect(result.current[2].prediction?.confidence).toBeGreaterThan(0);
    expect(result.current[2].decision?.decision).toBe("fallback");
  });

  it("accepts a dominant prediction when confidence and margin pass", () => {
    const { result } = renderHook(() => useLearnableState("home", {
      confidenceThreshold: 0.1,
      marginThreshold: 0.5
    }));

    act(() => { result.current[1]("search"); });
    act(() => { result.current[1]("home"); });
    act(() => { result.current[1]("search"); });
    act(() => { result.current[1]("home"); });
    act(() => { result.current[1]("profile"); });
    act(() => { result.current[1]("home"); });

    expect(result.current[2].prediction?.state).toBe("search");
    expect(result.current[2].prediction?.probability).toBeCloseTo(2 / 3);
    expect(result.current[2].prediction?.runnerUpProbability).toBeCloseTo(1 / 3);
    expect(result.current[2].prediction?.margin).toBeCloseTo(1 / 3);
    expect(result.current[2].decision?.decision).toBe("fallback");
  });

  it("preserves learned state across rerenders", () => {
    const { result, rerender } = renderHook(() => useLearnableState("home", {
      confidenceThreshold: 0.1
    }));

    act(() => { result.current[1]("search"); });
    act(() => { result.current[1]("home"); });

    expect(result.current[2].prediction?.state).toBe("search");
    expect(result.current[2].prediction?.observations).toBe(1);

    rerender();

    expect(result.current[2].prediction?.state).toBe("search");
    expect(result.current[2].prediction?.observations).toBe(1);
  });

  it("supports object states with a custom key function", () => {
    type Page = { id: string; title: string };
    const home = { id: "home", title: "Home" };
    const search = { id: "search", title: "Search" };

    const { result } = renderHook(() => useLearnableState<Page>(home, {
      keyOf: page => page.id,
      confidenceThreshold: 0.1
    }));

    act(() => { result.current[1](search); });
    act(() => { result.current[1](home); });

    expect(result.current[2].prediction?.state).toEqual(search);
  });
});
