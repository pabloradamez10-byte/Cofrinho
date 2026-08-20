import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyFinancialData, exportFinancialBackup, generateFinancialAlerts, importFinancialBackup,
  saveAccount, saveCardPurchase, saveCreditCard, saveDebt, saveRecurringEntry, saveTransaction,
  settleFinancialAlert, undoFinancialTransaction,
} from "../src/financial-engine/index.js";

const now = "2026-08-19T12:00:00.000Z";

test("cadastra conta e registra entrada, saída e transferência", () => {
  let data = createEmptyFinancialData();
  data = saveAccount(data, { name: "Carteira teste", type: "cash", openingBalanceCents: 10000 }, now);
  const wallet = data.accounts.at(-1);
  data = saveTransaction(data, { type: "income", amountCents: 5000, description: "Extra", destinationAccountId: wallet.id, categoryId: "outros" }, now);
  data = saveTransaction(data, { type: "expense", amountCents: 2000, description: "Lanche", sourceAccountId: wallet.id, categoryId: "alimentacao" }, "2026-08-19T13:00:00.000Z");
  data = saveTransaction(data, { type: "transfer", amountCents: 3000, description: "Guardar", sourceAccountId: wallet.id, destinationAccountId: "itau" }, "2026-08-19T14:00:00.000Z");
  assert.equal(data.transactions.length, 3);
  assert.ok(data.activities.some((item) => item.action === "transaction_created"));
});

test("cadastra cartão, compra parcelada, recorrência e dívida", () => {
  let data = createEmptyFinancialData();
  data = saveCreditCard(data, { name: "Visa", limitCents: 500000, closingDay: 20, dueDay: 28, lastFour: "1234" }, now);
  const card = data.creditCards[0];
  data = saveCardPurchase(data, { cardId: card.id, description: "PS5", totalCents: 432000, installmentCount: 12, firstInvoiceMonth: "2026-09", date: "2026-08-19" }, now);
  data = saveRecurringEntry(data, { name: "Salário", type: "income", amountCents: 400000, dueDay: 5, startDate: "2026-01-01", accountId: "itau", categoryId: "salario" }, now);
  data = saveDebt(data, { name: "Empréstimo", balanceCents: 100000, installmentCents: 10000, remainingInstallments: 10, dueDay: 10, accountId: "itau" }, now);
  assert.equal(data.creditCards.length, 1);
  assert.equal(data.cardPurchases[0].installmentCount, 12);
  assert.equal(data.recurringEntries.length, 1);
  assert.equal(data.debts.length, 1);
});

test("baixa compromisso uma única vez e atualiza dívida", () => {
  let data = createEmptyFinancialData();
  data.accounts = data.accounts.map((account) => account.id === "itau" ? { ...account, openingBalanceCents: 50000 } : account);
  data = saveDebt(data, { name: "Empréstimo", balanceCents: 30000, installmentCents: 10000, remainingInstallments: 3, dueDay: 20, accountId: "itau" }, now);
  const alert = generateFinancialAlerts(data, "2026-08-19", { overdueDays: 0, lookAheadDays: 2 })[0];
  data = settleFinancialAlert(data, alert, "itau", "2026-08-20T12:00:00.000Z");
  assert.equal(data.debts[0].balanceCents, 20000);
  assert.equal(data.debts[0].remainingInstallments, 2);
  assert.equal(generateFinancialAlerts(data, "2026-08-20", { overdueDays: 1, lookAheadDays: 1 }).length, 0);
  assert.throws(() => settleFinancialAlert(data, alert, "itau", now), /já foi baixado/);
});

test("desfaz movimentação de forma auditável", () => {
  let data = createEmptyFinancialData();
  data = saveTransaction(data, { type: "income", amountCents: 10000, description: "Extra", destinationAccountId: "itau" }, now);
  data = undoFinancialTransaction(data, data.transactions[0].id, "2026-08-20T12:00:00.000Z");
  assert.equal(data.transactions[0].status, "reversed");
  assert.equal(data.transactions.length, 2);
});

test("exporta e importa backup integral do motor financeiro", () => {
  const data = saveAccount(createEmptyFinancialData(), { name: "Teste", type: "cash", openingBalanceCents: 1234 }, now);
  const restored = importFinancialBackup(exportFinancialBackup(data));
  assert.deepEqual(restored, data);
  assert.throws(() => importFinancialBackup("{}"), /inválido/);
});
