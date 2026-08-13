import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAccountBalances,
  calculateCardPosition,
  projectCardInvoices,
  projectPurchaseInstallments,
  splitInstallments,
  validateCreditCard,
} from "../src/financial-engine/index.js";

const card = { id: "itau-card", name: "Itaú Visa", limitCents: 500_000, closingDay: 20, dueDay: 28, lastFour: "1234", active: true };
const purchase = { id: "notebook", cardId: "itau-card", description: "Notebook", date: "2026-08-10", totalCents: 100_000, installmentCount: 3, paidInstallments: 0, firstInvoiceMonth: "2026-08", status: "confirmed", categoryId: "projetos", origin: "atlas" };

test("divide a compra sem perder nem criar centavos", () => {
  const installments = splitInstallments(100_000, 3);
  assert.deepEqual(installments, [33_334, 33_333, 33_333]);
  assert.equal(installments.reduce((sum, value) => sum + value, 0), 100_000);
});

test("projeta as parcelas nas faturas corretas", () => {
  const installments = projectPurchaseInstallments(purchase);
  assert.deepEqual(installments.map((item) => item.month), ["2026-08", "2026-09", "2026-10"]);
  assert.deepEqual(installments.map((item) => item.number), [1, 2, 3]);
});

test("calcula fatura, limite usado e limite disponível", () => {
  const position = calculateCardPosition(card, [purchase], "2026-08");
  assert.equal(position.currentInvoiceCents, 33_334);
  assert.equal(position.usedLimitCents, 100_000);
  assert.equal(position.availableLimitCents, 400_000);
  assert.equal(position.remainingInstallments, 3);
});

test("não compromete limite com compra aguardando confirmação", () => {
  const pending = { ...purchase, status: "awaiting_confirmation" };
  assert.equal(calculateCardPosition(card, [pending], "2026-08").usedLimitCents, 0);
});

test("parcela paga libera limite e sai da fatura", () => {
  const partiallyPaid = { ...purchase, paidInstallments: 1 };
  const position = calculateCardPosition(card, [partiallyPaid], "2026-08");
  assert.equal(position.currentInvoiceCents, 0);
  assert.equal(position.usedLimitCents, 66_666);
});

test("projeta as próximas faturas", () => {
  assert.deepEqual(projectCardInvoices(card, [purchase], "2026-08", 4).map((item) => item.amountCents), [33_334, 33_333, 33_333, 0]);
});

test("cartão não armazena número completo", () => {
  assert.throws(() => validateCreditCard({ ...card, lastFour: "1234567890123456" }), /quatro últimos/);
});

test("compra no cartão não reduz diretamente o saldo bancário", () => {
  const accounts = [{ id: "itau", name: "Itaú", type: "checking", openingBalanceCents: 200_000 }];
  assert.equal(calculateAccountBalances(accounts, []).itau, 200_000);
});
