import { toCents } from "./money.js";
import { validateAccount, validateTransaction } from "./validation.js";
import { validateCardPurchase, validateCreditCard } from "./cards.js";
import { validateDebt, validateRecurringEntry } from "./planning.js";

export const PREVIOUS_FINANCIAL_STORAGE_KEY = "cofrinho_financial_v3";
export const FINANCIAL_STORAGE_KEY = "cofrinho_financial_v4";
export const FINANCIAL_BACKUP_KEY = "cofrinho_financial_backup_v4";
export const FINANCIAL_SCHEMA_VERSION = 4;

const DEFAULT_ACCOUNTS = Object.freeze([
  { id: "itau", name: "Itaú", type: "checking" },
  { id: "banrisul", name: "Banrisul", type: "checking" },
  { id: "dinheiro", name: "Dinheiro", type: "cash" },
  { id: "carteiras-digitais", name: "Carteiras digitais", type: "digital_wallet" },
]);

const clone = (value) => JSON.parse(JSON.stringify(value));

const DEFAULT_CATEGORIES = Object.freeze([
  ["moradia", "Moradia", "expense"], ["alimentacao", "Alimentação", "expense"],
  ["transporte", "Transporte", "expense"], ["saude", "Saúde", "expense"],
  ["educacao", "Educação", "expense"], ["lazer", "Lazer", "expense"],
  ["dividas", "Dívidas e financiamentos", "expense"],
  ["assinaturas", "Assinaturas", "expense"], ["projetos", "Projetos", "both"],
  ["salario", "Salário", "income"], ["peculio", "Pecúlio", "income"],
  ["outros", "Outros", "both"],
].map(([id, name, kind]) => Object.freeze({ id, name, kind, active: true, system: true })));

function normalizeLoadedData(data) {
  const normalized = clone(data);
  normalized.activities ??= [];
  if (normalized.migration?.source === "cofrinho_data_v2") {
    normalized.accounts = normalized.accounts.map((account) => account.id === "cofrinho-atual"
      ? { ...account, reserved: true }
      : account);
    if (!normalized.activities.some((activity) => activity.id === "legacy-migration")) {
      normalized.activities.push({
        id: "legacy-migration",
        date: normalized.migration.migratedAt,
        actor: "system",
        action: "legacy_data_migrated",
        title: "Dados anteriores preservados",
        description: `${normalized.migration.savingsCount} aporte(s) foram preparados para conferência.`,
        status: normalized.migration.needsReconciliation ? "needs_review" : "completed",
        reversible: false,
      });
    }
  }
  return normalized;
}

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
  if (!Array.isArray(data.accounts) || !Array.isArray(data.transactions)
      || !Array.isArray(data.goals) || !Array.isArray(data.categories)
      || !Array.isArray(data.activities) || !Array.isArray(data.creditCards)
      || !Array.isArray(data.cardPurchases) || !Array.isArray(data.recurringEntries)
      || !Array.isArray(data.debts)) {
    throw new TypeError("Listas financeiras obrigatórias ausentes.");
  }

  const ids = new Set();
  for (const account of data.accounts) {
    validateAccount(account);
    if (ids.has(account.id)) throw new TypeError(`Conta duplicada: ${account.id}.`);
    ids.add(account.id);
  }
  data.transactions.forEach((transaction) => validateTransaction(transaction, ids));
  const cardIds = new Set();
  for (const card of data.creditCards) {
    validateCreditCard(card);
    if (cardIds.has(card.id)) throw new TypeError(`Cartão duplicado: ${card.id}.`);
    cardIds.add(card.id);
  }
  data.cardPurchases.forEach((purchase) => validateCardPurchase(purchase, cardIds));
  data.recurringEntries.forEach(validateRecurringEntry);
  data.debts.forEach(validateDebt);
  const categoryIds = new Set();
  for (const category of data.categories) {
    if (!category || typeof category.id !== "string" || !category.id.trim()
        || typeof category.name !== "string" || !category.name.trim()) {
      throw new TypeError("Categoria financeira inválida.");
    }
    if (categoryIds.has(category.id)) throw new TypeError(`Categoria duplicada: ${category.id}.`);
    categoryIds.add(category.id);
  }
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
    categories: clone(DEFAULT_CATEGORIES),
    transactions: [],
    creditCards: [],
    cardPurchases: [],
    recurringEntries: [],
    debts: [],
    goals: [],
    activities: [],
  };
}

export function migrateFinancialV3(data) {
  if (!data || data.schemaVersion !== 3) throw new TypeError("Dados financeiros da versão 3 inválidos.");
  const migratedAt = new Date().toISOString();
  const migrated = {
    ...clone(data),
    schemaVersion: FINANCIAL_SCHEMA_VERSION,
    recurringEntries: [],
    debts: [],
    activities: [...(data.activities ?? []), {
      id: `financial-v4-migration-${migratedAt}`,
      date: migratedAt,
      actor: "system",
      action: "financial_schema_migrated",
      title: "Planejamento financeiro preparado",
      description: "Estrutura financeira v3 preservada e preparada para recorrências, dívidas e previsões.",
      status: "completed",
      reversible: true,
    }],
    previousSchemaVersion: 3,
    updatedAt: migratedAt,
  };
  return validateFinancialData(migrated);
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
      reserved: true,
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
  migrated.activities = [{
    id: "legacy-migration",
    date: migrated.migration.migratedAt,
    actor: "system",
    action: "legacy_data_migrated",
    title: "Dados anteriores preservados",
    description: `${contributions.length} aporte(s) foram preparados para conferência.`,
    status: savedTotalCents > 0 ? "needs_review" : "completed",
    reversible: false,
  }];
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
  return clone(validateFinancialData(normalizeLoadedData(JSON.parse(raw))));
}

export function initializeFinancialData(legacyData, storage = localStorage) {
  try {
    const existing = loadFinancialData(storage);
    if (existing) return { ok: true, data: existing, migrated: false };
    const previousRaw = storage.getItem(PREVIOUS_FINANCIAL_STORAGE_KEY);
    const data = previousRaw
      ? migrateFinancialV3(JSON.parse(previousRaw))
      : legacyData ? migrateLegacyData(legacyData) : createEmptyFinancialData();
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
