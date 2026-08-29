import { describe, expect, it } from "vitest";
import { TransitionLearner } from "../src/core/TransitionLearner.js";

describe("TransitionLearner", () => {
  it("returns null when no transition has been observed", () => {
    const learner = new TransitionLearner();

    expect(learner.predictNext("home")).toBeNull();
  });

  it("learns transition probabilities from observations", () => {
    const learner = new TransitionLearner();

    learner.observe("home", "search");
    learner.observe("home", "search");
    learner.observe("home", "profile");

    expect(learner.getProbability("home", "search")).toBeCloseTo(2 / 3);
    expect(learner.getProbability("home", "profile")).toBeCloseTo(1 / 3);
    expect(learner.getProbability("home", "cart")).toBe(0);
  });

  it("predicts the most frequently observed next state", () => {
    const learner = new TransitionLearner();

    learner.observe("home", "search");
    learner.observe("home", "search");
    learner.observe("home", "search");
    learner.observe("home", "profile");

    expect(learner.predictNext("home")).toEqual({
      state: "search",
      probability: 0.75
    });
  });

  it("treats different previous states independently", () => {
    const learner = new TransitionLearner();

    learner.observe("home", "search");
    learner.observe("home", "search");
    learner.observe("profile", "settings");

    expect(learner.predictNext("home")).toEqual({
      state: "search",
      probability: 1
    });

    expect(learner.predictNext("profile")).toEqual({
      state: "settings",
      probability: 1
    });
  });
});
