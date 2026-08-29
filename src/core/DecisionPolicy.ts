
export type AdaptationDecision = "adapt" | "fallback";

export interface DecisionPolicyOptions {
  readonly confidenceThreshold: number;
}

export class DecisionPolicy {
  private readonly confidenceThreshold: number;

  constructor(options: DecisionPolicyOptions) {
    if (
      !Number.isFinite(options.confidenceThreshold) ||
      options.confidenceThreshold < 0 ||
      options.confidenceThreshold > 1
    ) {
      throw new Error("confidenceThreshold must be between 0 and 1");
    }

    this.confidenceThreshold = options.confidenceThreshold;
  }

  decide(confidence: number): AdaptationDecision {
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new Error("confidence must be between 0 and 1");
    }

    return confidence >= this.confidenceThreshold
      ? "adapt"
      : "fallback";
  }
}
