import test from "node:test";
import assert from "node:assert/strict";
import { generateFinancialAlerts, summarizeFinancialAlerts } from "../src/financial-engine/index.js";

function data(overrides = {}) {
  return {
    recurringEntries: [],
    debts: [],
    creditCards: [],
    cardPurchases: [],
    ...overrides,
  };
}

test("gera alertas de entradas e saídas e destaca o que exige ação", () => {
  const alerts = generateFinancialAlerts(data({ recurringEntries: [
    { id: "salario", name: "Salário", type: "income", frequency: "monthly", amountCents: 400000, dueDay: 10, startDate: "2026-01-01", active: true },
    { id: "aluguel", name: "Aluguel", type: "expense", frequency: "monthly", amountCents: 120000, dueDay: 8, startDate: "2026-01-01", active: true },
  ] }), "2026-08-07", { overdueDays: 0, lookAheadDays: 7 });

  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].title, "Aluguel");
  assert.equal(alerts[0].daysUntil, 1);
  assert.equal(alerts[0].urgency, "urgent");
  assert.equal(alerts[0].requiresAction, true);
  assert.equal(alerts[1].type, "income");
  assert.equal(alerts[1].requiresAction, false);
});

test("separa vencidos, vencimentos de hoje e próximos compromissos", () => {
  const alerts = generateFinancialAlerts(data({ recurringEntries: [
    { id: "vencida", name: "Conta vencida", type: "expense", frequency: "monthly", amountCents: 1000, dueDay: 5, startDate: "2026-01-01", active: true },
    { id: "hoje", name: "Conta de hoje", type: "expense", frequency: "monthly", amountCents: 2000, dueDay: 7, startDate: "2026-01-01", active: true },
    { id: "entrada", name: "Pagamento", type: "income", frequency: "monthly", amountCents: 3000, dueDay: 9, startDate: "2026-01-01", active: true },
  ] }), "2026-08-07", { overdueDays: 3, lookAheadDays: 5 });
  const summary = summarizeFinancialAlerts(alerts);

  assert.equal(summary.overdue, 1);
  assert.equal(summary.dueToday, 1);
  assert.equal(summary.actionable, 2);
  assert.equal(summary.nextIncome.title, "Pagamento");
  assert.equal(summary.nextExpense.title, "Conta de hoje");
});

test("inclui dívida e fatura de cartão sem expor dados sensíveis", () => {
  const alerts = generateFinancialAlerts(data({
    debts: [{ id: "emprestimo", name: "Empréstimo", balanceCents: 100000, installmentCents: 10000, remainingInstallments: 10, dueDay: 12, status: "normal", active: true }],
    creditCards: [{ id: "card", name: "Cartão principal", limitCents: 200000, closingDay: 2, dueDay: 15, active: true }],
    cardPurchases: [{ id: "purchase", cardId: "card", description: "Compra", totalCents: 9000, date: "2026-08-01", installmentCount: 1, paidInstallments: 0, firstInvoiceMonth: "2026-08", status: "confirmed", origin: "manual" }],
  }), "2026-08-10", { overdueDays: 0, lookAheadDays: 10 });

  assert.ok(alerts.some((alert) => alert.source === "debt"));
  assert.ok(alerts.some((alert) => alert.source === "card_invoice"));
  assert.ok(alerts.every((alert) => !("cardNumber" in alert)));
});
