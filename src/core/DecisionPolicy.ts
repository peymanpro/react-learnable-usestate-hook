export type AdaptationDecision = "adapt" | "fallback";

export interface DecisionPolicyOptions {
  readonly confidenceThreshold: number;
  readonly marginThreshold?: number;
}

export interface DecisionPolicyInput {
  readonly confidence: number;
  readonly margin: number;
}

export class DecisionPolicy {
  private readonly confidenceThreshold: number;
  private readonly marginThreshold: number;

  constructor(options: DecisionPolicyOptions) {
    if (
      !Number.isFinite(options.confidenceThreshold) ||
      options.confidenceThreshold < 0 ||
      options.confidenceThreshold > 1
    ) {
      throw new Error("confidenceThreshold must be between 0 and 1");
    }

    const marginThreshold = options.marginThreshold ?? 0;

    if (
      !Number.isFinite(marginThreshold) ||
      marginThreshold < 0 ||
      marginThreshold > 1
    ) {
      throw new Error("marginThreshold must be between 0 and 1");
    }

    this.confidenceThreshold = options.confidenceThreshold;
    this.marginThreshold = marginThreshold;
  }

  decide(input: DecisionPolicyInput): AdaptationDecision {
    if (
      !Number.isFinite(input.confidence) ||
      input.confidence < 0 ||
      input.confidence > 1
    ) {
      throw new Error("confidence must be between 0 and 1");
    }

    if (
      !Number.isFinite(input.margin) ||
      input.margin < 0 ||
      input.margin > 1
    ) {
      throw new Error("margin must be between 0 and 1");
    }

    return input.confidence >= this.confidenceThreshold &&
      input.margin >= this.marginThreshold
      ? "adapt"
      : "fallback";
  }
}
