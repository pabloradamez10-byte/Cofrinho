import test from "node:test";
import assert from "node:assert/strict";
import { analyzeGoal, analyzePurchaseDecision, simulateIncomeIncrease, simulateNewInstallment } from "../src/financial-engine/index.js";

const data = {
  accounts: [{ id: "itau", name: "Itaú", type: "checking", openingBalanceCents: 100_000, active: true }],
  transactions: [], creditCards: [], cardPurchases: [], debts: [],
  recurringEntries: [
    { id: "salary", name: "Salário", type: "income", amountCents: 400_000, frequency: "monthly", dueDay: 5, startDate: "2026-01-01", active: true },
    { id: "costs", name: "Custos", type: "expense", amountCents: 300_000, frequency: "monthly", dueDay: 10, startDate: "2026-01-01", active: true },
  ],
};

test("calcula aporte necessário e previsão de conclusão da meta", () => {
  const result = analyzeGoal({ targetCents: 120_000, deadline: "2027-08-01", contributions: [{ amountCents: 20_000 }] }, "2026-08-01", 10_000);
  assert.equal(result.remainingCents, 100_000);
  assert.equal(result.requiredMonthlyCents, 8_334);
  assert.equal(result.estimatedMonths, 10);
  assert.equal(result.onTrack, true);
});

test("simula nova parcela sem alterar os dados reais", () => {
  const before = JSON.stringify(data);
  const safe = simulateNewInstallment(data, "2026-08-01", 50_000);
  const unsafe = simulateNewInstallment(data, "2026-08-01", 150_000);
  assert.equal(safe.affordable, true);
  assert.equal(unsafe.affordable, false);
  assert.equal(JSON.stringify(data), before);
});

test("simula aumento de renda nos horizontes de 30, 60 e 90 dias", () => {
  const result = simulateIncomeIncrease(data, "2026-08-01", 50_000);
  assert.deepEqual(result.map((item) => item.addedIncomeCents), [50_000, 100_000, 150_000]);
  assert.ok(result.every((item) => item.simulatedBalanceCents > item.baseBalanceCents));
});

test("responde se uma compra parcelada cabe no dinheiro livre e no mês", () => {
  const canBuy = analyzePurchaseDecision(data, "2026-08-01", { itemName: "PS5", installmentCents: 36_000, installmentCount: 12 });
  assert.equal(canBuy.recommendation, "can_buy");
  assert.equal(canBuy.totalPurchaseCents, 432_000);
  assert.equal(canBuy.monthlyCapacityAfterCents, 64_000);
  assert.equal(canBuy.readOnly, true);

  const constrained = { ...data, accounts: [{ ...data.accounts[0], openingBalanceCents: 12_000 }] };
  const shouldNotBuy = analyzePurchaseDecision(constrained, "2026-08-01", { itemName: "PS5", installmentCents: 36_000, installmentCount: 12 });
  assert.equal(shouldNotBuy.recommendation, "do_not_buy");
  assert.equal(shouldNotBuy.reasonCode, "insufficient_free_money");
  assert.equal(shouldNotBuy.freeMoneyCents, 12_000);
});
