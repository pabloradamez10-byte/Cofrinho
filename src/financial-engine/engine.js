import { validateAccount, validateTransaction } from "./validation.js";

const POSTED_STATUSES = new Set(["cleared", "confirmed", "corrected"]);
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
    if (transaction.reversesTransactionId) continue;
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
      if (transaction.reversesTransactionId) return summary;
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

export function reconcileAccount(account, calculatedBalanceCents, statementBalanceCents, reconciledAt) {
  validateAccount(account);
  if (!Number.isSafeInteger(calculatedBalanceCents) || !Number.isSafeInteger(statementBalanceCents)) {
    throw new TypeError("Os saldos da conciliação devem estar em centavos.");
  }
  if (Number.isNaN(Date.parse(reconciledAt))) throw new TypeError("Data de conciliação inválida.");
  const differenceCents = statementBalanceCents - calculatedBalanceCents;
  return {
    ...account,
    statementBalanceCents,
    lastReconciledAt: reconciledAt,
    reconciliationDifferenceCents: differenceCents,
    reconciliationStatus: differenceCents === 0 ? "reconciled" : "difference_found",
  };
}

export function confirmTransaction(transaction, confirmedAt) {
  validateTransaction(transaction);
  if (!["detected", "awaiting_confirmation", "pending"].includes(transaction.status)) {
    throw new TypeError("Somente um lançamento pendente pode ser confirmado.");
  }
  if (Number.isNaN(Date.parse(confirmedAt))) throw new TypeError("Data de confirmação inválida.");
  return { ...transaction, status: "confirmed", confirmedAt, updatedAt: confirmedAt };
}

export function correctTransaction(transaction, changes, correctedAt) {
  validateTransaction(transaction);
  if (!["confirmed", "corrected", "cleared"].includes(transaction.status)) {
    throw new TypeError("Somente um lançamento confirmado pode ser corrigido.");
  }
  if (Number.isNaN(Date.parse(correctedAt))) throw new TypeError("Data de correção inválida.");
  const corrected = {
    ...transaction,
    ...changes,
    id: transaction.id,
    status: "corrected",
    correctedAt,
    updatedAt: correctedAt,
  };
  validateTransaction(corrected);
  return corrected;
}

function reverseType(transaction) {
  if (transaction.type === "income") {
    return { type: "expense", sourceAccountId: transaction.destinationAccountId };
  }
  if (transaction.type === "expense") {
    return { type: "income", destinationAccountId: transaction.sourceAccountId };
  }
  return {
    type: "transfer",
    sourceAccountId: transaction.destinationAccountId,
    destinationAccountId: transaction.sourceAccountId,
  };
}

export function reverseTransaction(transaction, reversedAt, reversalId) {
  validateTransaction(transaction);
  if (!["confirmed", "corrected", "cleared"].includes(transaction.status)) {
    throw new TypeError("Somente um lançamento confirmado pode ser desfeito.");
  }
  if (Number.isNaN(Date.parse(reversedAt))) throw new TypeError("Data de reversão inválida.");
  if (typeof reversalId !== "string" || !reversalId.trim()) {
    throw new TypeError("Identificador da reversão é obrigatório.");
  }
  const original = { ...transaction, status: "reversed", reversedAt, updatedAt: reversedAt };
  const reversal = {
    ...transaction,
    ...reverseType(transaction),
    id: reversalId,
    date: reversedAt,
    description: `Desfaz: ${transaction.description}`,
    status: "confirmed",
    origin: "atlas",
    dedupeKey: `reversal:${transaction.id}`,
    reversesTransactionId: transaction.id,
    createdAt: reversedAt,
    updatedAt: reversedAt,
  };
  validateTransaction(reversal);
  return { original, reversal };
}

export function getAccountTransactions(accountId, transactions) {
  if (typeof accountId !== "string" || !accountId.trim()) {
    throw new TypeError("Identificador da conta é obrigatório.");
  }
  return [...transactions]
    .filter((transaction) => transaction.sourceAccountId === accountId
      || transaction.destinationAccountId === accountId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function transactionImpactForAccount(transaction, accountId) {
  validateTransaction(transaction);
  if (!["cleared", "confirmed", "corrected"].includes(transaction.status)
      || transaction.reversesTransactionId) return 0;
  if (transaction.type === "income" && transaction.destinationAccountId === accountId) {
    return transaction.amountCents;
  }
  if (transaction.type === "expense" && transaction.sourceAccountId === accountId) {
    return -transaction.amountCents;
  }
  if (transaction.type === "transfer") {
    if (transaction.sourceAccountId === accountId) return -transaction.amountCents;
    if (transaction.destinationAccountId === accountId) return transaction.amountCents;
  }
  return 0;
}

export function getTransactionsAwaitingConfirmation(transactions) {
  return [...transactions]
    .filter((transaction) => ["detected", "awaiting_confirmation"].includes(transaction.status))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
