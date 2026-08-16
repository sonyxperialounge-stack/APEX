/** Error types. Messages are the product: they must tell the model what to do instead. */

export class ApexError extends Error {
  code: string

  constructor(message: string, code = "APEX_ERROR") {
    super(message)
    this.name = "ApexError"
    this.code = code
  }
}

/** An illegal ledger status transition. The message names the legal path. */
export class IllegalTransitionError extends ApexError {
  constructor(message: string) {
    super(message, "ILLEGAL_TRANSITION")
    this.name = "IllegalTransitionError"
  }
}

/** A guarded operation was refused. `rule` identifies which rule fired. */
export class BlockedError extends ApexError {
  rule: string

  constructor(message: string, rule: string) {
    super(message, "BLOCKED")
    this.name = "BlockedError"
    this.rule = rule
  }
}

/**
 * A user-named model is unavailable and APEX will not substitute one.
 * See core/13-FLEET.md FLT-004. There is deliberately no automatic recovery.
 */
export class UserDecisionRequired extends ApexError {
  unavailable: string[]
  available: string[]

  constructor(message: string, unavailable: string[], available: string[]) {
    super(message, "USER_DECISION_REQUIRED")
    this.name = "UserDecisionRequired"
    this.unavailable = unavailable
    this.available = available
  }
}
