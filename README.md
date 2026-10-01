# react-learnable-usestate-hook

A TypeScript/React state-management library with online transition learning, statistical confidence estimation, safety constraints, and controlled state adaptation.

**Version:** 0.1.0 (Experimental)

This is a research-oriented implementation that explores how React state management can be augmented with lightweight online learning from observed state transitions. The project demonstrates this concept through reproducible tests, benchmarks, and synthetic workload evaluation.

It does **not** claim novelty in the mathematical techniques used, and it does **not** claim general-purpose superiority over ordinary `useState`.

---

## Overview

### Problem

Ordinary React state is application-controlled. The application explicitly calls `setState` to transition between states. There is no automatic learning from observed patterns or adaptation based on statistical evidence.

### Solution approach

`useLearnableState` adds an internal observation model that learns from committed state transitions without replacing deterministic application-driven updates. After each state change, the hook records the transition. At an explicit call to `advance()`, the learned model makes a prediction about the next state, computes statistical confidence, applies safety constraints, and optionally performs controlled adaptation.

### Key distinction

A prediction is not automatically an action. Adaptation is explicitly controlled by:

1. **Statistical thresholds** — confidence must exceed a configured minimum
2. **Margin thresholds** — the prediction must be sufficiently dominant
3. **Safety constraints** — application-defined rules must be satisfied
4. **Explicit invocation** — `advance()` must be called to attempt adaptation

Ordinary application-driven state updates remain fully deterministic and independent of learning.

---

## Architecture

The library consists of an independent learning/adaptation core integrated with React through a custom hook:

```text
React application
      |
      v
useLearnableState
      |
      v
LearnableStateEngine
      |
      +--> TransitionLearner
      +--> PredictionEngine
      +--> ConfidenceCalculator
      +--> DecisionPolicy
      +--> SafetyValidator
      +--> AdaptationExecutor
```

**TransitionLearner** observes committed state transitions and maintains online statistics about observed frequencies.

**PredictionEngine** uses empirical transition frequencies to select the most likely next state given the current state.

**ConfidenceCalculator** applies Wilson confidence intervals to provide a statistical lower bound for the probability of the selected prediction.

**DecisionPolicy** combines confidence, margin, and safety constraints to decide whether adaptation should be attempted.

**SafetyValidator** applies application-defined constraints before executing any adaptation.

**AdaptationExecutor** commits an adapted state if all conditions pass, or returns to the deterministic fallback.

---

## Conceptual lifecycle

The flow from an application state update to potential adaptation is:

```text
application calls setState
        ↓
React commits new state
        ↓
transition is observed
        ↓
learner updates frequency counts
        ↓
       [later]
        ↓
advance() is called
        ↓
prediction generated
        ↓
confidence computed
        ↓
decision gates checked
        ↓
safety constraints validated
        ↓
adaptation or fallback
```

Each step is separated so that prediction, confidence, decision, and adaptation are distinct and auditable concepts.

---

## Mathematical model

### State space and transitions

Let $S = \{s_1, s_2, \ldots, s_m\}$ be the set of observed states.

For two states $s_i$ and $s_j$, define the transition count as:

$$
N(s_i, s_j)
$$

This is the number of times a transition from $s_i$ to $s_j$ has been observed.

**Example:** For an observed sequence

$$
\text{home} \to \text{search} \to \text{home} \to \text{search} \to \text{profile}
$$

we have $N(\text{home}, \text{search}) = 2$ and $N(\text{home}, \text{profile}) = 0$.

The implementation stores these counts online as transitions are committed. There is no batch training phase.

### Empirical transition probability

Given the current state $s_i$, the empirical probability of observing $s_j$ next is:

$$
\hat{P}(s_j \mid s_i) = \frac{N(s_i, s_j)}{\sum_k N(s_i, s_k)}
$$

Let:

$$
n_i = \sum_k N(s_i, s_k)
$$

be the total number of transitions observed from $s_i$. Then:

$$
\hat{P}(s_j \mid s_i) = \frac{N(s_i, s_j)}{n_i}
$$

These probabilities form a valid distribution:

$$
\sum_j \hat{P}(s_j \mid s_i) = 1
$$

for any state with at least one observed outgoing transition.

### Prediction

The predictor selects the most frequently observed destination from the current state:

$$
\hat{s}_{t+1} = \underset{s_j}{\mathrm{arg\,max}} N(s_t, s_j)
$$

If multiple states tie for the highest frequency, the implementation uses the insertion order of the transition map as a deterministic tie-breaker. This is intentionally simple in version 0.1.0.

A prediction object exposes:

- Predicted state
- Empirical probability
- Runner-up probability
- Prediction margin
- Total observation count
- Statistical confidence

### Prediction probability and runner-up

The probability of the selected prediction is:

$$
P_1 = \hat{P}(\hat{s}_{t+1} \mid s_t)
$$

The probability of the second-most frequent candidate is:

$$
P_2 = \max_{s_j \ne \hat{s}_{t+1}} \hat{P}(s_j \mid s_t)
$$

The prediction margin quantifies how much the selected prediction dominates the runner-up:

$$
M = P_1 - P_2
$$

A large margin indicates high separation between the most likely and second-most-likely destinations. If no runner-up exists, $P_2 = 0$ and therefore $M = P_1$.

**Important:** Empirical probability $P_1$ is not the probability that the prediction will be correct. It is the observed frequency of that transition. Experiments in version 0.1.0 do not establish that margin provides a consistent improvement over confidence alone.

---

## Statistical confidence

### Why transition probability alone is insufficient

Consider two transition histories with identical empirical probabilities:

$$
\frac{9}{10} = 0.9 \quad \text{versus} \quad \frac{900}{1000} = 0.9
$$

Both yield probability 0.9, but the first has only 10 observations while the second has 1000. The statistical evidence is dramatically different.

Therefore, the system separately reports a confidence measure that reflects the strength of evidence for the selected transition.

### Wilson confidence interval

The implemented confidence metric uses the lower bound of the Wilson score interval.

For a transition observed $k$ times out of $n$ total transitions from the current state, let:

$$
\hat{p} = \frac{k}{n}
$$

At the default 95% confidence level:

$$
z = 1.96
$$

The lower bound of the Wilson interval is:

$$
L = \frac{
\hat{p} + \frac{z^2}{2n}
-
z\sqrt{
\frac{\hat{p}(1-\hat{p})}{n}
+
\frac{z^2}{4n^2}
}
}{
1+\frac{z^2}{n}
}
$$

This lower bound is clamped to $[0, 1]$ to prevent tiny floating-point artifacts.

The system reports this lower bound as the confidence value for a prediction.

### Critical distinction

$$
\text{transition probability} \ne \text{prediction correctness probability} \ne \text{confidence}
$$

- **Transition probability** ($\hat{P}$) describes the empirical distribution of observed next states from the current state.
- **Confidence** ($L$) is a statistical lower bound for the probability of the selected transition, accounting for sample size.
- **Prediction correctness probability** is neither of these; it would require additional modeling of whether future observations will match the learned distribution.

Experiments in this repository evaluate whether these quantities provide useful information for adaptation decisions. They are treated as separate and distinct concepts.

---

## Decision model

Adaptation is controlled by three gates that must all pass:

### Confidence threshold

Let $\tau_c$ be the configured confidence threshold. The confidence gate is:

$$
C \ge \tau_c
$$

### Margin threshold

Let $\tau_m$ be the optional margin threshold:

$$
M \ge \tau_m
$$

The default margin threshold is zero, so margin does not restrict decisions unless explicitly configured.

### Combined policy

Statistical adaptation is allowed if and only if both gates pass:

$$
C \ge \tau_c \quad \land \quad M \ge \tau_m
$$

### Safety constraints

Even when statistical conditions are met, application-defined safety constraints must be satisfied. For a predicted state $s$, define:

$$
\text{Safety}(s) = \bigwedge_{r=1}^{q} C_r(s)
$$

where $C_r(s)$ is the $r$-th constraint function.

### Final adaptation decision

Adaptation is performed if and only if:

$$
\text{Adapt} \iff C \ge \tau_c \quad \land \quad M \ge \tau_m \quad \land \quad \text{Safety}(s) = \text{true}
$$

Otherwise:

$$
\text{Decision} = \text{Fallback}
$$

The fallback returns the current deterministic application state.

---

## Online learning semantics

### Observation on commit

When the application calls `setState` or the React engine triggers a state update, the new state is applied immediately as ordinary React state. After React commits the update:

$$
N(s_t, s_{t+1}) \leftarrow N(s_t, s_{t+1}) + 1
$$

The transition is recorded in the learner's model. Observation is automatic; no explicit action is required.

### Prediction on explicit advance

Adaptation happens only when the application explicitly calls `advance()`:

$$
s_t \to \text{predict} \to \text{confidence} \to \text{decision} \to \text{safety} \to \text{adapt/fallback}
$$

The application retains full control. Learned adaptation does not occur silently and does not replace application-driven state updates.

### Functional updates

React's functional update pattern is supported:

```tsx
setState(prevState => nextState)
```

The transition is still observed after commit, using the resolved previous and next states.

---

## Computational complexity

For a source state $s_i$ with $K$ distinct observed destination states:

**Observation:**
$$
\text{observe} = O(1)
$$

Recording a transition requires a single dictionary lookup and increment.

**Probability lookup:**
$$
\text{getProbability} = O(1)
$$

Retrieving the frequency count for a specific transition is constant time.

**Prediction:**
$$
\text{predictNext} = O(K)
$$

Selecting the maximum-frequency destination requires scanning all $K$ candidates.

**Confidence computation:**
$$
\text{confidence} = O(1)
$$

Wilson interval calculation is a closed-form formula.

This implementation is intentionally simple and transparent. The algorithmic cost is dominated by prediction, which is linear in the number of observed destination states. Benchmarks in `benchmarks/transitionLearner.bench.ts` measure empirical scaling as $K$ varies.

---

## Memory bound

The learner optionally limits memory usage by bounding the number of unique transitions.

Let $U$ be the number of unique transitions currently observed and $M$ be the configured limit:

$$
U \le M
$$

When the limit is reached:

- **Existing transitions** continue to accumulate observations indefinitely.
- **New unique transitions** are rejected; an attempt to transition to a previously unseen destination is not recorded.
- **No eviction policy** is implemented in version 0.1.0.

The absence of eviction is deliberate. An eviction strategy would introduce another adaptive mechanism whose effects would need separate evaluation. By not evicting, the implementation preserves all historical observations up to the transition budget.

---

## React API

### Hook signature

```tsx
const [state, setState, learning] = useLearnableState(initialState, options);
```

**Parameters:**

- `initialState`: The initial state value of any type.
- `options`: Configuration object (optional).

**Returns:**

- `state`: Current application state.
- `setState`: Function to update state (same semantics as `useState`).
- `learning`: Object exposing learning-related properties and methods.

### setState

The `setState` function preserves the full `useState` API:

```tsx
setState(nextState);              // direct value
setState(prevState => nextState); // functional update
```

### learning object

The `learning` object exposes the following properties and methods:

**Properties:**

- `learning.prediction` — Current prediction result (or `null` if no prediction has been made).
- `learning.decision` — Current decision state (e.g., "adapt" or "fallback").
- `learning.observations` — Current transition frequency counts.
- `learning.lastResult` — Result of the most recent `advance()` call.

**Methods:**

- `learning.advance()` — Trigger prediction, confidence calculation, decision, and potential adaptation. Returns a result object.

### Configuration options

**`keyOf?: (state: T) => string | number`**

For primitive states (strings, numbers), the default key is the state value itself.

For object states, provide a function that extracts a stable unique key:

```tsx
type Page = { id: string; title: string };

const [page, setPage, learning] = useLearnableState(initialPage, {
  keyOf: page => page.id,
});
```

The key function defines state identity within the learning model. Ensure it returns consistent values for the same logical state.

**`confidenceThreshold?: number`**

Minimum Wilson confidence required for adaptation. Range: `[0, 1]`. Default: `0.8`.

Predictions with lower confidence are rejected even if margin and safety conditions pass.

**`marginThreshold?: number`**

Minimum prediction margin required for adaptation. Range: `[0, 1]`. Default: `0`.

If set to a positive value, the prediction must dominate its runner-up by at least this amount.

**`safetyConstraints?: Array<(nextState: T) => boolean>`**

Array of constraint functions. Each function receives the predicted next state and must return `true` for adaptation to be allowed.

All constraints must pass. If any returns `false`, adaptation is rejected and fallback occurs.

```tsx
const [state, setState, learning] = useLearnableState("home", {
  safetyConstraints: [
    nextState => nextState !== "blocked",
    nextState => nextState !== "error",
  ],
});
```

**`maxUniqueTransitions?: number`**

Optional limit on the number of unique transitions to record. Default: no limit.

---

## Examples

### Primitive state with confidence threshold

```tsx
import { useLearnableState } from "react-learnable-usestate-hook";

function PageNavigation() {
  const [page, setPage, learning] = useLearnableState("home", {
    confidenceThreshold: 0.85,
  });

  const handleNavigate = (nextPage) => {
    setPage(nextPage); // Apply state immediately
  };

  const handlePredictiveAdvance = () => {
    learning.advance(); // Trigger prediction and optional adaptation
  };

  return (
    <div>
      <p>Current page: {page}</p>
      <button onClick={() => handleNavigate("search")}>Search</button>
      <button onClick={() => handleNavigate("profile")}>Profile</button>
      <button onClick={handlePredictiveAdvance}>
        Auto-navigate (if confident)
      </button>
      {learning.prediction && (
        <p>
          Predicted next: {learning.prediction.predictedState}
          (confidence: {learning.prediction.confidence.toFixed(2)})
        </p>
      )}
    </div>
  );
}
```

### Object state with keyOf

```tsx
type Document = {
  id: string;
  title: string;
  content: string;
};

function DocumentEditor() {
  const [doc, setDoc, learning] = useLearnableState(initialDoc, {
    keyOf: d => d.id,
    confidenceThreshold: 0.8,
  });

  const updateContent = (newContent) => {
    setDoc(prev => ({ ...prev, content: newContent }));
  };

  const predictNextDocument = () => {
    learning.advance();
    if (learning.decision === "adapt") {
      // Adaptation occurred; use learning.prediction.predictedState
    }
  };

  return (
    <div>
      <h1>{doc.title}</h1>
      <textarea value={doc.content} onChange={e => updateContent(e.target.value)} />
      <button onClick={predictNextDocument}>Predict next document</button>
    </div>
  );
}
```

### Safety constraints

```tsx
const [state, setState, learning] = useLearnableState("home", {
  confidenceThreshold: 0.8,
  safetyConstraints: [
    nextState => !["blocked", "error"].includes(nextState),
    nextState => userHasPermissionFor(nextState),
  ],
});
```

If any constraint returns `false`, adaptation is rejected regardless of confidence or margin.

---

## Custom state identity

For object or complex states, the `keyOf` function is essential.

The learning model uses the key to identify unique states and build transition frequencies. Without a custom key function, the hook cannot correctly learn from object state transitions because object identity (reference equality) changes with every update.

Provide a `keyOf` function that returns a stable identifier for each logical state:

```tsx
type Page = { id: string; route: string };

const [page, setPage, learning] = useLearnableState(initialPage, {
  keyOf: p => p.id,
});
```

If `keyOf` is omitted for primitives, the state value itself is used as the key.

---

## Memory bound

To prevent unbounded memory growth, configure an upper limit on unique transitions:

```tsx
const [state, setState, learning] = useLearnableState(initialState, {
  maxUniqueTransitions: 100,
});
```

Once $U$ reaches $M = 100$, new transitions are rejected. Existing transitions continue to accumulate observations without eviction.

This design preserves historical data while preventing unlimited growth. The trade-off is that the model stops learning about new transition patterns after the limit is reached.

---

## Experimental evaluation

The repository includes reproducible experiments to evaluate the learned model's behavior.

### Workloads

Experiments use synthetic state transition traces designed to test different scenarios:

- **Deterministic traces** where each state has exactly one observed successor.
- **Mostly deterministic traces** with occasional noise.
- **Noisy traces** with multiple frequent successors and unpredictable transitions.
- **Random traces** where transitions are uniformly distributed.

### Utility experiments

Deterministic traces achieve near-perfect prediction accuracy (>99%) with high confidence.

Mostly deterministic traces retain high prediction accuracy (>90%) even with occasional noise.

Noisy traces reduce prediction accuracy and confidence proportionally to noise level.

Random traces produce poor prediction accuracy (<20%) and low confidence, resulting in no accepted adaptations under conservative policy settings.

**These results apply only to the tested synthetic workloads and are not general performance guarantees.**

### Threshold experiments

The repository includes sweeps over confidence thresholds to evaluate trade-offs between false-positive adaptations (incorrect predictions) and false-negative rejections (high-confidence predictions that are wrongly rejected).

Results show that fixed thresholds alone do not eliminate false positives and that threshold tuning is workload-dependent.

### Margin experiments

Experiments evaluate whether prediction margin provides additional predictive value beyond confidence alone.

Current results in version 0.1.0 do not establish that margin consistently improves adaptation accuracy. Margin is available as an optional gate but is not proven to be beneficial in all scenarios.

### Probability quality

The selected prediction probability $P_1$ is evaluated using:

1. **Accuracy:** Fraction of predictions that match the actual next state.
2. **Brier score:** Average squared error between predicted probability and correctness indicator.

The Brier score for the event "selected prediction is correct" is:

$$
BS = \frac{1}{N} \sum_{i=1}^{N} (p_i - y_i)^2
$$

where $p_i$ is the selected prediction probability and $y_i = 1$ if the prediction matched the actual transition, $y_i = 0$ otherwise.

Lower Brier scores indicate better probability calibration.

### Confidence reliability

Confidence reliability is evaluated by comparing predicted confidence levels to empirical accuracy across confidence buckets.

Expected calibration error (ECE) is computed as:

$$
\text{ECE} = \sum_b \frac{n_b}{N} \left| \text{acc}_b - \text{conf}_b \right|
$$

where $\text{acc}_b$ is the empirical accuracy within confidence bucket $b$ and $\text{conf}_b$ is the average predicted confidence in that bucket.

Lower ECE indicates better calibration between predicted and actual confidence.

**Important:** The computed ECE is an experiment-specific reliability measure. It does not constitute a universal calibration guarantee and should not be interpreted as proof that confidence estimates are universally valid across all possible workloads.

### Benchmark results

The repository includes separate benchmarks for core algorithm performance and React-level overhead.

**Core algorithm benchmark** (`benchmarks/transitionLearner.bench.ts`) measures:

- Transition observation latency
- Probability lookup latency
- Prediction computation time
- Memory consumption

Benchmarks are performed on a local machine and should be treated as engineering measurements, not formal performance certification.

**React benchmark** (`benchmarks/react.bench.ts`) measures the overhead of the hook within a React component render cycle.

**Experimental scripts:**

```bash
pnpm run experiment:utility
pnpm run experiment:threshold
pnpm run experiment:margin
pnpm run experiment:policy
pnpm run experiment:calibration
pnpm run experiment:probability
pnpm run experiment:reliability
```

---

## Performance observations

**Algorithm complexity:**

- Observation: $O(1)$
- Probability lookup: $O(1)$
- Prediction: $O(K)$ where $K$ is the number of observed destination states

**React overhead:**

The hook adds memory overhead for tracking transition frequencies and minimal computational overhead per state update. The React-level benchmark includes rendering cost, so algorithmic latency alone does not represent the actual impact on application performance.

**Benchmarks under `benchmarks/`:**

- `transitionLearner.bench.ts` — Core learner performance
- `react.bench.ts` — React integration overhead

Results from local benchmarks should be interpreted as engineering measurements in a specific environment, not as universally applicable performance characteristics.

---

## Design principles

- **Preserve React state semantics.** The hook fully supports direct and functional updates.
- **Learn from committed transitions.** Observation occurs after React commits state, not during speculative updates.
- **Keep learning independent from React.** The core learning engine is a separate module.
- **Separate concerns.** Observation, prediction, confidence, decision, safety, and execution are distinct stages.
- **Prefer deterministic fallback.** If any gate fails, the system returns to the current application state rather than attempting unvalidated adaptation.
- **Bound model growth.** Memory is optional-limited to prevent unbounded accumulation.
- **Measure behavior.** Experiments evaluate actual behavior rather than assuming learning is beneficial.
- **Keep mechanisms explicit.** Adaptation is explicitly triggered; there is no implicit or silent prediction-based state modification.

---

## Limitations of 0.1.0

- **First-order model.** The learner uses only single-step transition frequencies. No higher-order patterns or temporal dependencies are modeled.
- **Prediction complexity.** Prediction is $O(K)$ and becomes expensive if a state has many observed destinations.
- **Fixed thresholds.** Confidence and margin thresholds are statically configured. No adaptive threshold tuning is provided.
- **Wilson confidence limitations.** Wilson confidence is a statistical lower bound for transition probability, not a calibrated guarantee of prediction correctness. The relationship between confidence and prediction accuracy is workload-dependent.
- **Margin effectiveness.** Prediction margin is available but version 0.1.0 experiments do not establish that it provides consistent improvement over confidence alone.
- **No persistence.** The learned model is memory-resident and lost on application reload.
- **No distributed learning.** The model cannot be shared or synchronized across multiple instances or processes.
- **No eviction policy.** Once the unique transition limit is reached, new transitions are permanently rejected. No adaptive eviction strategy is implemented.
- **Synthetic evaluation.** Experiments use synthetic traces designed specifically for testing. Results are not representative of all React applications in production environments.
- **Tie-breaking.** In the case of equal-frequency predictions, selection is based on insertion order. This is deterministic but not semantically principled.

---

## Installation and setup

### Install as an npm package

After the package is published to npm, install it with `pnpm`:

```bash
pnpm add react-learnable-usestate-hook
```

Or with npm:

```bash
npm install react-learnable-usestate-hook
```

The library declares React as a peer dependency. A compatible React version must therefore already be installed in the consuming application.

Example:

```bash
pnpm add react react-dom react-learnable-usestate-hook
```

Then import the public API:

```tsx
import { useLearnableState } from "react-learnable-usestate-hook";
```

### Install the repository for development

To work on the library itself, clone the repository:

```bash
git clone https://github.com/peymanpro/react-learnable-usestate-hook.git
cd react-learnable-usestate-hook
```

Install all development dependencies with pnpm:

```bash
pnpm install
```

The repository uses `pnpm` as its package manager. The package manager version is declared in `package.json`.

After installation, run the standard verification commands:

```bash
pnpm test
pnpm run typecheck
pnpm run build
```

---

## Development commands

**Run tests:**

```bash
pnpm test
```

**Run TypeScript type checking:**

```bash
pnpm run typecheck
```

**Build the distributable package:**

```bash
pnpm run build
```

**Run the core learner benchmark:**

```bash
pnpm run benchmark
```

**Run the React integration benchmark:**

```bash
pnpm run benchmark:react
```

**Run the experimental evaluations:**

```bash
pnpm run experiment:utility
pnpm run experiment:threshold
pnpm run experiment:margin
pnpm run experiment:policy
pnpm run experiment:calibration
pnpm run experiment:probability
pnpm run experiment:reliability
```

**Validate the npm package contents locally:**

```bash
pnpm run pack:check
```

This creates a local npm tarball containing the files that would be distributed to consumers.

### Local package testing

Before publishing a release, the package can be built and packaged locally:

```bash
pnpm run build
pnpm run pack:check
```

The resulting `.tgz` archive can then be installed into another project with:

```bash
pnpm add /path/to/react-learnable-usestate-hook-0.1.0.tgz
```

This allows the package to be tested from the perspective of an external consumer before an npm release.

---

## Example

The repository includes a basic example under `examples/basic/` demonstrating:

```text
user updates state via setState
        ↓
React commits state
        ↓
transition is observed by learner
        ↓
learned transition model updated
        ↓
[explicit advance() called]
        ↓
prediction generated from model
        ↓
confidence computed
        ↓
decision gates checked
        ↓
safety constraints validated
        ↓
adaptation executed or fallback applied
```

The example illustrates the separation between application-driven state updates (which are immediate and deterministic) and learned adaptation (which is explicit and gated).

---

## Research provenance

This implementation is inspired by architectural concepts explored in the Learning-Native Adaptive Software Framework (LNASF):

- GitHub: https://github.com/peymanpro/learning-native-adaptive-software-framework
- Zenodo: https://doi.org/10.5281/zenodo.22141992

This repository is an implementation experiment informed by that framework's architectural principles. It does not claim novelty for standard statistical or software engineering techniques used here.

---

## License

MIT
