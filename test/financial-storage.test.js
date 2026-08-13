import test from "node:test";
import assert from "node:assert/strict";
import {
  FINANCIAL_BACKUP_KEY,
  FINANCIAL_STORAGE_KEY,
  initializeFinancialData,
  loadFinancialData,
  migrateLegacyData,
  restoreFinancialBackup,
  saveFinancialData,
} from "../src/financial-engine/index.js";

const legacy = {
  goal: { category: "reserva", name: "Reserva de emergência", target: 10_000, date: "2027-12-31" },
  savings: [
    { id: 1, value: 125.5, category: "Economia", note: "primeiro", date: "2026-08-01T12:00:00.000Z" },
    { id: 2, value: 74.5, category: "Extra", note: "segundo", date: "2026-08-10T12:00:00.000Z" },
  ],
  completedDates: ["2026-08-01"],
  milestonesShown: {},
};

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
  };
}

test("migra contas padrão, meta e todas as economias sem inflar receitas", () => {
  const migrated = migrateLegacyData(legacy);
  assert.deepEqual(migrated.accounts.slice(0, 4).map((account) => account.id), [
    "itau", "banrisul", "dinheiro", "carteiras-digitais",
  ]);
  assert.equal(migrated.accounts.find((account) => account.id === "cofrinho-atual").openingBalanceCents, 20_000);
  assert.equal(migrated.goals[0].targetCents, 1_000_000);
  assert.equal(migrated.goals[0].contributions.length, 2);
  assert.equal(migrated.transactions.length, 0);
  assert.equal(migrated.migration.savingsTotalCents, 20_000);
});

test("inicialização é idempotente e não remigra nem duplica contas", () => {
  const storage = memoryStorage();
  const first = initializeFinancialData(legacy, storage);
  const second = initializeFinancialData({ ...legacy, savings: [] }, storage);
  assert.equal(first.ok, true);
  assert.equal(first.migrated, true);
  assert.equal(second.migrated, false);
  assert.deepEqual(second.data, first.data);
  assert.equal(second.data.accounts.filter((account) => account.id === "cofrinho-atual").length, 1);
});

test("mantém os dados antigos fora da chave financeira", () => {
  const oldRaw = JSON.stringify(legacy);
  const storage = memoryStorage({ cofrinho_data_v2: oldRaw });
  initializeFinancialData(legacy, storage);
  assert.equal(storage.getItem("cofrinho_data_v2"), oldRaw);
  assert.ok(storage.getItem(FINANCIAL_STORAGE_KEY));
});

test("migração inválida falha sem gravar parcialmente", () => {
  const storage = memoryStorage();
  const result = initializeFinancialData({ goal: legacy.goal, savings: [{ value: "erro", date: "ontem" }] }, storage);
  assert.equal(result.ok, false);
  assert.equal(storage.getItem(FINANCIAL_STORAGE_KEY), null);
});

test("salvamento mantém versão anterior recuperável", () => {
  const storage = memoryStorage();
  const initialized = initializeFinancialData(legacy, storage).data;
  const changed = {
    ...initialized,
    accounts: initialized.accounts.map((account) => account.id === "itau"
      ? { ...account, openingBalanceCents: 50_000 }
      : account),
  };
  assert.equal(saveFinancialData(changed, storage).ok, true);
  assert.ok(storage.getItem(FINANCIAL_BACKUP_KEY));
  assert.deepEqual(restoreFinancialBackup(storage), initialized);
  assert.equal(loadFinancialData(storage).accounts.find((account) => account.id === "itau").openingBalanceCents, 50_000);
});
