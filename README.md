# react-learnable-usestate-hook

An experimental React hook that augments `useState` with lightweight online transition learning, statistical confidence estimation, safety constraints, and controlled adaptation.

## Status

**Version:** 0.1.0

This project is an experimental research-oriented implementation. It demonstrates a concrete learning-enabled state mechanism; it does not claim that the underlying mathematical techniques are novel, nor does the current version provide proof of general-purpose superiority over ordinary React state.

## Why

React `useState` is deterministic: the application decides the next state.

`useLearnableState` preserves that basic behavior while maintaining an internal model of observed state transitions. The learned model can later propose a next state, but the proposal is accepted only when the configured decision policy and safety constraints allow it.

The central distinction is:

`Observation ≠ Prediction ≠ Decision ≠ Adaptation`

## Core model

For a previous state `s_i` and candidate next state `s_j`, the learner maintains a transition count:

`N(s_i, s_j)`

The empirical transition probability is:

`P(s_j | s_i) = N(s_i, s_j) / Σ_k N(s_i, s_k)`

The prediction is the most frequently observed next state.

### Statistical confidence

Confidence is represented by the lower bound of the Wilson interval for the selected transition:

`L = [p + z²/(2n) - z√(p(1-p)/n + z²/(4n²))] / [1 + z²/n]`

where:

- `p = k / n`
- `k` is the selected transition count
- `n` is the total number of observed transitions from the source state
- `z = 1.96` for the default 95% confidence level

The implementation clamps the result to `[0, 1]` to avoid floating-point boundary artifacts.

### Prediction margin

The learner also reports the runner-up probability and prediction margin:

`margin = P_1 - P_2`

where `P_1` is the best candidate probability and `P_2` is the second-best probability.

The margin is optional in the decision policy and is currently treated as an experimental control rather than a proven improvement.

### Decision

Adaptation is permitted when the configured policy accepts the prediction and all safety constraints pass:

`confidence >= confidenceThreshold`

`margin >= marginThreshold`

and:

`Safety(predictedState) = true`

Otherwise the engine returns a deterministic fallback.

## Installation

```bash
pnpm add react-learnable-usestate-hook
```

React is a peer dependency and must be supplied by the consuming application.

## Usage

```tsx
import { useLearnableState } from "react-learnable-usestate-hook";

function Example() {
  const [state, setState, learning] = useLearnableState("home", {
    confidenceThreshold: 0.8,
    marginThreshold: 0.2,
  });

  return (
    <div>
      <p>Current state: {state}</p>
      <button onClick={() => setState("search")}>Search</button>
      <button onClick={() => learning.advance()}>
        Advance using learned prediction
      </button>
    </div>
  );
}
```

The first two tuple elements follow the familiar `useState` pattern:

`[state, setState, learning]`

The third element exposes learning information and explicit adaptation:

```ts
learning.prediction
learning.decision
learning.observations
learning.lastResult
learning.advance()
```

## Custom state types

Primitive `string` and `number` states can use the default identity key. For object states, provide a stable key function:

```tsx
type Page = {
  id: string;
  title: string;
};

const [page, setPage, learning] = useLearnableState<Page>(initialPage, {
  keyOf: value => value.id,
});
```

`keyOf` defines state identity for learning. Applications should provide a stable and meaningful identifier.

## Safety constraints

Predictions can be restricted independently from confidence:

```tsx
const [state, setState, learning] = useLearnableState("home", {
  safetyConstraints: [
    nextState => nextState !== "blocked",
  ],
});
```

Every configured safety constraint must pass before an adaptation is accepted.

## Memory bound

The learner supports an optional maximum number of unique transitions:

```ts
new TransitionLearner({
  keyOf: state => state,
  maxUniqueTransitions: 1000,
});
```

When the hard limit is reached, previously known transitions can continue accumulating observations, while new unique transitions are not added.

There is intentionally no eviction policy in 0.1.0. Eviction would introduce an additional learning policy and is reserved for future experimentation.

## Experimental findings

The repository contains reproducible benchmark and experiment scripts under `benchmarks/`.

Current experiments evaluate:

- transition learner latency and scaling
- React `useState` versus `useLearnableState` overhead
- learning utility under deterministic, noisy, and random traces
- confidence thresholds
- prediction margin
- probability quality
- confidence reliability and calibration error
- policy comparisons against an always-adapt baseline

These experiments are implementation-level evidence for this repository, not general empirical claims about all React applications.

### Current observations

On the included traces, the learner strongly exploits predictable transition structure and tends to reject adaptation when confidence is low. The experiments also show that a fixed confidence threshold is not sufficient to guarantee low false-adaptation rates across all workloads.

This is an explicit design constraint of version 0.1.0.

## Development

```bash
pnpm install
pnpm test
pnpm run typecheck
pnpm run build
```

Benchmark:

```bash
pnpm run benchmark
pnpm run benchmark:react
```

Experiments:

```bash
pnpm run experiment:utility
pnpm run experiment:threshold
pnpm run experiment:margin
pnpm run experiment:policy
pnpm run experiment:probability
pnpm run experiment:reliability
```

## Design principles

- Preserve ordinary React state semantics.
- Keep learning logic independent from React.
- Separate prediction, confidence, decision, safety, and execution.
- Prefer deterministic fallback over uncontrolled adaptation.
- Measure behavior instead of assuming that learning is beneficial.
- Treat experimental mechanisms as experimental until supported by evidence.

## Research provenance

The architectural concepts motivating this experiment are related to the Learning-Native Adaptive Software Framework (LNASF):

https://github.com/peymanpro/learning-native-adaptive-software-framework

https://doi.org/10.5281/zenodo.22141992

This repository is an implementation experiment inspired by those architectural concepts. It does not claim novelty for the individual mathematical or software engineering techniques used here.

## Limitations of 0.1.0

- The learner is based on first-order transition frequencies.
- Confidence is a statistical lower bound for transition probability, not a calibrated guarantee that a prediction is correct.
- Prediction currently uses a linear scan over candidate next states.
- No persistence layer is included.
- No distributed learning is included.
- No eviction policy is included beyond the hard unique-transition limit.
- The current benchmark suite is intended for engineering and research exploration, not formal performance certification.

## License

MIT
