/**
 * Extract a human-readable message from a caught value. Catch variables are
 * unknown under useUnknownInCatchVariables; this narrows them without
 * changing what was previously displayed for Error instances.
 */
export const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);
