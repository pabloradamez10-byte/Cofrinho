import { validateAccount, validateTransaction } from "./validation.js";

const POSTED_STATUSES = new Set(["cleared"]);
const COMMITTED_STATUSES = new Set(["pending", "scheduled"]);

function normalizeDescription(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function transactionFingerprint(transaction) {
  return [
    transaction.type,
    transaction.date.slice(0, 10),
    transaction.amountCents,
    normalizeDescription(transaction.description),
    transaction.sourceAccountId ?? "",
    transaction.destinationAccountId ?? "",
  ].join("|");
}

export function findDuplicate(transaction, existingTransactions) {
  if (transaction.dedupeKey) {
    const exact = existingTransactions.find((item) => item.dedupeKey === transaction.dedupeKey);
    if (exact) return { duplicate: true, match: exact, reason: "dedupe-key" };
  }
  const fingerprint = transactionFingerprint(transaction);
  const match = existingTransactions.find((item) => transactionFingerprint(item) === fingerprint);
  return match
    ? { duplicate: true, match, reason: "fingerprint" }
    : { duplicate: false, match: null, reason: null };
}

export function calculateAccountBalances(accounts, transactions, options = {}) {
  const includePending = options.includePending ?? false;
  const validAccounts = accounts.map(validateAccount);
  const accountIds = new Set(validAccounts.map((account) => account.id));
  const balances = Object.fromEntries(
    validAccounts.map((account) => [account.id, account.openingBalanceCents ?? 0])
  );

  for (const transaction of transactions) {
    validateTransaction(transaction, accountIds);
    const shouldPost = POSTED_STATUSES.has(transaction.status)
      || (includePending && COMMITTED_STATUSES.has(transaction.status));
    if (!shouldPost || transaction.status === "cancelled") continue;

    if (transaction.type === "income") balances[transaction.destinationAccountId] += transaction.amountCents;
    if (transaction.type === "expense") balances[transaction.sourceAccountId] -= transaction.amountCents;
    if (transaction.type === "transfer") {
      balances[transaction.sourceAccountId] -= transaction.amountCents;
      balances[transaction.destinationAccountId] += transaction.amountCents;
    }
  }
  return balances;
}

export function summarizePeriod(transactions, startDate, endDate) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    throw new TypeError("Período inválido.");
  }

  const summary = transactions.reduce(
    (summary, transaction) => {
      validateTransaction(transaction);
      const time = new Date(transaction.date).getTime();
      if (!POSTED_STATUSES.has(transaction.status) || time < start || time > end) return summary;
      if (transaction.type === "income") summary.incomeCents += transaction.amountCents;
      if (transaction.type === "expense") summary.expenseCents += transaction.amountCents;
      return summary;
    },
    { incomeCents: 0, expenseCents: 0, netCents: 0 }
  );
  summary.netCents = summary.incomeCents - summary.expenseCents;
  return summary;
}

export function calculateFinancialPosition(accounts, transactions, untilDate) {
  const balances = calculateAccountBalances(accounts, transactions);
  const totalBalanceCents = accounts.reduce(
    (sum, account) => sum + (account.active === false ? 0 : balances[account.id]),
    0
  );
  const reservedCents = accounts.reduce(
    (sum, account) => sum + (account.active === false || !account.reserved ? 0 : balances[account.id]),
    0
  );
  const cutoff = new Date(untilDate).getTime();
  if (!Number.isFinite(cutoff)) throw new TypeError("Data limite inválida.");

  const committedCents = transactions.reduce((sum, transaction) => {
    validateTransaction(transaction);
    const due = new Date(transaction.dueDate ?? transaction.date).getTime();
    return transaction.type === "expense"
      && COMMITTED_STATUSES.has(transaction.status)
      && due <= cutoff
      ? sum + transaction.amountCents
      : sum;
  }, 0);

  return {
    balances,
    totalBalanceCents,
    reservedCents,
    committedCents,
    freeMoneyCents: totalBalanceCents - reservedCents - committedCents,
  };
}
