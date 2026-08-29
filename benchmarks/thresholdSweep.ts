import { AdaptationDecisionEngine } from "../src/core/AdaptationDecisionEngine.js";
import { DecisionPolicy } from "../src/core/DecisionPolicy.js";
import { LearnableStateEngine } from "../src/core/LearnableStateEngine.js";
import { SafetyConstraints } from "../src/core/SafetyConstraints.js";
import { AdaptationExecutor } from "../src/core/AdaptationExecutor.js";
import { TransitionLearner } from "../src/core/TransitionLearner.js";

type State = string;

interface Result {
  readonly threshold: number;
  readonly predictions: number;
  readonly correctPredictions: number;
  readonly adaptations: number;
  readonly falseAdaptations: number;
  readonly fallbacks: number;
  readonly accuracy: number;
  readonly adaptationRate: number;
  readonly falseAdaptationRate: number;
  readonly fallbackRate: number;
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

function run(threshold: number, sequence: readonly State[]): Result {
  const learner = new TransitionLearner<State>({
    keyOf: state => state,
    maxUniqueTransitions: 1000
  });

  const policy = new DecisionPolicy({
    confidenceThreshold: threshold
  });

  const safety = new SafetyConstraints<State>();

  const decisionEngine = new AdaptationDecisionEngine<State>({
    policy,
    safety
  });

  const executor = new AdaptationExecutor<State>();

  const engine = new LearnableStateEngine({
    learner,
    decisionEngine,
    executor
  });

  const warmup = 100;
  let predictions = 0;
  let correctPredictions = 0;
  let adaptations = 0;
  let falseAdaptations = 0;
  let fallbacks = 0;

  for (let index = 0; index < sequence.length - 1; index += 1) {
    const current = sequence[index];
    const actualNext = sequence[index + 1];
    const evaluation = engine.evaluate(current);

    if (evaluation.prediction && index >= warmup) {
      predictions += 1;

      const correct = evaluation.prediction.state === actualNext;

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
    threshold,
    predictions,
    correctPredictions,
    adaptations,
    falseAdaptations,
    fallbacks,
    accuracy: predictions === 0 ? 0 : correctPredictions / predictions,
    adaptationRate: predictions === 0 ? 0 : adaptations / predictions,
    falseAdaptationRate: adaptations === 0 ? 0 : falseAdaptations / adaptations,
    fallbackRate: predictions === 0 ? 0 : fallbacks / predictions
  };
}

const sequence = mostlyDeterministicSequence(2000, 42);
const thresholds = [0.5, 0.6, 0.7, 0.8, 0.9, 0.95];
const results = thresholds.map(threshold => run(threshold, sequence));

console.table(results.map(result => ({
  Threshold: result.threshold.toFixed(2),
  Accuracy: `${(result.accuracy * 100).toFixed(2)}%`,
  "Adaptation": `${(result.adaptationRate * 100).toFixed(2)}%`,
  "False Adaptation": `${(result.falseAdaptationRate * 100).toFixed(2)}%`,
  "Fallback": `${(result.fallbackRate * 100).toFixed(2)}%`
})));
