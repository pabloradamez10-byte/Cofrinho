import test from "node:test";
import assert from "node:assert/strict";
import { createCofrinhoLocalApi, COFRINHO_LOCAL_PROTOCOL } from "../src/atlas-bridge/local-api.js";
import { createEmptyFinancialData } from "../src/financial-engine/index.js";

test("pareamento autoriza uma vez e proposta exige confirmação", async () => {
  const clock = Date.parse("2026-08-18T22:00:00.000Z");
  let data = createEmptyFinancialData();
  data.accounts = data.accounts.map((item) => item.id === "banrisul" ? { ...item, openingBalanceCents: 100_000 } : item);
  let pending = null; let receipt = null;
  const api = createCofrinhoLocalApi({
    getData: () => data,
    commitData: (next, savedReceipt) => { data = next; receipt = savedReceipt; },
    onProposal: (proposal) => { pending = proposal; },
    now: () => clock,
    persistData: (next) => ({ ok: true, data: next }),
  });
  const pairing = api.generatePairingCode();
  const paired = await api.pair({ protocol: COFRINHO_LOCAL_PROTOCOL, code: pairing.code, deviceId: "atlas-phone" });
  await assert.rejects(() => api.pair({ protocol: COFRINHO_LOCAL_PROTOCOL, code: pairing.code, deviceId: "other" }), /inválido/);
  const result = await api.request({
    protocol: COFRINHO_LOCAL_PROTOCOL, sessionToken: paired.sessionToken,
    requestId: "request-1", timestamp: clock, action: "propose.transaction",
    payload: { type: "expense", amountCents: 5_000, description: "Mercado", categoryId: "alimentacao", sourceAccountId: "banrisul" },
  });
  assert.equal(result.requiresPabloConfirmation, true);
  assert.equal(data.transactions.length, 0);
  api.confirm(pending.proposalId);
  assert.equal(data.transactions.length, 1);
  assert.equal(receipt.status, "COMMITTED");
});

test("bloqueia sessão inválida, repetição e ação não autorizada", async () => {
  const clock = Date.parse("2026-08-18T22:00:00.000Z");
  const data = createEmptyFinancialData();
  const api = createCofrinhoLocalApi({ getData: () => data, commitData: () => {}, now: () => clock });
  await assert.rejects(() => api.request({ protocol: COFRINHO_LOCAL_PROTOCOL, sessionToken: "x", requestId: "1", timestamp: clock, action: "read.summary" }), /não autorizada/);
  const pairing = api.generatePairingCode();
  const paired = await api.pair({ protocol: COFRINHO_LOCAL_PROTOCOL, code: pairing.code, deviceId: "atlas-phone" });
  const request = { protocol: COFRINHO_LOCAL_PROTOCOL, sessionToken: paired.sessionToken, requestId: "same", timestamp: clock, action: "pix" };
  await assert.rejects(() => api.request(request), /não autorizada/);
  await assert.rejects(() => api.request(request), /repetida/);
});
