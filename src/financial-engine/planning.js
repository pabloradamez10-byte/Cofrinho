import { assertCents } from "./money.js";
import { calculateFinancialPosition } from "./engine.js";
import { projectCardInvoices } from "./cards.js";

const DAY_MS = 86_400_000;

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} é obrigatório.`);
}

function requireDay(value, field = "Dia do vencimento") {
  if (!Number.isInteger(value) || value < 1 || value > 31) throw new TypeError(`${field} deve estar entre 1 e 31.`);
}

function dateOnly(value, field) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${field} inválida.`);
  return date;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function monthDate(year, month, day) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay), 12));
}

export function validateRecurringEntry(entry) {
  if (!entry || typeof entry !== "object") throw new TypeError("Recorrência inválida.");
  requireText(entry.id, "Identificador da recorrência");
  requireText(entry.name, "Nome da recorrência");
  if (!["income", "expense"].includes(entry.type)) throw new TypeError("Tipo da recorrência inválido.");
  if (entry.frequency !== "monthly") throw new TypeError("Frequência da recorrência inválida.");
  assertCents(entry.amountCents, "Valor da recorrência");
  if (entry.amountCents <= 0) throw new RangeError("O valor da recorrência deve ser maior que zero.");
  requireDay(entry.dueDay);
  dateOnly(entry.startDate, "Data inicial");
  if (entry.endDate) dateOnly(entry.endDate, "Data final");
  return entry;
}

export function validateDebt(debt) {
  if (!debt || typeof debt !== "object") throw new TypeError("Dívida inválida.");
  requireText(debt.id, "Identificador da dívida");
  requireText(debt.name, "Nome da dívida");
  assertCents(debt.balanceCents, "Saldo devedor");
  assertCents(debt.installmentCents, "Valor da parcela");
  if (debt.balanceCents < 0 || debt.installmentCents <= 0) throw new RangeError("Valores da dívida inválidos.");
  if (!Number.isInteger(debt.remainingInstallments) || debt.remainingInstallments < 0) throw new TypeError("Parcelas restantes inválidas.");
  if (debt.interestRateMonthly != null && (!Number.isFinite(debt.interestRateMonthly) || debt.interestRateMonthly < 0)) throw new TypeError("Taxa de juros inválida.");
  requireDay(debt.dueDay);
  if (!["normal", "late", "negotiation"].includes(debt.status)) throw new TypeError("Situação da dívida inválida.");
  return debt;
}

export function generateRecurringOccurrences(entry, fromDate, toDate) {
  validateRecurringEntry(entry);
  if (entry.active === false) return [];
  const from = dateOnly(fromDate, "Data inicial da projeção");
  const to = dateOnly(toDate, "Data final da projeção");
  const starts = dateOnly(entry.startDate, "Data inicial");
  const ends = entry.endDate ? dateOnly(entry.endDate, "Data final") : null;
  const occurrences = [];
  let cursor = monthDate(from.getUTCFullYear(), from.getUTCMonth(), entry.dueDay);
  if (cursor < from) cursor = monthDate(from.getUTCFullYear(), from.getUTCMonth() + 1, entry.dueDay);
  while (cursor <= to) {
    if (cursor >= starts && (!ends || cursor <= ends)) occurrences.push({ id: `${entry.id}:${formatDate(cursor)}`, sourceId: entry.id, source: "recurring", name: entry.name, date: formatDate(cursor), type: entry.type, amountCents: entry.amountCents });
    cursor = monthDate(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, entry.dueDay);
  }
  return occurrences;
}

export function generateDebtOccurrences(debt, fromDate, toDate) {
  validateDebt(debt);
  if (debt.active === false || debt.remainingInstallments === 0 || debt.balanceCents === 0) return [];
  const from = dateOnly(fromDate, "Data inicial da projeção");
  const to = dateOnly(toDate, "Data final da projeção");
  const occurrences = [];
  let cursor = monthDate(from.getUTCFullYear(), from.getUTCMonth(), debt.dueDay);
  if (cursor < from) cursor = monthDate(from.getUTCFullYear(), from.getUTCMonth() + 1, debt.dueDay);
  for (let index = 0; index < debt.remainingInstallments && cursor <= to; index += 1) {
    occurrences.push({ id: `${debt.id}:${formatDate(cursor)}`, sourceId: debt.id, source: "debt", name: debt.name, date: formatDate(cursor), type: "expense", amountCents: Math.min(debt.installmentCents, debt.balanceCents) });
    cursor = monthDate(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, debt.dueDay);
  }
  return occurrences;
}

export function compareDebtStrategies(debts) {
  const active = debts.filter((debt) => debt.active !== false && debt.balanceCents > 0).map(validateDebt);
  if (active.length === 0) return { smallestBalance: null, highestInterest: null };
  const smallestBalance = [...active].sort((a, b) => a.balanceCents - b.balanceCents)[0];
  const highestInterest = [...active].sort((a, b) => (b.interestRateMonthly ?? 0) - (a.interestRateMonthly ?? 0))[0];
  return {
    smallestBalance: { ...smallestBalance, estimatedMonthlyInterestCents: Math.round(smallestBalance.balanceCents * (smallestBalance.interestRateMonthly ?? 0) / 100) },
    highestInterest: { ...highestInterest, estimatedMonthlyInterestCents: Math.round(highestInterest.balanceCents * (highestInterest.interestRateMonthly ?? 0) / 100) },
  };
}

function cardInvoiceOccurrences(data, fromDate, toDate) {
  const from = dateOnly(fromDate, "Data inicial da projeção");
  const to = dateOnly(toDate, "Data final da projeção");
  const startMonth = formatDate(from).slice(0, 7);
  const monthCount = Math.ceil((to.getTime() - from.getTime()) / (28 * DAY_MS)) + 1;
  return data.creditCards.flatMap((card) => projectCardInvoices(card, data.cardPurchases, startMonth, Math.min(24, monthCount)).flatMap((invoice) => {
    if (invoice.amountCents <= 0) return [];
    const [year, month] = invoice.month.split("-").map(Number);
    const due = monthDate(year, month - 1, card.dueDay);
    return due >= from && due <= to ? [{ id: `card:${card.id}:${invoice.month}`, sourceId: card.id, source: "card_invoice", name: `Fatura ${card.name}`, date: formatDate(due), type: "expense", amountCents: invoice.amountCents }] : [];
  }));
}

export function forecastFinancialFuture(data, fromDate, days) {
  if (![30, 60, 90].includes(days)) throw new TypeError("Horizonte da previsão inválido.");
  const from = dateOnly(fromDate, "Data inicial da projeção");
  const to = new Date(from.getTime() + days * DAY_MS);
  const events = [
    ...data.recurringEntries.flatMap((entry) => generateRecurringOccurrences(entry, formatDate(from), formatDate(to))),
    ...data.debts.flatMap((debt) => generateDebtOccurrences(debt, formatDate(from), formatDate(to))),
    ...cardInvoiceOccurrences(data, formatDate(from), formatDate(to)),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const incomeCents = events.filter((event) => event.type === "income").reduce((sum, event) => sum + event.amountCents, 0);
  const expenseCents = events.filter((event) => event.type === "expense").reduce((sum, event) => sum + event.amountCents, 0);
  const currentBalanceCents = calculateFinancialPosition(data.accounts, data.transactions, formatDate(from)).totalBalanceCents;
  return { days, throughDate: formatDate(to), currentBalanceCents, incomeCents, expenseCents, projectedBalanceCents: currentBalanceCents + incomeCents - expenseCents, events };
}
