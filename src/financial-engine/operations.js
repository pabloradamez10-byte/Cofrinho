import { findDuplicate, reverseTransaction } from "./engine.js";
import { projectPurchaseInstallments, validateCardPurchase, validateCreditCard } from "./cards.js";
import { validateDebt, validateRecurringEntry } from "./planning.js";
import { validateFinancialData } from "./storage.js";
import { validateAccount, validateTransaction } from "./validation.js";

const clone = (value) => JSON.parse(JSON.stringify(value));
const makeId = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;

function validDate(value, field = "Data") {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new TypeError(`${field} inválida.`);
  return value;
}

function activity(data, input) {
  data.activities.unshift({ reversible: false, status: "completed", actor: "pablo", ...input });
}

function finalize(data, now) {
  data.updatedAt = now;
  return validateFinancialData(data);
}

export function saveAccount(data, input, now = new Date().toISOString()) {
  const next = clone(validateFinancialData(data));
  const existing = input.id ? next.accounts.find((item) => item.id === input.id) : null;
  const account = {
    id: existing?.id ?? makeId("account"), name: String(input.name ?? "").trim(),
    type: input.type ?? "checking", openingBalanceCents: input.openingBalanceCents ?? existing?.openingBalanceCents ?? 0,
    reserved: input.reserved ?? existing?.reserved ?? false, active: input.active ?? existing?.active ?? true,
    reconciliationStatus: existing?.reconciliationStatus ?? "unreconciled", createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  validateAccount(account);
  if (existing) next.accounts = next.accounts.map((item) => item.id === account.id ? account : item);
  else next.accounts.push(account);
  activity(next, { id: makeId("activity"), date: now, action: existing ? "account_updated" : "account_created", title: existing ? "Conta atualizada" : "Conta cadastrada", description: account.name });
  return finalize(next, now);
}

export function saveTransaction(data, input, now = new Date().toISOString()) {
  const next = clone(validateFinancialData(data));
  const transaction = {
    id: input.id ?? makeId("transaction"), date: validDate(input.date ?? now), description: String(input.description ?? "").trim(),
    amountCents: input.amountCents, type: input.type, status: "confirmed", origin: input.origin ?? "manual",
    categoryId: input.categoryId ?? "outros", sourceAccountId: input.sourceAccountId ?? null,
    destinationAccountId: input.destinationAccountId ?? null, dueDate: input.dueDate ?? null, note: input.note ?? "",
    dedupeKey: input.dedupeKey ?? `manual:${input.id ?? makeId("entry")}`, createdAt: input.createdAt ?? now,
    confirmedAt: now, updatedAt: now,
  };
  validateTransaction(transaction, new Set(next.accounts.map((account) => account.id)));
  const duplicate = findDuplicate(transaction, next.transactions);
  if (duplicate.duplicate) throw new TypeError(`Lançamento duplicado: ${duplicate.match.id}.`);
  next.transactions.push(transaction);
  activity(next, { id: makeId("activity"), date: now, action: "transaction_created", title: "Movimentação registrada", description: transaction.description, reversible: true, transactionId: transaction.id });
  return finalize(next, now);
}

export function undoFinancialTransaction(data, transactionId, now = new Date().toISOString()) {
  const next = clone(validateFinancialData(data));
  const index = next.transactions.findIndex((item) => item.id === transactionId);
  if (index < 0) throw new TypeError("Movimentação não encontrada.");
  const { original, reversal } = reverseTransaction(next.transactions[index], now, makeId("reversal"));
  next.transactions[index] = original;
  next.transactions.push(reversal);
  activity(next, { id: makeId("activity"), date: now, action: "transaction_reversed", title: "Movimentação desfeita", description: original.description, transactionId, reversalTransactionId: reversal.id });
  return finalize(next, now);
}

export function saveCreditCard(data, input, now = new Date().toISOString()) {
  const next = clone(validateFinancialData(data));
  const existing = input.id ? next.creditCards.find((item) => item.id === input.id) : null;
  const card = { id: existing?.id ?? makeId("card"), name: String(input.name ?? "").trim(), limitCents: input.limitCents, closingDay: input.closingDay, dueDay: input.dueDay, lastFour: input.lastFour || undefined, active: input.active ?? existing?.active ?? true, createdAt: existing?.createdAt ?? now, updatedAt: now };
  validateCreditCard(card);
  if (existing) next.creditCards = next.creditCards.map((item) => item.id === card.id ? card : item);
  else next.creditCards.push(card);
  activity(next, { id: makeId("activity"), date: now, action: existing ? "card_updated" : "card_created", title: existing ? "Cartão atualizado" : "Cartão cadastrado", description: card.name });
  return finalize(next, now);
}

export function saveCardPurchase(data, input, now = new Date().toISOString()) {
  const next = clone(validateFinancialData(data));
  const purchase = { id: input.id ?? makeId("purchase"), cardId: input.cardId, description: String(input.description ?? "").trim(), date: validDate(input.date ?? now), totalCents: input.totalCents, installmentCount: input.installmentCount, paidInstallments: input.paidInstallments ?? 0, firstInvoiceMonth: input.firstInvoiceMonth, status: "confirmed", categoryId: input.categoryId ?? "outros", origin: input.origin ?? "manual", createdAt: now, updatedAt: now };
  validateCardPurchase(purchase, new Set(next.creditCards.map((card) => card.id)));
  next.cardPurchases.push(purchase);
  activity(next, { id: makeId("activity"), date: now, action: "card_purchase_created", title: "Compra no crédito registrada", description: purchase.description, reversible: true, cardPurchaseId: purchase.id });
  return finalize(next, now);
}

export function saveRecurringEntry(data, input, now = new Date().toISOString()) {
  const next = clone(validateFinancialData(data));
  const existing = input.id ? next.recurringEntries.find((item) => item.id === input.id) : null;
  const entry = { id: existing?.id ?? makeId("recurring"), name: String(input.name ?? "").trim(), type: input.type, amountCents: input.amountCents, frequency: "monthly", dueDay: input.dueDay, startDate: input.startDate ?? now.slice(0, 10), endDate: input.endDate || null, accountId: input.accountId ?? existing?.accountId ?? null, categoryId: input.categoryId ?? existing?.categoryId ?? "outros", active: input.active ?? existing?.active ?? true, createdAt: existing?.createdAt ?? now, updatedAt: now };
  validateRecurringEntry(entry);
  if (existing) next.recurringEntries = next.recurringEntries.map((item) => item.id === entry.id ? entry : item);
  else next.recurringEntries.push(entry);
  activity(next, { id: makeId("activity"), date: now, action: existing ? "recurring_updated" : "recurring_created", title: existing ? "Recorrência atualizada" : "Recorrência cadastrada", description: entry.name });
  return finalize(next, now);
}

export function saveDebt(data, input, now = new Date().toISOString()) {
  const next = clone(validateFinancialData(data));
  const existing = input.id ? next.debts.find((item) => item.id === input.id) : null;
  const debt = { id: existing?.id ?? makeId("debt"), name: String(input.name ?? "").trim(), balanceCents: input.balanceCents, installmentCents: input.installmentCents, remainingInstallments: input.remainingInstallments, interestRateMonthly: input.interestRateMonthly ?? null, dueDay: input.dueDay, status: input.status ?? "normal", accountId: input.accountId ?? existing?.accountId ?? null, active: input.active ?? existing?.active ?? true, createdAt: existing?.createdAt ?? now, updatedAt: now };
  validateDebt(debt);
  if (existing) next.debts = next.debts.map((item) => item.id === debt.id ? debt : item);
  else next.debts.push(debt);
  activity(next, { id: makeId("activity"), date: now, action: existing ? "debt_updated" : "debt_created", title: existing ? "Dívida atualizada" : "Dívida cadastrada", description: debt.name });
  return finalize(next, now);
}

export function settleFinancialAlert(data, alert, accountId, now = new Date().toISOString()) {
  validateFinancialData(data);
  if (!alert || typeof alert !== "object" || !alert.id) throw new TypeError("Compromisso inválido.");
  const dedupeKey = `settlement:${alert.id}`;
  if (data.transactions.some((item) => item.dedupeKey === dedupeKey)) throw new TypeError("Este compromisso já foi baixado.");
  let next = saveTransaction(data, {
    type: alert.type, amountCents: alert.amountCents, description: alert.title,
    date: now, dueDate: alert.date, categoryId: alert.source === "debt" ? "dividas" : "outros",
    sourceAccountId: alert.type === "expense" ? accountId : null,
    destinationAccountId: alert.type === "income" ? accountId : null,
    dedupeKey,
  }, now);

  if (alert.source === "debt") {
    next.debts = next.debts.map((debt) => debt.id === alert.sourceId ? {
      ...debt, balanceCents: Math.max(0, debt.balanceCents - alert.amountCents),
      remainingInstallments: Math.max(0, debt.remainingInstallments - 1),
      active: debt.remainingInstallments - 1 > 0 && debt.balanceCents - alert.amountCents > 0,
      updatedAt: now,
    } : debt);
  }
  if (alert.source === "card_invoice") {
    const invoiceMonth = alert.id.split(":").at(-1);
    next.cardPurchases = next.cardPurchases.map((purchase) => {
      if (purchase.cardId !== alert.sourceId) return purchase;
      const dueCount = projectPurchaseInstallments(purchase).filter((installment) => installment.month <= invoiceMonth).length;
      return { ...purchase, paidInstallments: Math.max(purchase.paidInstallments ?? 0, dueCount), updatedAt: now };
    });
  }
  activity(next, { id: makeId("activity"), date: now, action: alert.type === "income" ? "income_received" : "bill_paid", title: alert.type === "income" ? "Recebimento confirmado" : "Pagamento confirmado", description: alert.title });
  return finalize(next, now);
}
