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

    const prediction = learner.predictNext("home");

    expect(prediction).not.toBeNull();
    expect(prediction?.state).toBe("search");
    expect(prediction?.probability).toBeCloseTo(0.75);
    expect(prediction?.observations).toBe(4);
    expect(prediction?.confidence).toBeGreaterThan(0);
    expect(prediction?.confidence).toBeLessThan(0.75);
  });

  it("treats different previous states independently", () => {
    const learner = new TransitionLearner();

    learner.observe("home", "search");
    learner.observe("home", "search");
    learner.observe("profile", "settings");

    const homePrediction = learner.predictNext("home");
    const profilePrediction = learner.predictNext("profile");

    expect(homePrediction?.state).toBe("search");
    expect(homePrediction?.probability).toBe(1);
    expect(homePrediction?.observations).toBe(2);

    expect(profilePrediction?.state).toBe("settings");
    expect(profilePrediction?.probability).toBe(1);
    expect(profilePrediction?.observations).toBe(1);
  });
});
