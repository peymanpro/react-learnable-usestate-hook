import { AdaptationDecisionEngine } from "../src/core/AdaptationDecisionEngine.js";
import { DecisionPolicy } from "../src/core/DecisionPolicy.js";
import { LearnableStateEngine } from "../src/core/LearnableStateEngine.js";
import { SafetyConstraints } from "../src/core/SafetyConstraints.js";
import { AdaptationExecutor } from "../src/core/AdaptationExecutor.js";
import { TransitionLearner } from "../src/core/TransitionLearner.js";

type State = string;

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function sequence(length: number, seed: number): State[] {
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

function run(
  confidenceThreshold: number,
  marginThreshold: number,
  values: readonly State[]
) {
  const learner = new TransitionLearner<State>({
    keyOf: state => state,
    maxUniqueTransitions: 1000
  });

  const policy = new DecisionPolicy({
    confidenceThreshold,
    marginThreshold
  });

  const decisionEngine = new AdaptationDecisionEngine<State>({
    policy,
    safety: new SafetyConstraints<State>()
  });

  const engine = new LearnableStateEngine({
    learner,
    decisionEngine,
    executor: new AdaptationExecutor<State>()
  });

  const warmup = 100;
  let predictions = 0;
  let adaptations = 0;
  let falseAdaptations = 0;

  for (let index = 0; index < values.length - 1; index += 1) {
    const current = values[index];
    const actualNext = values[index + 1];
    const evaluation = engine.evaluate(current);

    if (evaluation.prediction && index >= warmup) {
      predictions += 1;

      if (evaluation.result === "adapted") {
        adaptations += 1;
        if (evaluation.prediction.state !== actualNext) {
          falseAdaptations += 1;
        }
      }
    }

    learner.observe(current, actualNext);
  }

  return {
    confidenceThreshold,
    marginThreshold,
    adaptationRate: predictions === 0 ? 0 : adaptations / predictions,
    falseAdaptationRate: adaptations === 0 ? 0 : falseAdaptations / adaptations
  };
}

const values = sequence(2000, 42);
const confidenceThresholds = [0.7, 0.8, 0.9];
const marginThresholds = [0.1, 0.2, 0.3, 0.4, 0.5];

const results = [];

for (const confidenceThreshold of confidenceThresholds) {
  for (const marginThreshold of marginThresholds) {
    results.push(run(confidenceThreshold, marginThreshold, values));
  }
}

console.table(results.map(result => ({
  Confidence: result.confidenceThreshold.toFixed(2),
  Margin: result.marginThreshold.toFixed(2),
  "Adaptation %": (result.adaptationRate * 100).toFixed(2),
  "False Adaptation %": (result.falseAdaptationRate * 100).toFixed(2)
})));
