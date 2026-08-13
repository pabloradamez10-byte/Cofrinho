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
]);
