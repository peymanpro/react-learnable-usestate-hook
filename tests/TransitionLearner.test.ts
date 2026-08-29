import { describe, expect, it } from "vitest";
import { TransitionLearner } from "../src/core/TransitionLearner.js";

describe("TransitionLearner", () => {
  it("returns null when no transition has been observed", () => {
    const learner = new TransitionLearner<string>({
      keyOf: state => state
    });

    expect(learner.predictNext("home")).toBeNull();
  });

  it("learns transition probabilities from observations", () => {
    const learner = new TransitionLearner<string>({
      keyOf: state => state
    });

    learner.observe("home", "search");
    learner.observe("home", "search");
    learner.observe("home", "profile");

    expect(learner.getProbability("home", "search")).toBeCloseTo(2 / 3);
    expect(learner.getProbability("home", "profile")).toBeCloseTo(1 / 3);
    expect(learner.getProbability("home", "cart")).toBe(0);
  });

  it("predicts the most frequently observed next state", () => {
    const learner = new TransitionLearner<string>({
      keyOf: state => state
    });

    learner.observe("home", "search");
    learner.observe("home", "search");
    learner.observe("home", "search");
    learner.observe("home", "profile");

    const prediction = learner.predictNext("home");

    expect(prediction?.state).toBe("search");
    expect(prediction?.probability).toBeCloseTo(0.75);
    expect(prediction?.observations).toBe(4);
    expect(prediction?.confidence).toBeGreaterThan(0);
    expect(prediction?.confidence).toBeLessThan(0.75);
  });

  it("treats different previous states independently", () => {
    const learner = new TransitionLearner<string>({
      keyOf: state => state
    });

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

  it("supports object states through a custom key function", () => {
    type PageState = { id: string; title: string };

    const learner = new TransitionLearner<PageState>({
      keyOf: state => state.id
    });

    const home = { id: "home", title: "Home" };
    const search = { id: "search", title: "Search" };

    learner.observe(home, search);

    const prediction = learner.predictNext(home);

    expect(prediction?.state).toEqual(search);
    expect(prediction?.probability).toBe(1);
    expect(prediction?.observations).toBe(1);
  });

  it("uses the latest state value associated with a key", () => {
    type PageState = { id: string; title: string };

    const learner = new TransitionLearner<PageState>({
      keyOf: state => state.id
    });

    const home = { id: "home", title: "Home" };
    const firstSearch = { id: "search", title: "Search" };
    const updatedSearch = { id: "search", title: "Search Results" };

    learner.observe(home, firstSearch);
    learner.observe(home, updatedSearch);

    const prediction = learner.predictNext(home);

    expect(prediction?.state).toEqual(updatedSearch);
    expect(prediction?.probability).toBe(1);
    expect(prediction?.observations).toBe(2);
  });

  it("limits the number of unique transitions", () => {
    const learner = new TransitionLearner<string>({
      keyOf: state => state,
      maxUniqueTransitions: 2
    });

    learner.observe("home", "search");
    learner.observe("home", "profile");
    learner.observe("home", "cart");

    expect(learner.getProbability("home", "search")).toBe(0.5);
    expect(learner.getProbability("home", "profile")).toBe(0.5);
    expect(learner.getProbability("home", "cart")).toBe(0);
    expect(learner.predictNext("home")?.observations).toBe(2);
  });

  it("continues counting known transitions after the unique transition limit is reached", () => {
    const learner = new TransitionLearner<string>({
      keyOf: state => state,
      maxUniqueTransitions: 1
    });

    learner.observe("home", "search");
    learner.observe("home", "search");
    learner.observe("home", "profile");

    expect(learner.getProbability("home", "search")).toBe(1);
    expect(learner.predictNext("home")?.observations).toBe(2);
  });

  it("rejects an invalid unique transition limit", () => {
    expect(() => new TransitionLearner<string>({
      keyOf: state => state,
      maxUniqueTransitions: 0
    })).toThrow();

    expect(() => new TransitionLearner<string>({
      keyOf: state => state,
      maxUniqueTransitions: 1.5
    })).toThrow();
  });
});
