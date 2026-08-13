import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAccountBalances,
  calculateFinancialPosition,
  confirmTransaction,
  correctTransaction,
  findDuplicate,
  getAccountTransactions,
  getTransactionsAwaitingConfirmation,
  reconcileAccount,
  reverseTransaction,
  summarizePeriod,
  transactionImpactForAccount,
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

test("não considera dinheiro reservado como livre", () => {
  const reservedAccounts = accounts.map((account) => account.id === "dinheiro"
    ? { ...account, reserved: true }
    : account);
  const position = calculateFinancialPosition(reservedAccounts, transactions, "2026-08-31");
  assert.equal(position.reservedCents, 30_000);
  assert.equal(position.freeMoneyCents, 460_000);
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

test("mantém lançamento detectado fora do saldo até a confirmação", () => {
  const detected = {
    ...transactions[1], id: "notificacao-1", status: "detected", origin: "notification",
  };
  assert.equal(calculateAccountBalances(accounts, [detected]).itau, 100_000);
  const confirmed = confirmTransaction(detected, "2026-08-13T13:00:00.000Z");
  assert.equal(confirmed.status, "confirmed");
  assert.equal(calculateAccountBalances(accounts, [confirmed]).itau, 70_000);
});

test("corrige lançamento confirmado e recalcula pelo valor corrigido", () => {
  const corrected = correctTransaction(
    { ...transactions[1], status: "confirmed" },
    { amountCents: 25_000, categoryId: "alimentacao" },
    "2026-08-13T14:00:00.000Z"
  );
  assert.equal(corrected.status, "corrected");
  assert.equal(corrected.id, "mercado");
  assert.equal(calculateAccountBalances(accounts, [corrected]).itau, 75_000);
});

test("desfaz sem apagar o original e neutraliza seu efeito financeiro", () => {
  const confirmed = { ...transactions[1], status: "confirmed" };
  const { original, reversal } = reverseTransaction(
    confirmed, "2026-08-14T10:00:00.000Z", "reversao-mercado"
  );
  assert.equal(original.status, "reversed");
  assert.equal(reversal.reversesTransactionId, original.id);
  assert.equal(calculateAccountBalances(accounts, [original, reversal]).itau, 100_000);
  const summary = summarizePeriod([original, reversal], "2026-08-01", "2026-08-31T23:59:59.999Z");
  assert.deepEqual(summary, { incomeCents: 0, expenseCents: 0, netCents: 0 });
});

test("concilia conta sem esconder diferenças", () => {
  const exact = reconcileAccount(accounts[0], 100_000, 100_000, "2026-08-13T15:00:00.000Z");
  assert.equal(exact.reconciliationStatus, "reconciled");
  assert.equal(exact.reconciliationDifferenceCents, 0);
  const different = reconcileAccount(accounts[0], 100_000, 105_000, "2026-08-13T15:00:00.000Z");
  assert.equal(different.reconciliationStatus, "difference_found");
  assert.equal(different.reconciliationDifferenceCents, 5_000);
});

test("lista somente as movimentações da conta em ordem recente", () => {
  const result = getAccountTransactions("itau", [
    transactions[1],
    { ...transactions[0], date: "2026-08-14T12:00:00.000Z" },
    { ...transactions[1], id: "fora", sourceAccountId: "outra" },
  ]);
  assert.deepEqual(result.map((item) => item.id), ["salario", "mercado"]);
});

test("calcula o impacto visual de cada movimentação na conta", () => {
  assert.equal(transactionImpactForAccount(transactions[0], "itau"), 400_000);
  assert.equal(transactionImpactForAccount(transactions[1], "itau"), -30_000);
  assert.equal(transactionImpactForAccount(transactions[2], "itau"), -10_000);
  assert.equal(transactionImpactForAccount(transactions[2], "dinheiro"), 10_000);
  assert.equal(transactionImpactForAccount({ ...transactions[1], status: "detected" }, "itau"), 0);
});

test("separa o que aguarda confirmação sem afetar os registros confirmados", () => {
  const awaiting = getTransactionsAwaitingConfirmation([
    ...transactions,
    { ...transactions[1], id: "detectada", status: "detected" },
    { ...transactions[1], id: "confirmar", status: "awaiting_confirmation", date: "2026-08-14" },
  ]);
  assert.deepEqual(awaiting.map((item) => item.id), ["confirmar", "detectada"]);
});
