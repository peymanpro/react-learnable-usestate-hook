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

  it("learns transitions from state updates", () => {
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

  it("advances to the learned next state when allowed", () => {
    const { result } = renderHook(() => useLearnableState("home", {
      confidenceThreshold: 0.1
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
    expect(result.current[2].lastResult).toBe("adapted");
  });

  it("keeps deterministic state when adaptation is rejected", () => {
    const { result } = renderHook(() => useLearnableState("home", {
      confidenceThreshold: 0.99
    }));

    act(() => {
      result.current[1]("search");
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
