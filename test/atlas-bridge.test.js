import test from "node:test";
import assert from "node:assert/strict";
import {
  confirmAtlasTransaction,
  createAtlasSnapshot,
  createEmptyFinancialData,
  proposeAtlasTransaction,
} from "../src/financial-engine/index.js";

function fixture() {
  const data = createEmptyFinancialData();
  data.accounts = data.accounts.map((account) => account.id === "banrisul"
    ? { ...account, openingBalanceCents: 100_000 }
    : account);
  return data;
}

test("consulta saldos sem expor ou alterar a estrutura financeira", () => {
  const data = fixture();
  const original = structuredClone(data);
  const snapshot = createAtlasSnapshot(data, "2026-08-18T22:00:00.000Z");
  assert.equal(snapshot.readOnly, true);
  assert.equal(snapshot.accounts.find((item) => item.id === "banrisul").balanceCents, 100_000);
  assert.deepEqual(data, original);
});

test("proposta do Atlas não altera saldo antes da confirmação de Pablo", () => {
  const data = fixture();
  const proposal = proposeAtlasTransaction(data, {
    type: "expense", amountCents: 8_450, description: "Combustível",
    categoryId: "transporte", sourceAccountId: "banrisul",
  }, { id: "proposal-1", now: "2026-08-18T22:00:00.000Z" });
  assert.equal(proposal.state, "AWAITING_PABLO_CONFIRMATION");
  assert.equal(data.transactions.length, 0);
  assert.equal(createAtlasSnapshot(data).accounts.find((item) => item.id === "banrisul").balanceCents, 100_000);
});

test("confirmação grava uma vez e devolve recibo com saldo resultante", () => {
  const data = fixture();
  const proposal = proposeAtlasTransaction(data, {
    type: "expense", amountCents: 8_450, description: "Combustível",
    categoryId: "transporte", sourceAccountId: "banrisul",
  }, { id: "proposal-2", now: "2026-08-18T22:00:00.000Z" });
  const result = confirmAtlasTransaction(data, proposal, "2026-08-18T22:05:00.000Z");
  assert.equal(result.receipt.status, "COMMITTED");
  assert.equal(result.receipt.balancesAfterCents.banrisul, 91_550);
  assert.equal(result.data.transactions[0].status, "confirmed");
  assert.equal(data.transactions.length, 0);
  assert.throws(() => confirmAtlasTransaction(result.data, proposal, "2026-08-18T22:06:00.000Z"), /duplicado/);
});

test("recusa proposta expirada ou sem confirmação pendente", () => {
  const data = fixture();
  const proposal = proposeAtlasTransaction(data, {
    type: "income", amountCents: 10_000, description: "Recebimento",
    categoryId: "outros", destinationAccountId: "banrisul",
  }, {
    id: "proposal-3", now: "2026-08-18T22:00:00.000Z",
    expiresAt: "2026-08-18T22:01:00.000Z",
  });
  assert.throws(() => confirmAtlasTransaction(data, proposal, "2026-08-18T22:02:00.000Z"), /expirou/);
  assert.throws(() => confirmAtlasTransaction(data, { ...proposal, state: "COMMITTED" }), /não está aguardando/);
});
