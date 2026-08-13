import { toCents } from "./money.js";
import { validateAccount, validateTransaction } from "./validation.js";

export const FINANCIAL_STORAGE_KEY = "cofrinho_financial_v1";
export const FINANCIAL_BACKUP_KEY = "cofrinho_financial_backup_v1";
export const FINANCIAL_SCHEMA_VERSION = 1;

const DEFAULT_ACCOUNTS = Object.freeze([
  { id: "itau", name: "Itaú", type: "checking" },
  { id: "banrisul", name: "Banrisul", type: "checking" },
  { id: "dinheiro", name: "Dinheiro", type: "cash" },
  { id: "carteiras-digitais", name: "Carteiras digitais", type: "digital_wallet" },
]);

const clone = (value) => JSON.parse(JSON.stringify(value));

function createAccount(account) {
  return {
    ...account,
    openingBalanceCents: account.openingBalanceCents ?? 0,
    active: account.active ?? true,
    reconciliationStatus: account.reconciliationStatus ?? "unreconciled",
    createdAt: account.createdAt ?? new Date().toISOString(),
  };
}

function validateGoal(goal) {
  if (!goal || typeof goal !== "object" || typeof goal.id !== "string") {
    throw new TypeError("Meta financeira inválida.");
  }
  if (!Number.isSafeInteger(goal.targetCents) || goal.targetCents < 0) {
    throw new TypeError("Valor-alvo da meta inválido.");
  }
  if (!Array.isArray(goal.contributions)) throw new TypeError("Aportes da meta inválidos.");
  for (const contribution of goal.contributions) {
    if (!Number.isSafeInteger(contribution.amountCents) || contribution.amountCents < 0) {
      throw new TypeError("Valor do aporte inválido.");
    }
  }
}

export function validateFinancialData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new TypeError("Estrutura financeira inválida.");
  }
  if (data.schemaVersion !== FINANCIAL_SCHEMA_VERSION) {
    throw new TypeError("Versão da estrutura financeira incompatível.");
  }
  if (!Array.isArray(data.accounts) || !Array.isArray(data.transactions) || !Array.isArray(data.goals)) {
    throw new TypeError("Listas financeiras obrigatórias ausentes.");
  }

  const ids = new Set();
  for (const account of data.accounts) {
    validateAccount(account);
    if (ids.has(account.id)) throw new TypeError(`Conta duplicada: ${account.id}.`);
    ids.add(account.id);
  }
  data.transactions.forEach((transaction) => validateTransaction(transaction, ids));
  data.goals.forEach(validateGoal);
  return data;
}

export function createEmptyFinancialData() {
  const now = new Date().toISOString();
  return {
    schemaVersion: FINANCIAL_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    migration: null,
    accounts: DEFAULT_ACCOUNTS.map((account) => createAccount({ ...account, createdAt: now })),
    transactions: [],
    goals: [],
  };
}

export function migrateLegacyData(legacyData) {
  if (!legacyData || typeof legacyData !== "object" || !legacyData.goal) {
    throw new TypeError("Dados antigos inválidos; migração cancelada.");
  }
  if (!Array.isArray(legacyData.savings)) {
    throw new TypeError("Histórico de economias inválido; migração cancelada.");
  }

  const migrated = createEmptyFinancialData();
  const contributions = legacyData.savings.map((saving, index) => {
    const amountCents = toCents(Number(saving.value));
    if (amountCents < 0 || typeof saving.date !== "string" || Number.isNaN(Date.parse(saving.date))) {
      throw new TypeError(`Economia antiga inválida na posição ${index + 1}.`);
    }
    return {
      id: `legacy-saving-${String(saving.id ?? index)}`,
      amountCents,
      date: saving.date,
      category: saving.category ?? "Outro",
      note: saving.note ?? "",
      origin: "legacy",
      needsReconciliation: true,
    };
  });
  const savedTotalCents = contributions.reduce((sum, item) => sum + item.amountCents, 0);

  if (savedTotalCents > 0) {
    migrated.accounts.push(createAccount({
      id: "cofrinho-atual",
      name: "Cofrinho atual",
      type: "savings",
      openingBalanceCents: savedTotalCents,
      reconciliationStatus: "needs_review",
      createdAt: migrated.createdAt,
    }));
  }

  migrated.goals.push({
    id: "legacy-goal",
    name: legacyData.goal.name || "Minha conquista",
    category: legacyData.goal.category ?? "outros",
    targetCents: toCents(Number(legacyData.goal.target ?? 0)),
    deadline: legacyData.goal.date || null,
    linkedAccountId: savedTotalCents > 0 ? "cofrinho-atual" : null,
    contributions,
    origin: "legacy",
  });
  migrated.migration = {
    source: "cofrinho_data_v2",
    migratedAt: new Date().toISOString(),
    savingsCount: contributions.length,
    savingsTotalCents: savedTotalCents,
    needsReconciliation: savedTotalCents > 0,
  };
  migrated.updatedAt = migrated.migration.migratedAt;
  return validateFinancialData(migrated);
}

export function saveFinancialData(data, storage = localStorage) {
  try {
    const safeData = clone(validateFinancialData(data));
    safeData.updatedAt = new Date().toISOString();
    const previous = storage.getItem(FINANCIAL_STORAGE_KEY);
    if (previous) storage.setItem(FINANCIAL_BACKUP_KEY, previous);
    storage.setItem(FINANCIAL_STORAGE_KEY, JSON.stringify(safeData));
    return { ok: true, data: safeData };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export function loadFinancialData(storage = localStorage) {
  const raw = storage.getItem(FINANCIAL_STORAGE_KEY);
  if (!raw) return null;
  return clone(validateFinancialData(JSON.parse(raw)));
}

export function initializeFinancialData(legacyData, storage = localStorage) {
  try {
    const existing = loadFinancialData(storage);
    if (existing) return { ok: true, data: existing, migrated: false };
    const data = legacyData ? migrateLegacyData(legacyData) : createEmptyFinancialData();
    const saved = saveFinancialData(data, storage);
    return saved.ok ? { ...saved, migrated: Boolean(legacyData) } : saved;
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export function restoreFinancialBackup(storage = localStorage) {
  const raw = storage.getItem(FINANCIAL_BACKUP_KEY);
  if (!raw) throw new Error("Nenhuma versão financeira anterior foi encontrada.");
  return clone(validateFinancialData(JSON.parse(raw)));
}
