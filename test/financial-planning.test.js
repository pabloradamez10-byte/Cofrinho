import test from "node:test";
import assert from "node:assert/strict";
import {
  compareDebtStrategies,
  forecastFinancialFuture,
  generateDebtOccurrences,
  generateRecurringOccurrences,
} from "../src/financial-engine/index.js";

const salary = { id: "salary", name: "Salário", type: "income", amountCents: 400_000, frequency: "monthly", dueDay: 5, startDate: "2026-01-01", active: true, categoryId: "salario" };
const internet = { id: "internet", name: "Internet", type: "expense", amountCents: 12_000, frequency: "monthly", dueDay: 10, startDate: "2026-01-01", active: true, categoryId: "assinaturas" };
const loan = { id: "loan", name: "Empréstimo", balanceCents: 100_000, installmentCents: 25_000, remainingInstallments: 4, interestRateMonthly: 2, dueDay: 15, status: "normal", active: true };

test("projeta receitas e despesas recorrentes sem lançar no saldo real", () => {
  assert.deepEqual(generateRecurringOccurrences(salary, "2026-08-01", "2026-09-30").map((item) => item.date), ["2026-08-05", "2026-09-05"]);
  assert.equal(generateRecurringOccurrences(internet, "2026-08-01", "2026-08-31")[0].amountCents, 12_000);
});

test("respeita encerramento da recorrência", () => {
  const ended = { ...internet, endDate: "2026-08-31" };
  assert.equal(generateRecurringOccurrences(ended, "2026-08-01", "2026-10-31").length, 1);
});

test("projeta somente as parcelas restantes da dívida", () => {
  const events = generateDebtOccurrences(loan, "2026-08-01", "2027-01-01");
  assert.equal(events.length, 4);
  assert.equal(events.reduce((sum, item) => sum + item.amountCents, 0), 100_000);
});

test("compara menor saldo e maior juros sem misturar estratégias", () => {
  const debts = [loan, { ...loan, id: "small", name: "Menor", balanceCents: 50_000, interestRateMonthly: 1 }, { ...loan, id: "expensive", name: "Maior juro", balanceCents: 150_000, interestRateMonthly: 8 }];
  const strategies = compareDebtStrategies(debts);
  assert.equal(strategies.smallestBalance.id, "small");
  assert.equal(strategies.highestInterest.id, "expensive");
  assert.equal(strategies.highestInterest.estimatedMonthlyInterestCents, 12_000);
});

test("calcula previsão de 30 dias a partir do saldo atual", () => {
  const data = {
    accounts: [{ id: "itau", name: "Itaú", type: "checking", openingBalanceCents: 100_000, active: true }],
    transactions: [], recurringEntries: [salary, internet], debts: [loan], creditCards: [], cardPurchases: [],
  };
  const forecast = forecastFinancialFuture(data, "2026-08-01", 30);
  assert.equal(forecast.currentBalanceCents, 100_000);
  assert.equal(forecast.incomeCents, 400_000);
  assert.equal(forecast.expenseCents, 37_000);
  assert.equal(forecast.projectedBalanceCents, 463_000);
  assert.equal(data.transactions.length, 0);
});

test("inclui fatura do cartão na previsão sem duplicar compra no saldo atual", () => {
  const data = {
    accounts: [{ id: "itau", name: "Itaú", type: "checking", openingBalanceCents: 100_000, active: true }], transactions: [], recurringEntries: [], debts: [],
    creditCards: [{ id: "card", name: "Cartão", limitCents: 200_000, closingDay: 20, dueDay: 25 }],
    cardPurchases: [{ id: "purchase", cardId: "card", description: "Compra", date: "2026-08-01", totalCents: 30_000, installmentCount: 1, paidInstallments: 0, firstInvoiceMonth: "2026-08", status: "confirmed" }],
  };
  const forecast = forecastFinancialFuture(data, "2026-08-01", 30);
  assert.equal(forecast.currentBalanceCents, 100_000);
  assert.equal(forecast.expenseCents, 30_000);
  assert.equal(forecast.projectedBalanceCents, 70_000);
});
