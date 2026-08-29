import { AdaptationDecisionEngine } from "../src/core/AdaptationDecisionEngine.js";
import { DecisionPolicy } from "../src/core/DecisionPolicy.js";
import { LearnableStateEngine } from "../src/core/LearnableStateEngine.js";
import { SafetyConstraints } from "../src/core/SafetyConstraints.js";
import { AdaptationExecutor } from "../src/core/AdaptationExecutor.js";
import { TransitionLearner } from "../src/core/TransitionLearner.js";

type State = string;

interface ExperimentResult {
  readonly name: string;
  readonly totalSteps: number;
  readonly predictions: number;
  readonly correctPredictions: number;
  readonly adaptations: number;
  readonly falseAdaptations: number;
  readonly fallbacks: number;
  readonly predictionAccuracy: number;
  readonly adaptationRate: number;
  readonly falseAdaptationRate: number;
  readonly fallbackRate: number;
}

function createEngine() {
  const learner = new TransitionLearner<State>({
    keyOf: state => state,
    maxUniqueTransitions: 1000
  });

  const policy = new DecisionPolicy({
    confidenceThreshold: 0.8
  });

  const safety = new SafetyConstraints<State>();
  const decisionEngine = new AdaptationDecisionEngine<State>({
    policy,
    safety
  });

  const executor = new AdaptationExecutor<State>();

  return {
    learner,
    engine: new LearnableStateEngine({
      learner,
      decisionEngine,
      executor
    })
  };
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

function mostlyDeterministicSequence(
  length: number,
  seed: number
): State[] {
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
    const previous = result[index - 1];
    const expected = previous === "A" ? "B" : "A";

    result.push(random() < 0.5 ? expected : states[Math.floor(random() * states.length)]);
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

function runExperiment(
  name: string,
  sequence: readonly State[],
  warmupSteps: number
): ExperimentResult {
  const { learner, engine } = createEngine();

  let predictions = 0;
  let correctPredictions = 0;
  let adaptations = 0;
  let falseAdaptations = 0;
  let fallbacks = 0;

  for (let index = 0; index < sequence.length - 1; index += 1) {
    const current = sequence[index];
    const actualNext = sequence[index + 1];

    const evaluation = engine.evaluate(current);
    const prediction = evaluation.prediction;

    if (prediction !== null && index >= warmupSteps) {
      predictions += 1;

      const correct = prediction.state === actualNext;

      if (correct) {
        correctPredictions += 1;
      }

      if (evaluation.result === "adapted") {
        adaptations += 1;

        if (!correct) {
          falseAdaptations += 1;
        }
      } else {
        fallbacks += 1;
      }
    }

    learner.observe(current, actualNext);
  }

  return {
    name,
    totalSteps: Math.max(0, sequence.length - 1 - warmupSteps),
    predictions,
    correctPredictions,
    adaptations,
    falseAdaptations,
    fallbacks,
    predictionAccuracy:
      predictions === 0 ? 0 : correctPredictions / predictions,
    adaptationRate:
      predictions === 0 ? 0 : adaptations / predictions,
    falseAdaptationRate:
      adaptations === 0 ? 0 : falseAdaptations / adaptations,
    fallbackRate:
      predictions === 0 ? 0 : fallbacks / predictions
  };
}

const length = 2000;
const warmup = 100;

const experiments = [
  runExperiment("deterministic", deterministicSequence(length), warmup),
  runExperiment("mostly deterministic (10% noise)", mostlyDeterministicSequence(length, 42), warmup),
  runExperiment("noisy", noisySequence(length, 123), warmup),
  runExperiment("random", randomSequence(length, 456), warmup)
];

console.table(
  experiments.map(result => ({
    Scenario: result.name,
    Steps: result.totalSteps,
    Predictions: result.predictions,
    Correct: result.correctPredictions,
    "Accuracy %": (result.predictionAccuracy * 100).toFixed(2),
    "Adaptation %": (result.adaptationRate * 100).toFixed(2),
    "False Adaptation %": (result.falseAdaptationRate * 100).toFixed(2),
    "Fallback %": (result.fallbackRate * 100).toFixed(2)
  }))
);
