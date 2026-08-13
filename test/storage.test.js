import test from "node:test";
import assert from "node:assert/strict";
import {
  createEnvelope,
  exportBackup,
  importBackup,
  loadData,
  restoreAutomaticBackup,
  saveData,
} from "../src/lib/helpers.js";
import { STORAGE_KEY, SECURE_STORAGE_KEY, BACKUP_STORAGE_KEY } from "../src/lib/constants.js";

const sample = {
  goal: { category: "reserva", name: "Reserva", target: 1000, date: "2027-01-01" },
  savings: [{ id: 1, value: 125.5, category: "Outro", note: "teste", date: "2026-08-13T10:00:00.000Z" }],
  completedDates: ["2026-08-13"],
  milestonesShown: {},
};

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
  };
}

test("migra o legado sem apagar a chave antiga", () => {
  const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(sample) });
  assert.deepEqual(loadData(storage), sample);
  assert.equal(storage.getItem(STORAGE_KEY), JSON.stringify(sample));
  assert.ok(storage.getItem(SECURE_STORAGE_KEY));
  assert.ok(storage.getItem(BACKUP_STORAGE_KEY));
});

test("exporta e importa preservando valores e registros", () => {
  const restored = importBackup(exportBackup(sample));
  assert.deepEqual(restored, sample);
  assert.equal(restored.savings.reduce((sum, item) => sum + item.value, 0), 125.5);
});

test("rejeita arquivo adulterado", () => {
  const envelope = createEnvelope(sample);
  envelope.app = "outro-app";
  assert.throws(() => importBackup(JSON.stringify(envelope)), /backup válido/);
});

test("mantém uma versão anterior e permite restaurá-la", () => {
  const storage = memoryStorage();
  saveData(sample, storage);
  const changed = { ...sample, savings: [...sample.savings, { id: 2, value: 50, date: "2026-08-14T10:00:00.000Z" }] };
  saveData(changed, storage);
  const restored = restoreAutomaticBackup(storage);
  assert.deepEqual(restored, sample);
  assert.deepEqual(loadData(storage), changed);
  saveData(restored, storage);
  assert.deepEqual(loadData(storage), sample);
});

test("não grava dados inválidos", () => {
  const storage = memoryStorage();
  const result = saveData({ goal: null }, storage);
  assert.equal(result.ok, false);
  assert.equal(storage.getItem(SECURE_STORAGE_KEY), null);
});
