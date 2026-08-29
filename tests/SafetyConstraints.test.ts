import { describe, expect, it } from "vitest";
import { SafetyConstraints } from "../src/core/SafetyConstraints.js";

describe("SafetyConstraints", () => {
  it("allows every state when no constraints are defined", () => {
    const safety = new SafetyConstraints<string>();

    expect(safety.evaluate("search")).toEqual({
      state: "search",
      allowed: true
    });
  });

  it("allows a state when all constraints pass", () => {
    const safety = new SafetyConstraints<number>([
      value => value >= 0,
      value => value <= 10
    ]);

    expect(safety.evaluate(5)).toEqual({
      state: 5,
      allowed: true
    });
  });

  it("rejects a state when one constraint fails", () => {
    const safety = new SafetyConstraints<number>([
      value => value >= 0,
      value => value <= 10
    ]);

    expect(safety.evaluate(11)).toEqual({
      state: 11,
      allowed: false
    });
  });

  it("rejects a state when any constraint fails", () => {
    const safety = new SafetyConstraints<string>([
      value => value !== "admin",
      value => value.length <= 20
    ]);

    expect(safety.evaluate("admin")).toEqual({
      state: "admin",
      allowed: false
    });
  });
});
