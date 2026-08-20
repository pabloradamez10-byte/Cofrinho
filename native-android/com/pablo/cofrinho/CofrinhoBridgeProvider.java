package com.pablo.cofrinho;

import android.content.*;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import java.security.SecureRandom;
import java.util.UUID;
import org.json.*;

public class CofrinhoBridgeProvider extends ContentProvider {
  private static final long SESSION_MS = 30L * 24 * 60 * 60_000L;
  private static final String ATLAS_PACKAGE = "com.pablo.atlaspocket";
  private static final String PROTOCOL = "cofrinho-android-v1";
  @Override public boolean onCreate() { return true; }

  @Override public Bundle call(String method, String arg, Bundle extras) {
    Bundle out = new Bundle();
    try {
      if (!isAuthorizedCaller()) return error("unauthorized_caller", "Somente o Atlas Pocket instalado pode usar esta ponte");
      if ("pair".equals(method)) return pair(extras);
      if (!"request".equals(method)) return error("unsupported_method", "Método não permitido");
      return request(extras);
    } catch (Exception e) { return error("bridge_error", "Não foi possível processar o pedido"); }
  }

  private Bundle pair(Bundle e) {
    if (e == null || !PROTOCOL.equals(e.getString("protocol")) || !"atlas-pocket".equals(e.getString("clientId"))) return error("invalid_client", "Cliente ou protocolo inválido");
    android.content.SharedPreferences p = CofrinhoBridgePlugin.prefs(getContext());
    String expected = p.getString("pair_code", "");
    if (System.currentTimeMillis() > p.getLong("pair_expires", 0) || !expected.equals(e.getString("code"))) return error("invalid_code", "Código inválido ou expirado");
    String token = UUID.randomUUID().toString() + Long.toHexString(new SecureRandom().nextLong());
    long expires = System.currentTimeMillis() + SESSION_MS;
    p.edit().remove("pair_code").putString("token", token).putLong("token_expires", expires).apply();
    Bundle out = new Bundle(); out.putBoolean("ok", true); out.putString("token", token); out.putLong("expiresAt", expires); return out;
  }

  private Bundle request(Bundle e) throws Exception {
    if (e == null || !PROTOCOL.equals(e.getString("protocol")) || !"atlas-pocket".equals(e.getString("clientId"))) return error("invalid_request", "Pedido, cliente ou protocolo inválido");
    android.content.SharedPreferences p = CofrinhoBridgePlugin.prefs(getContext());
    if (!p.getString("token", "").equals(e.getString("token")) || System.currentTimeMillis() > p.getLong("token_expires", 0)) return error("unauthorized", "Pareamento necessário");
    long timestamp = e.getLong("timestamp", 0);
    if (Math.abs(System.currentTimeMillis() - timestamp) > 5 * 60_000L) return error("expired_request", "Pedido expirado");
    p.edit().putLong("token_expires", System.currentTimeMillis() + SESSION_MS).apply();
    String action = e.getString("action", "");
    JSONObject snapshot = new JSONObject(p.getString("snapshot", "{}"));
    JSONObject result = new JSONObject();
    if ("read.summary".equals(action)) result = summary(snapshot);
    else if ("read.accounts".equals(action)) result.put("accounts", snapshot.optJSONArray("accounts") == null ? new JSONArray() : snapshot.optJSONArray("accounts"));
    else if ("read.goals".equals(action)) result.put("goals", snapshot.optJSONArray("goals") == null ? new JSONArray() : snapshot.optJSONArray("goals"));
    else if ("simulate.purchase".equals(action)) result = simulatePurchase(snapshot, new JSONObject(e.getString("payload", "{}")));
    else if ("propose.transaction".equals(action)) return propose(p, e);
    else return error("forbidden_action", "Ação não permitida");
    Bundle out = new Bundle(); out.putBoolean("ok", true); out.putString("result", result.toString()); return out;
  }

  private JSONObject summary(JSONObject data) throws Exception {
    JSONArray accounts = data.optJSONArray("accounts"); if (accounts == null) accounts = new JSONArray();
    JSONArray txs = data.optJSONArray("transactions"); if (txs == null) txs = new JSONArray();
    long balance = 0, income = 0, expense = 0;
    for (int i=0;i<accounts.length();i++) balance += accounts.optJSONObject(i).optLong("openingBalanceCents", 0);
    for (int i=0;i<txs.length();i++) { JSONObject t=txs.optJSONObject(i); if (t==null || "deleted".equals(t.optString("status"))) continue; long a=t.optLong("amountCents",0); if ("income".equals(t.optString("type"))) { income+=a; balance+=a; } else if ("expense".equals(t.optString("type"))) { expense+=a; balance-=a; } }
    JSONObject metrics = data.optJSONObject("atlasBridge");
    long free = metrics == null ? balance : metrics.optLong("freeMoneyCents", balance);
    long committed = metrics == null ? 0 : metrics.optLong("committedCents", 0);
    long reserved = metrics == null ? 0 : metrics.optLong("reservedCents", 0);
    long capacity = metrics == null ? 0 : metrics.optLong("monthlyCapacityCents", 0);
    return new JSONObject().put("balanceCents",balance).put("totalBalanceCents",balance)
      .put("freeMoneyCents",free).put("committedCents",committed).put("reservedCents",reserved)
      .put("monthlyCapacityCents",capacity).put("incomeCents",income).put("expenseCents",expense)
      .put("accountCount",accounts.length()).put("calculatedAt", metrics == null ? JSONObject.NULL : metrics.optString("calculatedAt"));
  }

  private JSONObject simulatePurchase(JSONObject data, JSONObject payload) throws Exception {
    String itemName = payload.optString("itemName", "Compra simulada").trim();
    int count = payload.optInt("installmentCount", 0);
    long installment = payload.optLong("installmentCents", 0);
    if (itemName.isEmpty() || count < 1 || count > 120 || installment <= 0) throw new IllegalArgumentException("Simulação inválida");
    JSONObject metrics = data.optJSONObject("atlasBridge");
    if (metrics == null) throw new IllegalStateException("Atualize o Cofrinho antes de simular uma compra");
    long free = metrics.optLong("freeMoneyCents", 0);
    long capacity = metrics.optLong("monthlyCapacityCents", 0);
    JSONArray baseForecasts = metrics.optJSONArray("forecasts");
    JSONArray forecasts = new JSONArray();
    long lowest = Long.MAX_VALUE;
    if (baseForecasts != null) for (int i = 0; i < baseForecasts.length(); i++) {
      JSONObject base = baseForecasts.optJSONObject(i); if (base == null) continue;
      int days = base.optInt("days", (i + 1) * 30);
      long projected = base.optLong("projectedBalanceCents", 0);
      long simulated = projected - installment * (long)Math.ceil(days / 30.0);
      lowest = Math.min(lowest, simulated);
      forecasts.put(new JSONObject().put("days", days).put("projectedBalanceCents", projected).put("simulatedBalanceCents", simulated));
    }
    if (lowest == Long.MAX_VALUE) lowest = free - installment;
    boolean immediate = free >= installment;
    boolean monthly = installment <= capacity;
    boolean projected = lowest >= 0;
    boolean approved = immediate && monthly && projected;
    String reason = !immediate ? "insufficient_free_money" : !monthly ? "insufficient_monthly_capacity" : !projected ? "negative_projected_balance" : "affordable";
    return new JSONObject().put("itemName", itemName).put("recommendation", approved ? "can_buy" : "do_not_buy")
      .put("reasonCode", reason).put("installmentCents", installment).put("installmentCount", count)
      .put("totalPurchaseCents", installment * count).put("freeMoneyCents", free)
      .put("monthlyCapacityCents", capacity).put("monthlyCapacityAfterCents", capacity - installment)
      .put("lowestProjectedBalanceCents", lowest).put("forecasts", forecasts).put("readOnly", true);
  }

  private Bundle propose(android.content.SharedPreferences p, Bundle e) throws Exception {
    JSONObject payload = new JSONObject(e.getString("payload", "{}"));
    JSONObject tx = payload.optJSONObject("transaction");
    if (tx == null || tx.optString("description").trim().isEmpty() || tx.optLong("amountCents",0) <= 0) return error("invalid_transaction", "Descrição e valor são obrigatórios");
    String type=tx.optString("type"); if (!"income".equals(type) && !"expense".equals(type)) return error("invalid_transaction", "Tipo não permitido");
    JSONArray inbox = new JSONArray(p.getString("inbox","[]"));
    String requestId=e.getString("requestId", UUID.randomUUID().toString());
    for(int i=0;i<inbox.length();i++) if(requestId.equals(inbox.optJSONObject(i).optString("requestId"))) return error("duplicate_request","Pedido duplicado");
    long createdAt = System.currentTimeMillis();
    tx.put("id", "atlas-" + requestId).put("status", "awaiting_confirmation").put("origin", "atlas")
      .put("categoryId", tx.optString("categoryId", "outros")).put("dedupeKey", "atlas:" + requestId)
      .put("createdAt", new java.util.Date(createdAt).toInstant().toString()).put("updatedAt", new java.util.Date(createdAt).toInstant().toString());
    JSONObject item=new JSONObject().put("requestId",requestId).put("action","propose.transaction").put("status","awaiting_confirmation").put("createdAt",createdAt).put("payload",new JSONObject().put("transaction", tx));
    inbox.put(item); p.edit().putString("inbox",inbox.toString()).apply();
    Bundle out=new Bundle(); out.putBoolean("ok",true); out.putBoolean("requiresConfirmation",true); out.putString("requestId",requestId);
    out.putString("result", new JSONObject().put("requestId", requestId).put("requiresConfirmation", true).put("status", "awaiting_confirmation").toString()); return out;
  }

  private boolean isAuthorizedCaller() {
    String caller = getCallingPackage();
    return ATLAS_PACKAGE.equals(caller);
  }

  private Bundle error(String code,String message){ Bundle b=new Bundle(); b.putBoolean("ok",false); b.putString("errorCode",code); b.putString("error",message); return b; }
  @Override public Cursor query(Uri u,String[] p,String s,String[] a,String so){return null;}
  @Override public String getType(Uri u){return null;}
  @Override public Uri insert(Uri u,ContentValues v){return null;}
  @Override public int delete(Uri u,String s,String[] a){return 0;}
  @Override public int update(Uri u,ContentValues v,String s,String[] a){return 0;}
}
