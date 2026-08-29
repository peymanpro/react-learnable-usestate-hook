import { TransitionLearner } from "../src/core/TransitionLearner.js";

type State = string;

interface Bucket {
  readonly min: number;
  readonly max: number;
  predictions: number;
  correct: number;
  probabilitySum: number;
  confidenceSum: number;
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
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

function createBuckets(): Bucket[] {
  return [
    { min: 0.0, max: 0.5, predictions: 0, correct: 0, probabilitySum: 0, confidenceSum: 0 },
    { min: 0.5, max: 0.6, predictions: 0, correct: 0, probabilitySum: 0, confidenceSum: 0 },
    { min: 0.6, max: 0.7, predictions: 0, correct: 0, probabilitySum: 0, confidenceSum: 0 },
    { min: 0.7, max: 0.8, predictions: 0, correct: 0, probabilitySum: 0, confidenceSum: 0 },
    { min: 0.8, max: 0.9, predictions: 0, correct: 0, probabilitySum: 0, confidenceSum: 0 },
    { min: 0.9, max: 1.0, predictions: 0, correct: 0, probabilitySum: 0, confidenceSum: 0 }
  ];
}

function evaluate(sequence: readonly State[]) {
  const learner = new TransitionLearner<State>({
    keyOf: state => state,
    maxUniqueTransitions: 1000
  });

  const buckets = createBuckets();
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
        bucket.probabilitySum += prediction.probability;
        bucket.confidenceSum += prediction.confidence;

        if (prediction.state === actualNext) {
          bucket.correct += 1;
        }
      }
    }

    learner.observe(current, actualNext);
  }

  return buckets;
}

function report(name: string, buckets: readonly Bucket[]) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.predictions, 0);

  const rows = buckets.map(bucket => {
    const accuracy = bucket.predictions === 0
      ? 0
      : bucket.correct / bucket.predictions;

    const meanProbability = bucket.predictions === 0
      ? 0
      : bucket.probabilitySum / bucket.predictions;

    const meanConfidence = bucket.predictions === 0
      ? 0
      : bucket.confidenceSum / bucket.predictions;

    return {
      Range: `${bucket.min.toFixed(2)}-${bucket.max.toFixed(2)}`,
      Predictions: bucket.predictions,
      "Mean Probability": meanProbability,
      "Mean Confidence": meanConfidence,
      "Observed Accuracy": accuracy,
      "Absolute Calibration Error": Math.abs(accuracy - meanConfidence),
      Weight: total === 0 ? 0 : bucket.predictions / total
    };
  });

  const ece = rows.reduce(
    (sum, row) => sum + row.Weight * row["Absolute Calibration Error"],
    0
  );

  console.log(`\\n=== ${name} ===`);
  console.table(rows.map(row => ({
    Range: row.Range,
    Predictions: row.Predictions,
    "Mean Probability": row["Mean Probability"].toFixed(4),
    "Mean Confidence": row["Mean Confidence"].toFixed(4),
    "Observed Accuracy": row["Observed Accuracy"].toFixed(4),
    "Calibration Error": row["Absolute Calibration Error"].toFixed(4)
  })));

  console.log(`ECE (confidence): ${ece.toFixed(6)}`);
}

const length = 20000;

report(
  "mostly deterministic (10% noise)",
  evaluate(mostlyDeterministicSequence(length, 42))
);

report(
  "noisy",
  evaluate(noisySequence(length, 123))
);
