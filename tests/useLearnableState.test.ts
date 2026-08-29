import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useLearnableState } from "../src/index.js";

describe("useLearnableState", () => {
  it("preserves useState-compatible behavior", () => {
    const { result } = renderHook(() => useLearnableState(0));

    expect(result.current[0]).toBe(0);

    act(() => {
      result.current[1](5);
    });

    expect(result.current[0]).toBe(5);

    act(() => {
      result.current[1](value => value + 5);
    });

    expect(result.current[0]).toBe(10);
  });

  it("learns committed state transitions", () => {
    const { result } = renderHook(() => useLearnableState("home", {
      confidenceThreshold: 0.1
    }));

    act(() => {
      result.current[1]("search");
    });

    act(() => {
      result.current[1]("home");
    });

    expect(result.current[2].prediction?.state).toBe("search");
    expect(result.current[2].prediction?.probability).toBe(1);
    expect(result.current[2].prediction?.observations).toBe(1);
    expect(result.current[2].decision?.decision).toBe("adapt");
  });

  it("preserves functional update semantics", () => {
    const { result } = renderHook(() => useLearnableState(0));

    act(() => {
      result.current[1](value => value + 1);
      result.current[1](value => value + 1);
    });

    expect(result.current[0]).toBe(2);
  });

  it("does not learn a transition for an unchanged state", () => {
    const { result } = renderHook(() => useLearnableState("home", {
      confidenceThreshold: 0.1
    }));

    act(() => {
      result.current[1]("home");
    });

    expect(result.current[2].prediction).toBeNull();
    expect(result.current[2].observations).toBe(0);
  });

  it("preserves learned transitions across rerenders", () => {
    let rerenderCount = 0;

    const { result, rerender } = renderHook(() => {
      rerenderCount += 1;
      return useLearnableState("home", {
        confidenceThreshold: 0.1
      });
    });

    act(() => {
      result.current[1]("search");
    });

    act(() => {
      result.current[1]("home");
    });

    expect(result.current[2].prediction?.state).toBe("search");
    expect(result.current[2].prediction?.observations).toBe(1);

    rerender();

    expect(rerenderCount).toBeGreaterThan(2);
    expect(result.current[2].prediction?.state).toBe("search");
    expect(result.current[2].prediction?.observations).toBe(1);
  });

  it("advances to a learned state when policy and safety allow it", () => {
    const { result } = renderHook(() => useLearnableState("home", {
      confidenceThreshold: 0.1,
      safetyConstraints: [state => state !== "blocked"]
    }));

    act(() => {
      result.current[1]("search");
    });

    act(() => {
      result.current[1]("home");
    });

    act(() => {
      expect(result.current[2].advance()).toBe("adapted");
    });

    expect(result.current[0]).toBe("search");
  });

  it("rejects a predicted state through safety constraints", () => {
    const { result } = renderHook(() => useLearnableState("home", {
      confidenceThreshold: 0.1,
      safetyConstraints: [state => state !== "blocked"]
    }));

    act(() => {
      result.current[1]("blocked");
    });

    act(() => {
      result.current[1]("home");
    });

    act(() => {
      expect(result.current[2].advance()).toBe("fallback");
    });

    expect(result.current[0]).toBe("home");
    expect(result.current[2].lastResult).toBe("fallback");
  });

  it("supports object states with a custom key function", () => {
    type Page = { id: string; title: string };

    const home = { id: "home", title: "Home" };
    const search = { id: "search", title: "Search" };

    const { result } = renderHook(() => useLearnableState<Page>(home, {
      keyOf: page => page.id,
      confidenceThreshold: 0.1
    }));

    act(() => {
      result.current[1](search);
    });

    act(() => {
      result.current[1](home);
    });

    expect(result.current[2].prediction?.state).toEqual(search);
  });
});
