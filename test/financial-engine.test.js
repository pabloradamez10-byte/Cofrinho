import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAccountBalances,
  calculateFinancialPosition,
  findDuplicate,
  summarizePeriod,
  toCents,
  validateTransaction,
} from "../src/financial-engine/index.js";

const accounts = [
  { id: "itau", name: "Itaú", type: "checking", openingBalanceCents: 100_000, active: true },
  { id: "dinheiro", name: "Dinheiro", type: "cash", openingBalanceCents: 20_000, active: true },
];

const base = {
  date: "2026-08-13T12:00:00.000Z",
  status: "cleared",
  origin: "manual",
  categoryId: "outros",
};

const transactions = [
  { ...base, id: "salario", description: "Salário", amountCents: 400_000, type: "income", destinationAccountId: "itau" },
  { ...base, id: "mercado", description: "Mercado", amountCents: 30_000, type: "expense", sourceAccountId: "itau" },
  { ...base, id: "saque", description: "Saque", amountCents: 10_000, type: "transfer", sourceAccountId: "itau", destinationAccountId: "dinheiro" },
];

test("representa dinheiro em centavos sem erro decimal", () => {
  assert.equal(toCents(0.1 + 0.2), 30);
  assert.equal(toCents("125,47"), 12_547);
});

test("calcula saldos e não transforma transferência em renda", () => {
  const balances = calculateAccountBalances(accounts, transactions);
  assert.deepEqual(balances, { itau: 460_000, dinheiro: 30_000 });
  const summary = summarizePeriod(transactions, "2026-08-01", "2026-08-31T23:59:59.999Z");
  assert.equal(summary.incomeCents, 400_000);
  assert.equal(summary.expenseCents, 30_000);
  assert.equal(summary.netCents, 370_000);
});

test("separa saldo real, valor comprometido e dinheiro livre", () => {
  const pendingBill = {
    ...base,
    id: "energia",
    description: "Energia",
    amountCents: 25_000,
    type: "expense",
    sourceAccountId: "itau",
    status: "scheduled",
    dueDate: "2026-08-20",
  };
  const position = calculateFinancialPosition(accounts, [...transactions, pendingBill], "2026-08-31");
  assert.equal(position.totalBalanceCents, 490_000);
  assert.equal(position.committedCents, 25_000);
  assert.equal(position.freeMoneyCents, 465_000);
});

test("impede transferência para a mesma conta", () => {
  assert.throws(
    () => validateTransaction({ ...transactions[2], destinationAccountId: "itau" }),
    /devem ser diferentes/
  );
});

test("detecta duplicidade por identificador externo ou conteúdo", () => {
  const imported = { ...transactions[1], id: "importado", dedupeKey: "ofx:123" };
  const exact = { ...transactions[1], dedupeKey: "ofx:123" };
  assert.equal(findDuplicate(imported, [exact]).reason, "dedupe-key");
  assert.equal(findDuplicate({ ...transactions[1], id: "outro" }, transactions).reason, "fingerprint");
});
