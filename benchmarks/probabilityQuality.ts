import { TransitionLearner } from "../src/core/TransitionLearner.js";

type State = string;

interface QualityResult {
  readonly scenario: string;
  readonly predictions: number;
  readonly accuracy: number;
  readonly brierScore: number;
  readonly meanPredictedProbability: number;
  readonly meanConfidence: number;
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function deterministicSequence(length: number): State[] {
  return Array.from({ length }, (_, index) =>
    index % 2 === 0 ? "A" : "B"
  );
}

function noisySequence(length: number, seed: number): State[] {
  const random = seededRandom(seed);
  const states = ["A", "B", "C", "D"];
  const result: State[] = ["A"];

  for (let index = 1; index < length; index += 1) {
    const expected = result[index - 1] === "A" ? "B" : "A";

    result.push(
      random() < 0.5
        ? expected
        : states[Math.floor(random() * states.length)]
    );
  }

  return result;
}

function mostlyDeterministicSequence(length: number, seed: number): State[] {
  const random = seededRandom(seed);
  const result: State[] = ["A"];

  for (let index = 1; index < length; index += 1) {
    const expected = result[index - 1] === "A" ? "B" : "A";

    result.push(
      random() < 0.1
        ? expected === "A" ? "C" : "D"
        : expected
    );
  }

  return result;
}

function randomSequence(length: number, seed: number): State[] {
  const random = seededRandom(seed);
  const states = ["A", "B", "C", "D"];

  return Array.from({ length }, () =>
    states[Math.floor(random() * states.length)]
  );
}

function evaluate(
  scenario: string,
  sequence: readonly State[],
  warmup: number
): QualityResult {
  const learner = new TransitionLearner<State>({
    keyOf: state => state,
    maxUniqueTransitions: 1000
  });

  let predictions = 0;
  let correct = 0;
  let brierSum = 0;
  let probabilitySum = 0;
  let confidenceSum = 0;

  for (let index = 0; index < sequence.length - 1; index += 1) {
    const current = sequence[index];
    const actualNext = sequence[index + 1];
    const prediction = learner.predictNext(current);

    if (prediction && index >= warmup) {
      const y = prediction.state === actualNext ? 1 : 0;
      const p = prediction.probability;

      predictions += 1;
      correct += y;
      brierSum += (p - y) ** 2;
      probabilitySum += p;
      confidenceSum += prediction.confidence;
    }

    learner.observe(current, actualNext);
  }

  return {
    scenario,
    predictions,
    accuracy: predictions === 0 ? 0 : correct / predictions,
    brierScore: predictions === 0 ? 0 : brierSum / predictions,
    meanPredictedProbability:
      predictions === 0 ? 0 : probabilitySum / predictions,
    meanConfidence:
      predictions === 0 ? 0 : confidenceSum / predictions
  };
}

const length = 10000;
const warmup = 100;

const results = [
  evaluate("deterministic", deterministicSequence(length), warmup),
  evaluate("mostly deterministic", mostlyDeterministicSequence(length, 42), warmup),
  evaluate("noisy", noisySequence(length, 123), warmup),
  evaluate("random", randomSequence(length, 456), warmup)
];

console.table(results.map(result => ({
  Scenario: result.scenario,
  Predictions: result.predictions,
  "Accuracy %": (result.accuracy * 100).toFixed(2),
  "Brier Score": result.brierScore.toFixed(4),
  "Mean Probability": result.meanPredictedProbability.toFixed(4),
  "Mean Confidence": result.meanConfidence.toFixed(4)
})));
