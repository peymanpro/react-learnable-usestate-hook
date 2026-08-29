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

function generateSequence(
  length: number,
  probabilities: readonly [number, number, number],
  seed: number
): State[] {
  const random = seededRandom(seed);
  const result: State[] = ["A"];

  for (let index = 1; index < length; index += 1) {
    const previous = result[index - 1];
    const draw = random();

    const pA = probabilities[0];
    const pB = probabilities[1];

    if (previous !== "A") {
      result.push("A");
      continue;
    }

    if (draw < pA) {
      result.push("B");
    } else if (draw < pA + pB) {
      result.push("C");
    } else {
      result.push("D");
    }
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

interface Result {
  readonly scenario: string;
  readonly confidence: number;
  readonly margin: number;
  readonly accuracy: number;
  readonly adaptationRate: number;
  readonly falseAdaptationRate: number;
}

function run(
  scenario: string,
  confidenceThreshold: number,
  marginThreshold: number,
  sequence: readonly State[]
): Result {
  const learner = new TransitionLearner<State>({
    keyOf: state => state,
    maxUniqueTransitions: 1000
  });

  const policy = new DecisionPolicy({
    confidenceThreshold,
    marginThreshold
  });

  const engine = new LearnableStateEngine({
    learner,
    decisionEngine: new AdaptationDecisionEngine<State>({
      policy,
      safety: new SafetyConstraints<State>()
    }),
    executor: new AdaptationExecutor<State>()
  });

  const warmup = 100;
  let predictions = 0;
  let correct = 0;
  let adaptations = 0;
  let falseAdaptations = 0;

  for (let index = 0; index < sequence.length - 1; index += 1) {
    const current = sequence[index];
    const actualNext = sequence[index + 1];
    const evaluation = engine.evaluate(current);

    if (evaluation.prediction && index >= warmup) {
      predictions += 1;

      if (evaluation.prediction.state === actualNext) {
        correct += 1;
      }

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
    scenario,
    confidence: confidenceThreshold,
    margin: marginThreshold,
    accuracy: predictions === 0 ? 0 : correct / predictions,
    adaptationRate: predictions === 0 ? 0 : adaptations / predictions,
    falseAdaptationRate:
      adaptations === 0 ? 0 : falseAdaptations / adaptations
  };
}

const length = 3000;
const scenarios = [
  {
    name: "strongly dominant",
    sequence: generateSequence(length, [0.9, 0.08, 0.02], 42)
  },
  {
    name: "moderately dominant",
    sequence: generateSequence(length, [0.7, 0.2, 0.1], 42)
  },
  {
    name: "balanced",
    sequence: generateSequence(length, [0.34, 0.33, 0.33], 42)
  },
  {
    name: "random",
    sequence: randomSequence(length, 42)
  }
];

const margins = [
  0.0,
  0.1,
  0.2,
  0.3,
  0.4,
  0.5,
  0.6,
  0.7,
  0.8,
  0.9
];

for (const scenario of scenarios) {
  const results = margins.map(margin =>
    run(scenario.name, 0.8, margin, scenario.sequence)
  );

  console.log(`\\n=== ${scenario.name} ===`);

  console.table(results.map(result => ({
    Margin: result.margin.toFixed(2),
    "Accuracy %": (result.accuracy * 100).toFixed(2),
    "Adaptation %": (result.adaptationRate * 100).toFixed(2),
    "False Adaptation %":
      (result.falseAdaptationRate * 100).toFixed(2)
  })));
}
