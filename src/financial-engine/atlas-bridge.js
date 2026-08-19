import { calculateAccountBalances, findDuplicate } from "./engine.js";
import { validateFinancialData } from "./storage.js";
import { validateTransaction } from "./validation.js";

export const ATLAS_BRIDGE_VERSION = 1;

const clone = (value) => JSON.parse(JSON.stringify(value));

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} é obrigatório.`);
  return value.trim();
}

function accountById(data, accountId) {
  const account = data.accounts.find((item) => item.id === accountId && item.active !== false);
  if (!account) throw new TypeError(`A conta ${accountId} não existe ou está inativa.`);
  return account;
}

function assertCategory(data, categoryId, type) {
  if (!categoryId) return null;
  const category = data.categories.find((item) => item.id === categoryId && item.active !== false);
  if (!category || ![type, "both"].includes(category.kind)) {
    throw new TypeError(`A categoria ${categoryId} não aceita este lançamento.`);
  }
  return category.id;
}

export function createAtlasSnapshot(data, generatedAt = new Date().toISOString()) {
  validateFinancialData(data);
  if (Number.isNaN(Date.parse(generatedAt))) throw new TypeError("Data do retrato inválida.");
  const balances = calculateAccountBalances(data.accounts, data.transactions);
  return {
    bridgeVersion: ATLAS_BRIDGE_VERSION,
    generatedAt,
    readOnly: true,
    accounts: data.accounts.filter((account) => account.active !== false).map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      reserved: account.reserved === true,
      balanceCents: balances[account.id],
    })),
    categories: data.categories.filter((category) => category.active !== false).map((category) => ({
      id: category.id,
      name: category.name,
      kind: category.kind,
    })),
    pendingConfirmationCount: data.transactions.filter((transaction) =>
      ["detected", "awaiting_confirmation"].includes(transaction.status)).length,
  };
}

export function proposeAtlasTransaction(data, input, options = {}) {
  validateFinancialData(data);
  if (!input || typeof input !== "object") throw new TypeError("Proposta do Atlas inválida.");
  const type = requireText(input.type, "Tipo");
  if (!["income", "expense", "transfer"].includes(type)) throw new TypeError("Tipo de lançamento inválido.");
  const now = options.now ?? new Date().toISOString();
  const id = options.id ?? globalThis.crypto?.randomUUID?.();
  requireText(id, "Identificador da proposta");
  if (Number.isNaN(Date.parse(now))) throw new TypeError("Data da proposta inválida.");

  const sourceAccountId = input.sourceAccountId ?? null;
  const destinationAccountId = input.destinationAccountId ?? null;
  if (sourceAccountId) accountById(data, sourceAccountId);
  if (destinationAccountId) accountById(data, destinationAccountId);
  assertCategory(data, input.categoryId, type);

  const transaction = {
    id: `atlas-${id}`,
    date: input.date ?? now,
    description: requireText(input.description, "Descrição"),
    amountCents: input.amountCents,
    type,
    status: "awaiting_confirmation",
    origin: options.origin ?? "atlas",
    categoryId: input.categoryId ?? "outros",
    sourceAccountId,
    destinationAccountId,
    dueDate: input.dueDate ?? null,
    note: input.note ?? "",
    dedupeKey: input.dedupeKey ?? `atlas:${id}`,
    createdAt: now,
    updatedAt: now,
  };
  validateTransaction(transaction, new Set(data.accounts.map((account) => account.id)));
  const duplicate = findDuplicate(transaction, data.transactions);
  if (duplicate.duplicate) throw new TypeError(`Lançamento duplicado: ${duplicate.match.id}.`);

  return {
    bridgeVersion: ATLAS_BRIDGE_VERSION,
    proposalId: id,
    state: "AWAITING_PABLO_CONFIRMATION",
    createdAt: now,
    expiresAt: options.expiresAt ?? new Date(Date.parse(now) + 30 * 60_000).toISOString(),
    transaction,
  };
}

export function proposeNotificationTransaction(data, input, options = {}) {
  if (!input || typeof input !== "object") throw new TypeError("Notificação financeira inválida.");
  const sourceApp = requireText(input.sourceApp, "Aplicativo de origem");
  const notificationId = requireText(input.notificationId, "Identificador da notificação");
  if (!input.transaction || typeof input.transaction !== "object") {
    throw new TypeError("Movimentação detectada na notificação é obrigatória.");
  }
  return proposeAtlasTransaction(data, {
    ...input.transaction,
    dedupeKey: `notification:${sourceApp}:${notificationId}`,
    note: input.transaction.note ?? `Detectado em notificação de ${sourceApp}`,
  }, { ...options, origin: "notification" });
}

export function confirmAtlasTransaction(data, proposal, confirmedAt = new Date().toISOString()) {
  validateFinancialData(data);
  if (!proposal || proposal.state !== "AWAITING_PABLO_CONFIRMATION") {
    throw new TypeError("A proposta não está aguardando confirmação de Pablo.");
  }
  if (Number.isNaN(Date.parse(confirmedAt))) throw new TypeError("Data de confirmação inválida.");
  if (Date.parse(confirmedAt) > Date.parse(proposal.expiresAt)) {
    throw new TypeError("A proposta expirou; solicite uma nova confirmação.");
  }
  const transaction = { ...clone(proposal.transaction), status: "confirmed", confirmedAt, updatedAt: confirmedAt };
  validateTransaction(transaction, new Set(data.accounts.map((account) => account.id)));
  const duplicate = findDuplicate(transaction, data.transactions);
  if (duplicate.duplicate) throw new TypeError(`Lançamento duplicado: ${duplicate.match.id}.`);

  const before = calculateAccountBalances(data.accounts, data.transactions);
  const nextData = clone(data);
  nextData.transactions.push(transaction);
  nextData.activities.push({
    id: `atlas-confirmation-${proposal.proposalId}`,
    date: confirmedAt,
    actor: "pablo",
    action: "atlas_transaction_confirmed",
    title: "Lançamento do Atlas confirmado",
    description: transaction.description,
    status: "completed",
    reversible: true,
    transactionId: transaction.id,
  });
  nextData.updatedAt = confirmedAt;
  validateFinancialData(nextData);
  const after = calculateAccountBalances(nextData.accounts, nextData.transactions);

  return {
    data: nextData,
    receipt: {
      bridgeVersion: ATLAS_BRIDGE_VERSION,
      receiptId: `receipt-${proposal.proposalId}`,
      proposalId: proposal.proposalId,
      transactionId: transaction.id,
      status: "COMMITTED",
      committedAt: confirmedAt,
      balancesBeforeCents: before,
      balancesAfterCents: after,
    },
  };
}
