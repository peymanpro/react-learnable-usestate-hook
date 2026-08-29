import { TransitionLearner } from "../src/core/TransitionLearner.js";

type State = string;

interface Bucket {
  readonly min: number;
  readonly max: number;
  predictions: number;
  correct: number;
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createSequence(length: number, seed: number): State[] {
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

const buckets: Bucket[] = [
  { min: 0.0, max: 0.5, predictions: 0, correct: 0 },
  { min: 0.5, max: 0.6, predictions: 0, correct: 0 },
  { min: 0.6, max: 0.7, predictions: 0, correct: 0 },
  { min: 0.7, max: 0.8, predictions: 0, correct: 0 },
  { min: 0.8, max: 0.9, predictions: 0, correct: 0 },
  { min: 0.9, max: 0.95, predictions: 0, correct: 0 },
  { min: 0.95, max: 1.0, predictions: 0, correct: 0 }
];

const learner = new TransitionLearner<State>({
  keyOf: state => state,
  maxUniqueTransitions: 1000
});

const sequence = createSequence(10000, 42);
const warmup = 100;

for (let index = 0; index < sequence.length - 1; index += 1) {
  const current = sequence[index];
  const actualNext = sequence[index + 1];
  const prediction = learner.predictNext(current);

  if (prediction && index >= warmup) {
    const bucket = buckets.find(
      candidate =>
        prediction.confidence >= candidate.min &&
        prediction.confidence < candidate.max
    );

    if (bucket) {
      bucket.predictions += 1;

      if (prediction.state === actualNext) {
        bucket.correct += 1;
      }
    }
  }

  learner.observe(current, actualNext);
}

console.table(
  buckets.map(bucket => ({
    Range: `${bucket.min.toFixed(2)}-${bucket.max.toFixed(2)}`,
    Predictions: bucket.predictions,
    Correct: bucket.correct,
    "Observed Accuracy %": bucket.predictions === 0
      ? "0.00"
      : ((bucket.correct / bucket.predictions) * 100).toFixed(2),
    "Expected Confidence %":
      (((bucket.min + bucket.max) / 2) * 100).toFixed(2)
  }))
);
