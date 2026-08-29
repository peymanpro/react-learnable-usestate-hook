import { useLearnableState } from "react-learnable-usestate-hook";

type Page = "home" | "search" | "profile";

export function App() {
  const [page, setPage, learning] = useLearnableState<Page>("home", {
    confidenceThreshold: 0.8,
    marginThreshold: 0.2,
  });

  return (
    <main>
      <h1>Learnable State Example</h1>

      <p>Current page: {page}</p>

      <p>
        Prediction:{ " " }
        {learning.prediction?.state ?? "none"}
      </p>

      <p>
        Probability:{ " " }
        {learning.prediction
          ? learning.prediction.probability.toFixed(3)
          : "none"}
      </p>

      <p>
        Confidence:{ " " }
        {learning.prediction
          ? learning.prediction.confidence.toFixed(3)
          : "none"}
      </p>

      <p>
        Decision:{ " " }
        {learning.decision?.decision ?? "none"}
      </p>

      <button onClick={() => setPage("search")}>
        Go to search
      </button>

      <button onClick={() => setPage("home")}>
        Go to home
      </button>

      <button onClick={() => setPage("profile")}>
        Go to profile
      </button>

      <button
        disabled={learning.prediction === null}
        onClick={() => learning.advance()}
      >
        Advance using learned prediction
      </button>

      <p>Last result: {learning.lastResult ?? "none"}</p>
    </main>
  );
}
