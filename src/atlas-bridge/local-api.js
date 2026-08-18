import { confirmAtlasTransaction, createAtlasSnapshot, proposeAtlasTransaction, saveFinancialData } from "../financial-engine/index.js";

export const COFRINHO_LOCAL_PROTOCOL = "cofrinho-local-v1";
const randomId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function createCofrinhoLocalApi({ getData, commitData, onProposal, now = () => Date.now(), persistData = saveFinancialData }) {
  let pairing = null;
  const sessions = new Map();
  const proposals = new Map();
  const processedRequests = new Set();

  function generatePairingCode() {
    const randomValue = globalThis.crypto?.getRandomValues?.(new Uint32Array(1))?.[0] ?? Math.floor(Math.random() * 1_000_000);
    const code = String(randomValue % 1_000_000).padStart(6, "0");
    pairing = { code, expiresAt: now() + 5 * 60_000 };
    return { code, expiresAt: pairing.expiresAt };
  }
  async function pair(input) {
    if (input?.protocol !== COFRINHO_LOCAL_PROTOCOL) throw new Error("Protocolo incompatível.");
    if (!pairing || now() > pairing.expiresAt || input.code !== pairing.code) throw new Error("Código de conexão inválido ou expirado.");
    const deviceId = String(input.deviceId ?? "").trim();
    if (!deviceId) throw new Error("Identificação do aparelho ausente.");
    const sessionToken = randomId();
    sessions.set(sessionToken, { deviceId, createdAt: now(), lastUsedAt: now() });
    pairing = null;
    return { protocol: COFRINHO_LOCAL_PROTOCOL, sessionToken, paired: true };
  }
  async function request(input) {
    if (input?.protocol !== COFRINHO_LOCAL_PROTOCOL) throw new Error("Protocolo incompatível.");
    const session = sessions.get(input.sessionToken);
    if (!session) throw new Error("Sessão não autorizada. Conecte novamente.");
    if (!Number.isFinite(input.timestamp) || Math.abs(now() - input.timestamp) > 2 * 60_000) throw new Error("Solicitação expirada.");
    if (!input.requestId || processedRequests.has(input.requestId)) throw new Error("Solicitação repetida ou sem identificação.");
    processedRequests.add(input.requestId);
    session.lastUsedAt = now();
    const data = getData();
    if (!data) throw new Error("Dados financeiros indisponíveis.");
    if (input.action === "read.summary") return createAtlasSnapshot(data);
    if (input.action === "read.accounts") return { accounts: createAtlasSnapshot(data).accounts };
    if (input.action === "read.goals") return { goals: data.goals.map(({ id, name, targetCents, deadline, category }) => ({ id, name, targetCents, deadline, category })) };
    if (input.action === "read.planning") return {
      recurringEntries: data.recurringEntries, debts: data.debts,
      creditCards: data.creditCards.map(({ id, name, limitCents, closingDay, dueDay }) => ({ id, name, limitCents, closingDay, dueDay })),
    };
    if (input.action === "propose.transaction") {
      const proposal = proposeAtlasTransaction(data, input.payload, { id: input.requestId, now: new Date(now()).toISOString() });
      proposals.set(proposal.proposalId, proposal);
      onProposal?.(proposal);
      return { proposalId: proposal.proposalId, state: proposal.state, requiresPabloConfirmation: true };
    }
    throw new Error(`Ação não autorizada: ${input.action}.`);
  }
  function confirm(proposalId) {
    const proposal = proposals.get(proposalId);
    if (!proposal) throw new Error("Proposta inexistente ou já encerrada.");
    const result = confirmAtlasTransaction(getData(), proposal, new Date(now()).toISOString());
    const saved = persistData(result.data);
    if (!saved.ok) throw new Error(saved.error);
    proposals.delete(proposalId);
    commitData(saved.data, result.receipt);
    return result.receipt;
  }
  function reject(proposalId) {
    if (!proposals.delete(proposalId)) throw new Error("Proposta inexistente ou já encerrada.");
    return { proposalId, status: "REJECTED" };
  }
  return { generatePairingCode, pair, request, confirm, reject };
}

export function installCofrinhoLocalApi(api) {
  const previous = globalThis.CofrinhoLocalAPI;
  globalThis.CofrinhoLocalAPI = api;
  return () => { if (globalThis.CofrinhoLocalAPI === api) globalThis.CofrinhoLocalAPI = previous; };
}
