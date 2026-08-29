import { Bench } from "tinybench";
import { TransitionLearner } from "../src/core/TransitionLearner.js";

const sizes = [2, 10, 100, 1000, 10000];

for (const size of sizes) {
  const learner = new TransitionLearner<string>({
    keyOf: state => state
  });

  for (let i = 0; i < size; i += 1) {
    learner.observe("source", `state-${i}`);
  }

  const bench = new Bench({ time: 500 });

  bench.add(`predict next (${size} transitions)`, () => {
    learner.predictNext("source");
  });

  bench.add(`probability lookup (${size} transitions)`, () => {
    learner.getProbability("source", `state-${Math.floor(size / 2)}`);
  });

  await bench.run();

  console.log(`\\n=== ${size} unique transitions ===`);
  console.table(bench.table());
}
