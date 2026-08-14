import { Capacitor, registerPlugin } from "@capacitor/core";
import { loadAtlasRequests, persistAtlasRequests } from "./local-api.js";

const NativeBridge = registerPlugin("CofrinhoBridge");

export function isNativeCofrinho() {
  return Capacitor.isNativePlatform();
}

export async function syncNativeFinancialSnapshot(data) {
  if (!isNativeCofrinho() || !data) return { ok: false, skipped: true };
  await NativeBridge.syncFinancialData({ data: JSON.stringify(data) });
  return { ok: true };
}

export async function createNativeAtlasPairing() {
  if (!isNativeCofrinho()) return null;
  return NativeBridge.createPairing();
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
