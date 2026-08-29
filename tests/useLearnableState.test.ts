import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useLearnableState } from "../src/index.js";

describe("useLearnableState", () => {
  it("preserves the initial state", () => {
    const { result } = renderHook(() => useLearnableState(0));

    expect(result.current[0]).toBe(0);
  });

  it("supports direct state updates", () => {
    const { result } = renderHook(() => useLearnableState(0));

    act(() => {
      result.current[1](5);
    });

    expect(result.current[0]).toBe(5);
  });

  it("supports functional state updates", () => {
    const { result } = renderHook(() => useLearnableState(10));

    act(() => {
      result.current[1](previous => previous + 5);
    });

    expect(result.current[0]).toBe(15);
  });

  it("supports lazy initialization", () => {
    const { result } = renderHook(() =>
      useLearnableState(() => 42)
    );

    expect(result.current[0]).toBe(42);
  });
});
