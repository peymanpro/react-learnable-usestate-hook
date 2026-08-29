import { useCallback, useEffect, useRef, useState } from "react";
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

interface CommittedState<TState> {
  initialized: boolean;
  value: TState;
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
  const skipNextObservationRef = useRef(false);
  const committedStateRef = useRef<CommittedState<TState>>({
    initialized: false,
    value: state
  });

  if (engineRef.current === null) {
    const learner = new TransitionLearner<TState>({
      keyOf: options.keyOf ?? defaultKeyOf
    });

    const policy = new DecisionPolicy({
      confidenceThreshold: options.confidenceThreshold ?? 0.8,
      marginThreshold: options.marginThreshold ?? 0
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

  useEffect(() => {
    if (!committedStateRef.current.initialized) {
      committedStateRef.current = {
        initialized: true,
        value: state
      };
      return;
    }

    const previousState = committedStateRef.current.value;

    if (Object.is(previousState, state)) {
      return;
    }

    committedStateRef.current.value = state;

    if (skipNextObservationRef.current) {
      skipNextObservationRef.current = false;
      return;
    }

    engine.observe(previousState, state);
  }, [engine, state]);

  const setLearnableState = useCallback(
    (action: SetStateAction<TState>) => {
      setState(action);
    },
    []
  );

  const advance = useCallback(() => {
    const evaluation = engine.evaluate(state);
    lastResultRef.current = evaluation.result;

    if (evaluation.result === "adapted" && !Object.is(evaluation.state, state)) {
      skipNextObservationRef.current = true;
      setState(evaluation.state);
    } else {
      forceLearningUpdate(value => value + 1);
    }

    return evaluation.result;
  }, [engine, state]);

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
