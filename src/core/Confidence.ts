export interface ConfidenceEstimate {
  readonly probability: number;
  readonly observations: number;
  readonly successes: number;
  readonly lowerBound: number;
}

export function wilsonLowerBound(
  successes: number,
  observations: number,
  z = 1.96
): number {
  if (!Number.isFinite(successes) || !Number.isFinite(observations) || !Number.isFinite(z)) {
    throw new Error("successes, observations, and z must be finite numbers");
  }

  if (observations < 0 || successes < 0 || successes > observations) {
    throw new Error("successes and observations must satisfy 0 <= successes <= observations");
  }

  if (observations === 0) {
    return 0;
  }

  if (z < 0) {
    throw new Error("z must be non-negative");
  }

  const p = successes / observations;
  const zSquared = z * z;
  const denominator = 1 + zSquared / observations;
  const center = p + zSquared / (2 * observations);
  const margin = z * Math.sqrt(
    (p * (1 - p)) / observations +
    zSquared / (4 * observations * observations)
  );

  const lowerBound = (center - margin) / denominator;

  return Math.min(1, Math.max(0, lowerBound));
}

export function estimateConfidence(
  successes: number,
  observations: number,
  z = 1.96
): ConfidenceEstimate {
  const probability = observations === 0 ? 0 : successes / observations;

  return {
    probability,
    observations,
    successes,
    lowerBound: wilsonLowerBound(successes, observations, z)
  };
}
