import {
  STORAGE_KEY,
  SECURE_STORAGE_KEY,
  BACKUP_STORAGE_KEY,
  DATA_SCHEMA_VERSION,
} from "./constants.js";

export const brl = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    isFinite(v) ? v : 0
  );

export const todayStr = () => new Date().toISOString().slice(0, 10);

export const dayOfYear = (d = new Date()) => {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d - start;
  return Math.floor(diff / 86400000);
};

const clone = (value) => JSON.parse(JSON.stringify(value));

export function validateData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  if (!data.goal || typeof data.goal !== "object") return false;
  if (!Array.isArray(data.savings) || !Array.isArray(data.completedDates)) return false;
  return data.savings.every(
    (saving) =>
      saving &&
      (typeof saving.id === "number" || typeof saving.id === "string") &&
      Number.isFinite(Number(saving.value)) &&
      typeof saving.date === "string"
  );
}

export function createEnvelope(data, origin = "app") {
  if (!validateData(data)) throw new Error("Dados do Cofrinho inválidos.");
  return {
    app: "cofrinho",
    schemaVersion: DATA_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    origin,
    data: clone(data),
  };
}

export function parseEnvelope(raw) {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (
    !parsed ||
    parsed.app !== "cofrinho" ||
    parsed.schemaVersion !== DATA_SCHEMA_VERSION ||
    !validateData(parsed.data)
  ) {
    throw new Error("Este arquivo não é um backup válido do Cofrinho.");
  }
  return parsed;
}

export function loadData(storage = localStorage) {
  try {
    const current = storage.getItem(SECURE_STORAGE_KEY);
    if (current) return parseEnvelope(current).data;

    const legacy = storage.getItem(STORAGE_KEY);
    if (legacy) {
      const legacyData = JSON.parse(legacy);
      if (!validateData(legacyData)) throw new Error("Dados antigos inválidos.");
      storage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(createEnvelope(legacyData, "legacy-backup")));
      storage.setItem(SECURE_STORAGE_KEY, JSON.stringify(createEnvelope(legacyData, "legacy-migration")));
      return clone(legacyData);
    }
  } catch (e) {
    console.error("Falha ao carregar dados do Cofrinho:", e);
  }
  return null;
}

export function saveData(data, storage = localStorage) {
  try {
    if (!validateData(data)) throw new Error("Dados inválidos; gravação cancelada.");
    const previous = storage.getItem(SECURE_STORAGE_KEY);
    if (previous) storage.setItem(BACKUP_STORAGE_KEY, previous);
    storage.setItem(SECURE_STORAGE_KEY, JSON.stringify(createEnvelope(data)));
    return { ok: true };
  } catch (e) {
    console.error("Falha ao salvar dados do Cofrinho:", e);
    return { ok: false, error: e.message };
  }
}

export function exportBackup(data) {
  return JSON.stringify(createEnvelope(data, "manual-export"), null, 2);
}

export function importBackup(raw) {
  return clone(parseEnvelope(raw).data);
}

export function restoreAutomaticBackup(storage = localStorage) {
  const raw = storage.getItem(BACKUP_STORAGE_KEY);
  if (!raw) throw new Error("Nenhum backup automático foi encontrado.");
  const envelope = parseEnvelope(raw);
  return clone(envelope.data);
}

export function resizeImage(file, maxW = 480) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
