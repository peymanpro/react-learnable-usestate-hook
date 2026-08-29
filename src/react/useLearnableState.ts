import { useCallback, useRef, useState } from "react";
import type { SetStateAction } from "react";
import { AdaptationDecisionEngine } from "../core/AdaptationDecisionEngine.js";
import { AdaptationExecutor } from "../core/AdaptationExecutor.js";
import { DecisionPolicy } from "../core/DecisionPolicy.js";
import { LearnableStateEngine } from "../core/LearnableStateEngine.js";
import { SafetyConstraints } from "../core/SafetyConstraints.js";
import { TransitionLearner } from "../core/TransitionLearner.js";
import type { LearnableStateLearning, LearnableStateOptions } from "./types.js";

function defaultKeyOf<TState>(state: TState): string | number {
  if (typeof state === "string" || typeof state === "number") {
    return state;
  }

  throw new Error(
    "keyOf is required for non-string and non-number state values"
  );
}

export function useLearnableState<TState>(
  initialState: TState | (() => TState),
  options: LearnableStateOptions<TState> = {}
): readonly [
  TState,
  (action: SetStateAction<TState>) => void,
  LearnableStateLearning<TState>
] {
  const [state, setState] = useState<TState>(initialState);
  const [, forceLearningUpdate] = useState(0);
  const engineRef = useRef<LearnableStateEngine<TState> | null>(null);
  const lastResultRef = useRef<"adapted" | "fallback" | null>(null);

  if (engineRef.current === null) {
    const learner = new TransitionLearner<TState>({
      keyOf: options.keyOf ?? defaultKeyOf
    });

    const policy = new DecisionPolicy({
      confidenceThreshold: options.confidenceThreshold ?? 0.8
    });

    const safety = new SafetyConstraints<TState>(
      options.safetyConstraints ?? []
    );

    const decisionEngine = new AdaptationDecisionEngine<TState>({
      policy,
      safety
    });

    const executor = new AdaptationExecutor<TState>();

    engineRef.current = new LearnableStateEngine({
      learner,
      decisionEngine,
      executor
    });
  }

  const engine = engineRef.current;

  const setLearnableState = useCallback(
    (action: SetStateAction<TState>) => {
      setState(current => {
        const next = typeof action === "function"
          ? (action as (previousState: TState) => TState)(current)
          : action;

        if (Object.is(current, next)) {
          return current;
        }

        engine.observe(current, next);
        return next;
      });

      forceLearningUpdate(value => value + 1);
    },
    [engine]
  );

  const advance = useCallback(() => {
    const evaluation = engine.evaluate(state);
    lastResultRef.current = evaluation.result;

    if (evaluation.result === "adapted") {
      setLearnableState(evaluation.state);
    }

    forceLearningUpdate(value => value + 1);
    return evaluation.result;
  }, [engine, setLearnableState, state]);

  const evaluation = engine.evaluate(state);

  const learning: LearnableStateLearning<TState> = {
    prediction: evaluation.prediction,
    decision: evaluation.decision,
    observations: evaluation.prediction?.observations ?? 0,
    lastResult: lastResultRef.current,
    advance
  };

  return [state, setLearnableState, learning];
}

export type { SetStateAction as SetLearnableStateAction } from "react";
