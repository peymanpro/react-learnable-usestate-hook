import { JSDOM } from "jsdom";
import { Bench } from "tinybench";
import { renderHook, act } from "@testing-library/react";
import { useState } from "react";
import { useLearnableState } from "../src/index.js";

const dom = new JSDOM("<!doctype html><html><body></body></html>");

const globals = globalThis as typeof globalThis & {
  window: Window;
  document: Document;
  navigator: Navigator;
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

globals.window = dom.window as unknown as Window;
globals.document = dom.window.document;
globals.navigator = dom.window.navigator;
globals.IS_REACT_ACT_ENVIRONMENT = true;

const UPDATE_COUNT = 100;

const values = Array.from(
  { length: UPDATE_COUNT },
  (_, index) => index + 1
);

function runUpdates<TState>(
  result: { current: readonly [TState, (value: TState) => void] },
  sequence: readonly TState[]
) {
  for (const value of sequence) {
    act(() => {
      result.current[1](value);
    });
  }
}

const bench = new Bench({ time: 1500 });

bench.add("useState - 100 updates", () => {
  const { result } = renderHook(() => useState(0));
  runUpdates(result, values);
});

bench.add("useLearnableState - 100 updates", () => {
  const { result } = renderHook(() => useLearnableState(0));
  runUpdates(result, values);
});

bench.add("useLearnableState - 100 repeated updates", () => {
  const { result } = renderHook(() => useLearnableState(0, {
    confidenceThreshold: 0.1
  }));

  runUpdates(result, values);

  for (let i = 0; i < UPDATE_COUNT; i += 1) {
    act(() => {
      result.current[2].advance();
    });
  }
});

await bench.run();

console.table(bench.table());
