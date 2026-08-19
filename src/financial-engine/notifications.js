import { generateDebtOccurrences, generateRecurringOccurrences } from "./planning.js";
import { projectCardInvoices } from "./cards.js";

const DAY_MS = 86_400_000;

function dateOnly(value) {
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new TypeError("Data de referência inválida.");
  return date;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function daysBetween(from, to) {
  return Math.round((dateOnly(to).getTime() - dateOnly(from).getTime()) / DAY_MS);
}

function monthDate(year, month, day) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay), 12));
}

function cardOccurrences(data, fromDate, toDate) {
  const from = dateOnly(fromDate);
  const to = dateOnly(toDate);
  const startMonth = formatDate(from).slice(0, 7);
  const monthCount = Math.ceil((to.getTime() - from.getTime()) / (28 * DAY_MS)) + 2;

  return data.creditCards
    .filter((card) => card.active !== false)
    .flatMap((card) => projectCardInvoices(card, data.cardPurchases, startMonth, Math.min(24, monthCount))
      .flatMap((invoice) => {
        if (invoice.amountCents <= 0) return [];
        const [year, month] = invoice.month.split("-").map(Number);
        const due = monthDate(year, month - 1, card.dueDay);
        if (due < from || due > to) return [];
        return [{
          id: `card:${card.id}:${invoice.month}`,
          sourceId: card.id,
          source: "card_invoice",
          name: `Fatura ${card.name}`,
          date: formatDate(due),
          type: "expense",
          amountCents: invoice.amountCents,
        }];
      }));
}

function occurrenceToAlert(occurrence, referenceDate) {
  const daysUntil = daysBetween(referenceDate, occurrence.date);
  const urgency = daysUntil < 0 ? "overdue"
    : daysUntil === 0 ? "today"
      : daysUntil <= 3 ? "urgent"
        : "upcoming";

  return {
    id: `alert:${occurrence.id}`,
    sourceId: occurrence.sourceId,
    source: occurrence.source,
    title: occurrence.name,
    date: occurrence.date,
    type: occurrence.type,
    amountCents: occurrence.amountCents,
    daysUntil,
    urgency,
    requiresAction: occurrence.type === "expense" && daysUntil <= 3,
  };
}

export function generateFinancialAlerts(data, referenceDate, options = {}) {
  const lookAheadDays = options.lookAheadDays ?? 30;
  const overdueDays = options.overdueDays ?? 7;
  if (!Number.isInteger(lookAheadDays) || lookAheadDays < 0 || lookAheadDays > 366) {
    throw new TypeError("Período futuro dos alertas inválido.");
  }
  if (!Number.isInteger(overdueDays) || overdueDays < 0 || overdueDays > 90) {
    throw new TypeError("Período vencido dos alertas inválido.");
  }

  const reference = dateOnly(referenceDate);
  const from = formatDate(addDays(reference, -overdueDays));
  const to = formatDate(addDays(reference, lookAheadDays));
  const occurrences = [
    ...data.recurringEntries.flatMap((entry) => generateRecurringOccurrences(entry, from, to)),
    ...data.debts.flatMap((debt) => generateDebtOccurrences(debt, from, to)),
    ...cardOccurrences(data, from, to),
  ];

  return occurrences
    .map((occurrence) => occurrenceToAlert(occurrence, formatDate(reference)))
    .sort((a, b) => a.date.localeCompare(b.date)
      || (a.type === "expense" ? -1 : 1)
      || a.title.localeCompare(b.title));
}

export function summarizeFinancialAlerts(alerts) {
  const actionable = alerts.filter((alert) => alert.requiresAction);
  return {
    total: alerts.length,
    actionable: actionable.length,
    overdue: alerts.filter((alert) => alert.urgency === "overdue").length,
    dueToday: alerts.filter((alert) => alert.urgency === "today").length,
    nextIncome: alerts.find((alert) => alert.type === "income" && alert.daysUntil >= 0) ?? null,
    nextExpense: alerts.find((alert) => alert.type === "expense" && alert.daysUntil >= 0) ?? null,
  };
}
