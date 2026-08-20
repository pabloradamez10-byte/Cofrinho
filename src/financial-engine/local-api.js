import { calculateAccountBalances, calculateFinancialPosition, findDuplicate } from "./engine.js";
import { forecastFinancialFuture } from "./planning.js";
import { validateTransaction } from "./validation.js";
import { validateFinancialData } from "./storage.js";

export const LOCAL_API_PROTOCOL = "cofrinho-local-v1";
export const ATLAS_PAIRING_KEY = "cofrinho_atlas_pairing_v1";
export const ATLAS_REQUESTS_KEY = "cofrinho_atlas_requests_v1";
const SESSION_MS = 30 * 60 * 1000;
const PAIRING_MS = 10 * 60 * 1000;
const REQUEST_CLOCK_SKEW_MS = 5 * 60 * 1000;
const sessions = new Map();

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function bytesToHex(bytes) { return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join(""); }
function randomToken(cryptoApi = crypto, size = 24) { return bytesToHex(cryptoApi.getRandomValues(new Uint8Array(size))); }

async function digest(value, cryptoApi = crypto) {
  const bytes = new TextEncoder().encode(value);
  return bytesToHex(new Uint8Array(await cryptoApi.subtle.digest("SHA-256", bytes)));
}

export function loadAtlasRequests(storage = localStorage) {
  const raw = storage.getItem(ATLAS_REQUESTS_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new TypeError("Caixa de pedidos do Atlas inválida.");
  return clone(parsed);
}

function saveAtlasRequests(requests, storage = localStorage) {
  storage.setItem(ATLAS_REQUESTS_KEY, JSON.stringify(requests));
  return clone(requests);
}

export function persistAtlasRequests(requests, storage = localStorage) { return saveAtlasRequests(requests, storage); }

export async function createAtlasPairing(storage = localStorage, cryptoApi = crypto, now = Date.now()) {
  const code = String((new DataView(cryptoApi.getRandomValues(new Uint8Array(4)).buffer).getUint32(0) % 900000) + 100000);
  storage.setItem(ATLAS_PAIRING_KEY, JSON.stringify({ hash: await digest(code, cryptoApi), expiresAt: now + PAIRING_MS, attempts: 0 }));
  return { code, expiresAt: now + PAIRING_MS, protocol: LOCAL_API_PROTOCOL };
}

export async function pairAtlasClient(code, client, storage = localStorage, cryptoApi = crypto, now = Date.now()) {
  if (client?.id !== "atlas-pocket" || typeof client?.deviceId !== "string" || !client.deviceId.trim()) throw new Error("Cliente local não autorizado.");
  const raw = storage.getItem(ATLAS_PAIRING_KEY);
  if (!raw) throw new Error("Nenhum pareamento foi solicitado no Cofrinho.");
  const pairing = JSON.parse(raw);
  if (pairing.expiresAt < now) { storage.removeItem(ATLAS_PAIRING_KEY); throw new Error("O código de pareamento expirou."); }
  pairing.attempts = (pairing.attempts ?? 0) + 1;
  if (pairing.attempts > 5) { storage.removeItem(ATLAS_PAIRING_KEY); throw new Error("Pareamento bloqueado após tentativas inválidas."); }
  if (await digest(String(code), cryptoApi) !== pairing.hash) { storage.setItem(ATLAS_PAIRING_KEY, JSON.stringify(pairing)); throw new Error("Código de pareamento inválido."); }
  storage.removeItem(ATLAS_PAIRING_KEY);
  const token = randomToken(cryptoApi);
  sessions.set(token, { clientId: client.id, deviceId: client.deviceId, createdAt: now, expiresAt: now + SESSION_MS });
  return { protocol: LOCAL_API_PROTOCOL, sessionToken: token, expiresAt: now + SESSION_MS, permissions: ["read.summary", "read.accounts", "read.goals", "read.planning", "propose.transaction"] };
}

function requireSession(token, now) {
  const session = sessions.get(token);
  if (!session || session.expiresAt < now) { if (session) sessions.delete(token); throw new Error("Sessão local ausente ou expirada."); }
  return session;
}

function validateEnvelope(message, now) {
  if (!message || message.protocol !== LOCAL_API_PROTOCOL) throw new TypeError("Protocolo local incompatível.");
  if (typeof message.requestId !== "string" || !/^[a-zA-Z0-9:_-]{8,120}$/.test(message.requestId)) throw new TypeError("Identificador da solicitação inválido.");
  if (!Number.isFinite(message.timestamp) || Math.abs(now - message.timestamp) > REQUEST_CLOCK_SKEW_MS) throw new TypeError("Solicitação local fora da janela de segurança.");
  if (typeof message.action !== "string") throw new TypeError("Ação local inválida.");
}

function summary(data, today) {
  const through = new Date(new Date(`${today}T12:00:00Z`).getTime() + 30 * 86_400_000).toISOString();
  const position = calculateFinancialPosition(data.accounts, data.transactions, through);
  return { totalBalanceCents: position.totalBalanceCents, freeMoneyCents: position.freeMoneyCents, committedCents: position.committedCents, reservedCents: position.reservedCents, currency: "BRL", calculatedAt: today };
}

function accountSummary(data) {
  const balances = calculateAccountBalances(data.accounts, data.transactions);
  return data.accounts.filter((account) => account.active !== false).map((account) => ({ id: account.id, name: account.name, type: account.type, balanceCents: balances[account.id], reconciliationStatus: account.reconciliationStatus }));
}

function transactionProposal(payload, data, requestId, nowIso) {
  const type = payload?.type;
  const transaction = {
    id: `atlas-${requestId}`,
    date: payload?.date,
    description: payload?.description,
    amountCents: payload?.amountCents,
    type,
    categoryId: payload?.categoryId ?? "outros",
    sourceAccountId: type === "expense" || type === "transfer" ? payload?.sourceAccountId : undefined,
    destinationAccountId: type === "income" || type === "transfer" ? payload?.destinationAccountId : undefined,
    paymentMethod: payload?.paymentMethod ?? null,
    status: "awaiting_confirmation",
    note: payload?.note ?? "Proposto pelo Atlas Pocket",
    origin: "atlas",
    dedupeKey: payload?.dedupeKey ?? `atlas:${requestId}`,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  validateTransaction(transaction, new Set(data.accounts.map((account) => account.id)));
  const duplicate = findDuplicate(transaction, data.transactions);
  if (duplicate.duplicate) throw new Error("O lançamento proposto já existe no Cofrinho.");
  return transaction;
}

export function getLocalApiInfo() {
  return { protocol: LOCAL_API_PROTOCOL, transport: "android-webview", confirmationRequired: true, allowedActions: ["read.summary", "read.accounts", "read.goals", "read.planning", "propose.transaction"], forbiddenActions: ["pix", "pay.bill", "loan.contract", "money.move", "data.delete"] };
}

export function handleAtlasRequest(sessionToken, message, data, storage = localStorage, now = Date.now()) {
  const session = requireSession(sessionToken, now);
  validateEnvelope(message, now);
  validateFinancialData(data);
  const existing = loadAtlasRequests(storage).find((request) => request.requestId === message.requestId);
  if (existing) return { ok: true, duplicate: true, request: existing };
  const today = new Date(now).toISOString().slice(0, 10);
  if (message.action === "read.summary") return { ok: true, data: summary(data, today) };
  if (message.action === "read.accounts") return { ok: true, data: accountSummary(data) };
  if (message.action === "read.goals") return { ok: true, data: data.goals.map((goal) => ({ id: goal.id, name: goal.name, targetCents: goal.targetCents, deadline: goal.deadline, savedCents: goal.contributions.reduce((sum, item) => sum + item.amountCents, 0) })) };
  if (message.action === "read.planning") return { ok: true, data: [30, 60, 90].map((days) => forecastFinancialFuture(data, today, days)) };
  if (message.action === "propose.transaction") {
    const transaction = transactionProposal(message.payload, data, message.requestId, new Date(now).toISOString());
    const request = { requestId: message.requestId, protocol: LOCAL_API_PROTOCOL, action: message.action, status: "awaiting_confirmation", createdAt: new Date(now).toISOString(), client: { id: session.clientId, deviceId: session.deviceId }, payload: { transaction } };
    saveAtlasRequests([request, ...loadAtlasRequests(storage)], storage);
    if (typeof globalThis.dispatchEvent === "function" && typeof globalThis.CustomEvent === "function") globalThis.dispatchEvent(new CustomEvent("cofrinho:atlas-requests-changed"));
    return { ok: true, requiresConfirmation: true, request: clone(request) };
  }
  throw new Error("Ação não permitida pela API local do Cofrinho.");
}

export function decideAtlasRequest(data, requestId, decision, storage = localStorage, decidedAt = new Date().toISOString(), accountId = null) {
  const requests = loadAtlasRequests(storage);
  const target = requests.find((request) => request.requestId === requestId);
  if (!target || target.status !== "awaiting_confirmation") throw new Error("Pedido do Atlas não está disponível para decisão.");
  if (!['approve', 'reject'].includes(decision)) throw new TypeError("Decisão inválida.");
  let next = clone(data);
  if (decision === "approve") {
    const pending = target.payload.transaction;
    const selectedAccount = accountId || pending.sourceAccountId || pending.destinationAccountId;
    if (!selectedAccount || !data.accounts.some((account) => account.id === selectedAccount && account.active !== false)) {
      throw new Error("Escolha a conta correta antes de aprovar o lançamento.");
    }
    const transaction = {
      ...pending,
      sourceAccountId: pending.type === "expense" ? selectedAccount : pending.sourceAccountId,
      destinationAccountId: pending.type === "income" ? selectedAccount : pending.destinationAccountId,
      status: "confirmed", confirmedAt: decidedAt, updatedAt: decidedAt,
    };
    validateTransaction(transaction, new Set(data.accounts.map((account) => account.id)));
    if (findDuplicate(transaction, data.transactions).duplicate) throw new Error("O lançamento já existe; aprovação cancelada.");
    next.transactions.push(transaction);
  }
  const updated = requests.map((request) => request.requestId === requestId ? { ...request, status: decision === "approve" ? "approved" : "rejected", decidedAt } : request);
  const activity = { id: `atlas-request-${requestId}`, date: decidedAt, actor: "atlas", action: decision === "approve" ? "atlas_request_approved" : "atlas_request_rejected", title: decision === "approve" ? "Pedido do Atlas aprovado" : "Pedido do Atlas rejeitado", description: target.payload.transaction.description, status: "completed", reversible: decision === "approve", requestId, origin: "atlas-pocket", confirmation: "Pablo" };
  next.activities = [activity, ...next.activities];
  validateFinancialData(next);
  return { data: next, requests: updated, request: updated.find((request) => request.requestId === requestId), activity };
}
