import { Capacitor, registerPlugin } from "@capacitor/core";
import { loadAtlasRequests, persistAtlasRequests } from "./local-api.js";
import { calculateFinancialPosition } from "./engine.js";
import { calculateMonthlyPlanningCapacity } from "./decisions.js";
import { forecastFinancialFuture } from "./planning.js";

const NativeBridge = registerPlugin("CofrinhoBridge");

export function isNativeCofrinho() {
  return Capacitor.isNativePlatform();
}

export async function syncNativeFinancialSnapshot(data) {
  if (!isNativeCofrinho() || !data) return { ok: false, skipped: true };
  const today = new Date().toISOString().slice(0, 10);
  const position = calculateFinancialPosition(data.accounts, data.transactions, today);
  const atlasBridge = {
    calculatedAt: today,
    ...position,
    monthlyCapacityCents: calculateMonthlyPlanningCapacity(data, today),
    forecasts: [30, 60, 90].map((days) => forecastFinancialFuture(data, today, days)),
  };
  await NativeBridge.syncFinancialData({ data: JSON.stringify({ ...data, atlasBridge }) });
  return { ok: true };
}

export async function createNativeAtlasPairing() {
  if (!isNativeCofrinho()) return null;
  return NativeBridge.createPairing();
}

export async function getNativeAtlasConnectionStatus() {
  if (!isNativeCofrinho()) return { connected: false, expiresAt: 0 };
  return NativeBridge.getConnectionStatus();
}

export async function importNativeAtlasRequests(storage = localStorage) {
  if (!isNativeCofrinho()) return [];
  const response = await NativeBridge.drainRequests();
  const incoming = JSON.parse(response.requests || "[]");
  if (!incoming.length) return [];
  const current = loadAtlasRequests(storage);
  const ids = new Set(current.map((request) => request.requestId));
  const merged = [...incoming.filter((request) => !ids.has(request.requestId)), ...current];
  persistAtlasRequests(merged, storage);
  window.dispatchEvent(new CustomEvent("cofrinho:atlas-requests-changed"));
  return incoming;
}
