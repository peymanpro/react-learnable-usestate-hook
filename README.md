# react-learnable-usestate-hook

An experimental React hook that augments `useState` with lightweight online transition learning, statistical confidence estimation, safety constraints, and controlled adaptation.

## Status

**Version:** 0.1.0

This is a research-oriented experimental implementation. The project demonstrates a concrete learning-enabled state mechanism and evaluates its behavior with reproducible tests, benchmarks, and synthetic workloads.

It does **not** claim that the mathematical techniques used here are novel, and it does **not** claim general-purpose superiority over ordinary React state.

## Concept

Ordinary React state is application-controlled:

$$
s_{t+1}=f(s_t,a_t)
$$

where `s_t` is the current state and `a_t` is an application action or update.

`useLearnableState` adds an internal observation model without replacing deterministic state updates:

$$
s_t \\rightarrow s_{t+1}
$$

is observed after the state transition has been committed.

The system then separates five concepts:

$$
\\text{Observation}
\\rightarrow
\\text{Prediction}
\\rightarrow
\\text{Confidence}
\\rightarrow
\\text{Decision}
\\rightarrow
\\text{Adaptation}
$$

The central design principle is:

> A prediction is not automatically an action.

## Mathematical model

### 1. State transition observations

Let:

$$
S=\\{s_1,s_2,\\ldots,s_m\\}
$$

be the set of observed states.

For two states `s_i` and `s_j`, define the transition count:

$$
N(s_i,s_j)
$$

as the number of observed transitions from `s_i` to `s_j`.

For example, suppose the observed sequence is:

$$
\\text{home}\\rightarrow\\text{search}\\rightarrow\\text{home}\\rightarrow\\text{search}\\rightarrow\\text{profile}
$$

Then:

$$
N(\\text{home},\\text{search})=2
$$

and:

$$
N(\\text{home},\\text{profile})=0.
$$

The implementation stores these observations online; there is no batch training phase.

### 2. Empirical transition probability

For a current state `s_i`, the empirical probability of observing `s_j` next is the maximum-likelihood estimate:

$$
\\hat P(s_j\\mid s_i)
=
\\frac{N(s_i,s_j)}
{\\sum_k N(s_i,s_k)}.
$$

The denominator is the total number of observed transitions originating from `s_i`:

$$
n_i=\\sum_k N(s_i,s_k).
$$

Therefore:

$$
\\hat P(s_j\\mid s_i)=\\frac{N(s_i,s_j)}{n_i}.
$$

The probabilities satisfy:

$$
\\sum_j \\hat P(s_j\\mid s_i)=1
$$

for a state with at least one observed outgoing transition.

### 3. Prediction

The current predictor chooses the most frequently observed next state:

$$
\\hat s_{t+1}
=
\\underset{s_j}{\\operatorname{arg\\,max}}
\\;N(s_t,s_j).
$$

If several states have equal frequency, the current implementation follows the insertion order of the underlying transition map. This tie-breaking rule is intentionally simple in version 0.1.0.

The resulting prediction contains:

- predicted state
- empirical probability
- runner-up probability
- prediction margin
- observation count
- statistical confidence

### 4. Prediction probability

Let:

$$
P_1=\\hat P(\\hat s_{t+1}\\mid s_t)
$$

be the probability of the selected prediction.

The prediction result exposes this probability directly.

Important: `P_1` is the observed transition frequency. It is **not automatically the probability that the next prediction will be correct**.

### 5. Runner-up probability and margin

Let `P_2` be the probability of the second most frequently observed candidate:

$$
P_2=\\max_{s_j\\neq\\hat s_{t+1}}
\\hat P(s_j\\mid s_t).
$$

The prediction margin is:

$$
M=P_1-P_2.
$$

A large margin means the selected candidate is much more dominant than its nearest competitor.

If there is no runner-up:

$$
P_2=0
$$

and therefore:

$$
M=P_1.
$$

The margin is available to the decision policy, but experiments in version 0.1.0 do not establish that margin provides a general improvement over confidence alone.

## Statistical confidence

### 6. Why probability is not enough

Consider two datasets with the same empirical probability:

$$
\\frac{9}{10}=0.9
$$

and:

$$
\\frac{900}{1000}=0.9.
$$

The observed proportion is identical, but the amount of statistical evidence is very different.

Therefore the project reports a separate confidence measure.

### 7. Wilson lower confidence bound

For a selected transition with `k` successes out of `n` observations, let:

$$
\\hat p=\\frac{k}{n}.
$$

For the default 95% confidence level:

$$
z=1.96.
$$

The lower bound of the Wilson interval is:

$$
L
=
\\frac
{
\\hat p+\\frac{z^2}{2n}
-
z\\sqrt{
\\frac{\\hat p(1-\\hat p)}{n}
+
\\frac{z^2}{4n^2}
}
}
{
1+\\frac{z^2}{n}
}.
$$

The implementation uses this lower bound as the confidence value exposed by a prediction.

The result is clamped to:

$$
0\\le L\\le1
$$

to protect the public API from tiny floating-point boundary errors.

### 8. Interpretation

The important distinction is:

$$
\\text{transition probability}
\\neq
\\text{probability of prediction correctness}
\\neq
\\text{confidence}
$$

Transition probability describes the empirical transition distribution.

Wilson confidence describes the statistical lower bound for the estimated probability of the selected transition.

Experiments in this repository evaluate whether these quantities provide useful information for adaptation decisions; they are not treated as interchangeable concepts.

## Decision model

### 9. Confidence threshold

Let `\\tau_c` be the configured confidence threshold.

The confidence condition is:

$$
C\\ge\\tau_c.
$$

### 10. Margin threshold

Let `\\tau_m` be the optional margin threshold:

$$
M\\ge\\tau_m.
$$

The current policy therefore permits adaptation only when both configured conditions pass:

$$
C\\ge\\tau_c
\\quad\\land\\quad
M\\ge\\tau_m.
$$

The default margin threshold is zero, so margin does not restrict decisions unless explicitly configured.

### 11. Safety constraint

Even a statistically acceptable prediction can be rejected by application-defined safety constraints.

For a predicted state `s`, define:

$$
Safety(s)\\in\\{\\text{true},\\text{false}\\}.
$$

With multiple constraints:

$$
Safety(s)
=
\\bigwedge_{r=1}^{q} C_r(s).
$$

Adaptation is therefore allowed only when:

$$
Decision=Adapt
$$

if and only if:

$$
C\\ge\\tau_c
\\quad\\land\\quad
M\\ge\\tau_m
\\quad\\land\\quad
Safety(s)=\\text{true}.
$$

Otherwise:

$$
Decision=Fallback.
$$

The fallback state is the current deterministic state.

## Online learning lifecycle

For a normal state update:

$$
s_t\\rightarrow s_{t+1}
$$

is first applied as ordinary React state.

After React commits the new state, the transition is observed:

$$
N(s_t,s_{t+1})\\leftarrow N(s_t,s_{t+1})+1.
$$

At a later explicit `advance()` call:

$$
s_t
\\rightarrow
\\text{predict}
\\rightarrow
\\text{confidence}
\\rightarrow
\\text{decision}
\\rightarrow
\\text{safety}
\\rightarrow
\\text{adapt/fallback}.
$$

The learned adaptation is **explicitly triggered**. The hook does not silently replace every application-controlled state update with a learned prediction.

## Complexity

For a source state with `K` distinct observed destinations:

$$
\\text{observe}=O(1)
$$

and the probability lookup is:

$$
\\text{getProbability}=O(1).
$$

Current prediction selection scans the candidate destinations:

$$
\\text{predictNext}=O(K).
$$

This implementation is intentionally simple and transparent. Benchmarks in `benchmarks/transitionLearner.bench.ts` measure how this scales as `K` grows.

## Memory bound

The learner optionally limits the number of unique transitions:

$$
U\\le M
$$

where `M` is `maxUniqueTransitions`.

When the limit is reached:

- existing transitions can continue accumulating observations
- new unique transitions are rejected
- there is no eviction policy in version 0.1.0

The absence of eviction is deliberate: eviction would introduce another learning policy whose effects would need separate evaluation.

## React API

```tsx
import { useLearnableState } from "react-learnable-usestate-hook";

const [state, setState, learning] = useLearnableState("home", {
  confidenceThreshold: 0.8,
  marginThreshold: 0.2,
});
```

The tuple is:

```text
[state, setState, learning]
```

`setState` preserves the familiar direct-value and functional-update patterns.

The learning object exposes:

```text
learning.prediction
learning.decision
learning.observations
learning.lastResult
learning.advance()
```

## Custom state identity

For `string` and `number` states, the default key is the state value itself.

For object states, supply a stable identity function:

```tsx
type Page = {
  id: string;
  title: string;
};

const [page, setPage, learning] = useLearnableState<Page>(initialPage, {
  keyOf: page => page.id,
});
```

The `keyOf` function defines the identity used by the transition model.

## Safety constraints

```tsx
const [state, setState, learning] = useLearnableState("home", {
  safetyConstraints: [
    nextState => nextState !== "blocked",
  ],
});
```

Every configured constraint must pass before an adaptation is accepted.

## Example

The repository contains a small example under `examples/basic/` demonstrating:

```text
user update
    ↓
committed state
    ↓
observation
    ↓
learned transition model
    ↓
prediction
    ↓
confidence + margin
    ↓
decision + safety
    ↓
explicit adaptation
```

## Experimental evaluation

The repository intentionally treats empirical evidence as part of the implementation.

### Utility experiments

The included synthetic traces demonstrate that the current learner can exploit predictable transition structure while becoming conservative when confidence is low.

The included experiments have observed behavior such as:

- deterministic traces achieving near-perfect prediction
- mostly deterministic traces retaining high prediction accuracy
- noisy traces producing substantially lower confidence
- random traces producing low-quality predictions and no accepted adaptation under conservative thresholds

These are results for the repository's synthetic workloads only; they are not general performance or accuracy guarantees.

### Probability quality

The repository also evaluates the quality of the empirical transition probability using accuracy and a Brier-style score for the event that the selected prediction is correct.

The Brier score used by the experiment is:

$$
BS
=
\\frac{1}{N}
\\sum_{i=1}^{N}
(p_i-y_i)^2,
$$

where `p_i` is the selected prediction probability and `y_i` is 1 when the prediction is correct and 0 otherwise.

Lower scores are better.

### Reliability

Confidence reliability is evaluated using bucketed empirical accuracy and expected calibration error:

$$
ECE
=
\\sum_b
\\frac{n_b}{N}
\\left|
acc_b-conf_b
\\right|.
$$

This should be interpreted as an experiment-specific reliability measure, not a universal calibration guarantee.

## Performance observations

The current data structure provides approximately constant-time probability lookup, while prediction remains linear in the number of unique candidate destinations.

The repository includes separate React-level benchmarks because algorithmic latency alone does not represent the overhead experienced by a React application.

The current benchmark results should be treated as engineering measurements, not formal performance certification.

## Design principles

- Preserve ordinary React state semantics.
- Learn from committed transitions rather than speculative updates.
- Keep learning logic independent from React.
- Separate probability, confidence, prediction, decision, safety, and execution.
- Prefer deterministic fallback over uncontrolled adaptation.
- Bound model growth.
- Measure behavior instead of assuming that learning is beneficial.
- Keep experimental mechanisms explicit.

## Limitations of 0.1.0

- The learner uses first-order transition frequencies.
- Prediction selection is currently `O(K)` over candidate destinations.
- Wilson confidence is a statistical lower bound for transition probability, not a calibrated guarantee of prediction correctness.
- Fixed thresholds are not proven optimal.
- Prediction margin is experimental and is not established as a general improvement.
- No persistence layer is included.
- No distributed learning is included.
- No transition eviction strategy is included.
- The experiments use synthetic traces and are not representative of all React applications.

## Development

```bash
pnpm install
pnpm test
pnpm run typecheck
pnpm run build
```

Benchmarks:

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
pnpm run experiment:calibration
pnpm run experiment:probability
pnpm run experiment:reliability
```

## Research provenance

This implementation is inspired by architectural concepts explored in the Learning-Native Adaptive Software Framework (LNASF).

https://github.com/peymanpro/learning-native-adaptive-software-framework

https://doi.org/10.5281/zenodo.22141992

This repository is an implementation experiment inspired by those ideas and does not claim novelty for standard mathematical or software-engineering techniques used here.

## License

MIT
