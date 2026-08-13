import test from "node:test";
import assert from "node:assert/strict";
import { createAtlasPairing, createEmptyFinancialData, decideAtlasRequest, getLocalApiInfo, handleAtlasRequest, loadAtlasRequests, pairAtlasClient, persistAtlasRequests } from "../src/financial-engine/index.js";

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

const NOW = Date.parse("2026-08-13T12:00:00.000Z");
const envelope = (requestId, action, payload = null) => ({ protocol: "cofrinho-local-v1", requestId, timestamp: NOW, action, payload });

async function paired(storage) {
  const pairing = await createAtlasPairing(storage, crypto, NOW);
  return pairAtlasClient(pairing.code, { id: "atlas-pocket", deviceId: "pablo-phone" }, storage, crypto, NOW);
}

test("pareamento é temporário, consumível e entrega somente permissões permitidas", async () => {
  const storage = memoryStorage();
  const session = await paired(storage);
  assert.equal(session.protocol, "cofrinho-local-v1");
  assert.ok(session.permissions.includes("propose.transaction"));
  assert.ok(!session.permissions.includes("pix"));
  await assert.rejects(() => pairAtlasClient("000000", { id: "atlas-pocket", deviceId: "pablo-phone" }, storage, crypto, NOW), /Nenhum pareamento/);
});

test("API local expõe apenas resumo financeiro autorizado", async () => {
  const storage = memoryStorage();
  const session = await paired(storage);
  const data = createEmptyFinancialData();
  const response = handleAtlasRequest(session.sessionToken, envelope("request:summary:001", "read.summary"), data, storage, NOW);
  assert.equal(response.ok, true);
  assert.equal(response.data.currency, "BRL");
  assert.equal(response.data.totalBalanceCents, 0);
  assert.equal(response.data.transactions, undefined);
});

test("Atlas cria proposta, mas saldo só muda após confirmação de Pablo", async () => {
  const storage = memoryStorage();
  const session = await paired(storage);
  const data = createEmptyFinancialData();
  const message = envelope("request:expense:001", "propose.transaction", { type: "expense", date: "2026-08-13", description: "Mercado", amountCents: 5_000, sourceAccountId: "itau", categoryId: "alimentacao" });
  const proposed = handleAtlasRequest(session.sessionToken, message, data, storage, NOW);
  assert.equal(proposed.requiresConfirmation, true);
  assert.equal(data.transactions.length, 0);
  assert.equal(loadAtlasRequests(storage)[0].status, "awaiting_confirmation");
  const approved = decideAtlasRequest(data, message.requestId, "approve", storage, "2026-08-13T12:01:00.000Z");
  assert.equal(approved.data.transactions.length, 1);
  assert.equal(approved.data.transactions[0].status, "confirmed");
  assert.equal(approved.activity.confirmation, "Pablo");
  persistAtlasRequests(approved.requests, storage);
  assert.equal(loadAtlasRequests(storage)[0].status, "approved");
});

test("rejeição fica auditável e não cria lançamento", async () => {
  const storage = memoryStorage();
  const session = await paired(storage);
  const data = createEmptyFinancialData();
  handleAtlasRequest(session.sessionToken, envelope("request:income:001", "propose.transaction", { type: "income", date: "2026-08-13", description: "Receita", amountCents: 10_000, destinationAccountId: "itau" }), data, storage, NOW);
  const rejected = decideAtlasRequest(data, "request:income:001", "reject", storage, "2026-08-13T12:02:00.000Z");
  assert.equal(rejected.data.transactions.length, 0);
  assert.equal(rejected.activity.action, "atlas_request_rejected");
});

test("repetição retorna o mesmo pedido e ações perigosas são bloqueadas", async () => {
  const storage = memoryStorage();
  const session = await paired(storage);
  const data = createEmptyFinancialData();
  const message = envelope("request:repeat:001", "propose.transaction", { type: "expense", date: "2026-08-13", description: "Internet", amountCents: 12_000, sourceAccountId: "itau" });
  handleAtlasRequest(session.sessionToken, message, data, storage, NOW);
  const replay = handleAtlasRequest(session.sessionToken, message, data, storage, NOW);
  assert.equal(replay.duplicate, true);
  assert.equal(loadAtlasRequests(storage).length, 1);
  assert.throws(() => handleAtlasRequest(session.sessionToken, envelope("request:pix:0001", "pix", {}), data, storage, NOW), /não permitida/);
  assert.ok(getLocalApiInfo().forbiddenActions.includes("money.move"));
});
