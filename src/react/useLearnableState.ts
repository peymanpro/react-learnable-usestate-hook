import { useState } from "react";

export type SetLearnableStateAction<T> =
  | T
  | ((previousState: T) => T);

export function useLearnableState<T>(
  initialState: T | (() => T)
): readonly [T, (action: SetLearnableStateAction<T>) => void] {
  return useState<T>(initialState);
}
