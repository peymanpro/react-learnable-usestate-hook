# Basic Example

This example demonstrates the intended `useLearnableState` workflow.

1. Update state explicitly with `setPage`.
2. The hook observes committed transitions.
3. The learner builds a transition model.
4. A prediction is exposed together with probability and confidence.
5. `advance()` explicitly asks the system to evaluate and potentially apply the learned prediction.

The example intentionally keeps adaptation explicit. A normal state update is never silently replaced by a learned prediction.
