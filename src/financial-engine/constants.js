export const ACCOUNT_TYPES = Object.freeze([
  "checking",
  "cash",
  "digital_wallet",
  "savings",
  "investment",
  "credit_card",
  "other",
]);

export const TRANSACTION_TYPES = Object.freeze(["income", "expense", "transfer"]);

export const TRANSACTION_STATUSES = Object.freeze([
  "detected",
  "awaiting_confirmation",
  "confirmed",
  "corrected",
  "ignored",
  "reversed",
  // Estados da versão 1, mantidos para migração sem perda.
  "cleared",
  "pending",
  "scheduled",
  "cancelled",
]);

export const TRANSACTION_ORIGINS = Object.freeze([
  "manual",
  "statement",
  "autopilot",
  "atlas",
  "receipt",
  "notification",
]);

export const RECONCILIATION_STATUSES = Object.freeze([
  "unreconciled",
  "reconciled",
  "difference_found",
  "needs_review",
]);
