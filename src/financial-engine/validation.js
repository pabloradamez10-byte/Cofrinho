import {
  ACCOUNT_TYPES,
  RECONCILIATION_STATUSES,
  TRANSACTION_ORIGINS,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
} from "./constants.js";
import { assertCents } from "./money.js";

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} é obrigatório.`);
}

export function validateAccount(account) {
  if (!account || typeof account !== "object") throw new TypeError("Conta inválida.");
  requireText(account.id, "Identificador da conta");
  requireText(account.name, "Nome da conta");
  if (!ACCOUNT_TYPES.includes(account.type)) throw new TypeError("Tipo de conta inválido.");
  assertCents(account.openingBalanceCents ?? 0, "Saldo inicial");
  if (account.reconciliationStatus
      && !RECONCILIATION_STATUSES.includes(account.reconciliationStatus)) {
    throw new TypeError("Situação de conciliação inválida.");
  }
  if (account.statementBalanceCents != null) {
    assertCents(account.statementBalanceCents, "Saldo informado");
  }
  return account;
}

export function validateTransaction(transaction, accountIds = null) {
  if (!transaction || typeof transaction !== "object") throw new TypeError("Lançamento inválido.");
  requireText(transaction.id, "Identificador do lançamento");
  requireText(transaction.date, "Data");
  requireText(transaction.description, "Descrição");
  if (Number.isNaN(Date.parse(transaction.date))) throw new TypeError("Data do lançamento inválida.");
  assertCents(transaction.amountCents, "Valor do lançamento");
  if (transaction.amountCents <= 0) throw new RangeError("O valor do lançamento deve ser maior que zero.");
  if (!TRANSACTION_TYPES.includes(transaction.type)) throw new TypeError("Tipo de lançamento inválido.");
  if (!TRANSACTION_STATUSES.includes(transaction.status)) throw new TypeError("Status do lançamento inválido.");
  if (!TRANSACTION_ORIGINS.includes(transaction.origin)) throw new TypeError("Origem do lançamento inválida.");
  if (transaction.dedupeKey != null && typeof transaction.dedupeKey !== "string") {
    throw new TypeError("Identificador de duplicidade inválido.");
  }

  if (transaction.type === "income" && !transaction.destinationAccountId) {
    throw new TypeError("Uma entrada precisa de uma conta de destino.");
  }
  if (transaction.type === "expense" && !transaction.sourceAccountId) {
    throw new TypeError("Uma saída precisa de uma conta de origem.");
  }
  if (transaction.type === "transfer") {
    if (!transaction.sourceAccountId || !transaction.destinationAccountId) {
      throw new TypeError("Uma transferência precisa de contas de origem e destino.");
    }
    if (transaction.sourceAccountId === transaction.destinationAccountId) {
      throw new TypeError("A origem e o destino da transferência devem ser diferentes.");
    }
  }

  if (accountIds) {
    for (const id of [transaction.sourceAccountId, transaction.destinationAccountId].filter(Boolean)) {
      if (!accountIds.has(id)) throw new TypeError(`A conta ${id} não existe.`);
    }
  }
  return transaction;
}
