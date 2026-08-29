import { AdaptationDecisionEngine } from "../src/core/AdaptationDecisionEngine.js";
import { DecisionPolicy } from "../src/core/DecisionPolicy.js";
import { LearnableStateEngine } from "../src/core/LearnableStateEngine.js";
import { SafetyConstraints } from "../src/core/SafetyConstraints.js";
import { AdaptationExecutor } from "../src/core/AdaptationExecutor.js";
import { TransitionLearner } from "../src/core/TransitionLearner.js";

type State = string;

interface Metrics {
  readonly predictions: number;
  readonly correct: number;
  readonly adaptations: number;
  readonly correctAdaptations: number;
  readonly falseAdaptations: number;
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

function runConfidence(sequence: readonly State[], threshold: number): Metrics {
  const learner = new TransitionLearner<State>({ keyOf: state => state });
  const policy = new DecisionPolicy({ confidenceThreshold: threshold });
  const engine = new LearnableStateEngine({
    learner,
    decisionEngine: new AdaptationDecisionEngine({
      policy,
      safety: new SafetyConstraints<State>()
    }),
    executor: new AdaptationExecutor<State>()
  });

  const warmup = 100;
  const metrics: Metrics = {
    predictions: 0,
    correct: 0,
    adaptations: 0,
    correctAdaptations: 0,
    falseAdaptations: 0
  };

  let predictions = 0;
  let correct = 0;
  let adaptations = 0;
  let correctAdaptations = 0;
  let falseAdaptations = 0;

  for (let index = 0; index < sequence.length - 1; index += 1) {
    const current = sequence[index];
    const actualNext = sequence[index + 1];
    const evaluation = engine.evaluate(current);

    if (evaluation.prediction && index >= warmup) {
      predictions += 1;
      const isCorrect = evaluation.prediction.state === actualNext;

      if (isCorrect) {
        correct += 1;
      }

      if (evaluation.result === "adapted") {
        adaptations += 1;

        if (isCorrect) {
          correctAdaptations += 1;
        } else {
          falseAdaptations += 1;
        }
      }
    }

    learner.observe(current, actualNext);
  }

  return {
    predictions,
    correct,
    adaptations,
    correctAdaptations,
    falseAdaptations
  };
}

function runAlwaysAdapt(sequence: readonly State[]): Metrics {
  const learner = new TransitionLearner<State>({ keyOf: state => state });
  const warmup = 100;

  let predictions = 0;
  let correct = 0;
  let adaptations = 0;
  let correctAdaptations = 0;
  let falseAdaptations = 0;

  for (let index = 0; index < sequence.length - 1; index += 1) {
    const current = sequence[index];
    const actualNext = sequence[index + 1];
    const prediction = learner.predictNext(current);

    if (prediction && index >= warmup) {
      predictions += 1;
      adaptations += 1;

      const isCorrect = prediction.state === actualNext;

      if (isCorrect) {
        correct += 1;
        correctAdaptations += 1;
      } else {
        falseAdaptations += 1;
      }
    }

    learner.observe(current, actualNext);
  }

  return {
    predictions,
    correct,
    adaptations,
    correctAdaptations,
    falseAdaptations
  };
}

function summarize(name: string, metrics: Metrics) {
  return {
    Policy: name,
    Accuracy: metrics.predictions === 0
      ? "0.00%"
      : `${((metrics.correct / metrics.predictions) * 100).toFixed(2)}%`,
    "Adaptation %": metrics.predictions === 0
      ? "0.00%"
      : `${((metrics.adaptations / metrics.predictions) * 100).toFixed(2)}%`,
    "Correct Adaptation %": metrics.adaptations === 0
      ? "0.00%"
      : `${((metrics.correctAdaptations / metrics.adaptations) * 100).toFixed(2)}%`,
    "False Adaptation %": metrics.adaptations === 0
      ? "0.00%"
      : `${((metrics.falseAdaptations / metrics.adaptations) * 100).toFixed(2)}%`
  };
}

const sequence = createSequence(5000, 42);

const rows = [
  summarize("always adapt", runAlwaysAdapt(sequence)),
  summarize("confidence 0.80", runConfidence(sequence, 0.8)),
  summarize("confidence 0.90", runConfidence(sequence, 0.9))
];

console.table(rows);
