package com.pablo.cofrinho;

import android.content.*;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import java.security.SecureRandom;
import java.util.UUID;
import org.json.*;

public class CofrinhoBridgeProvider extends ContentProvider {
  private static final long SESSION_MS = 30L * 24 * 60 * 60_000L;\n  private static final String ATLAS_PACKAGE = "com.pablo.atlaspocket";\n  private static final String PROTOCOL = "cofrinho-android-v1";
  @Override public boolean onCreate() { return true; }

  @Override public Bundle call(String method, String arg, Bundle extras) {
    Bundle out = new Bundle();
    try {
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
    p.edit().putLong("token_expires", System.currentTimeMillis() + SESSION_MS).apply();\n    String action = e.getString("action", "");
    JSONObject snapshot = new JSONObject(p.getString("snapshot", "{}"));
    JSONObject result = new JSONObject();
    if ("read.summary".equals(action)) result = summary(snapshot);
    else if ("read.accounts".equals(action)) result.put("accounts", snapshot.optJSONArray("accounts") == null ? new JSONArray() : snapshot.optJSONArray("accounts"));
    else if ("read.goals".equals(action)) result.put("goals", snapshot.optJSONArray("goals") == null ? new JSONArray() : snapshot.optJSONArray("goals"));
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
    return new JSONObject().put("balanceCents",balance).put("incomeCents",income).put("expenseCents",expense).put("accountCount",accounts.length());
  }

  private Bundle propose(android.content.SharedPreferences p, Bundle e) throws Exception {
    JSONObject payload = new JSONObject(e.getString("payload", "{}"));
    JSONObject tx = payload.optJSONObject("transaction");
    if (tx == null || tx.optString("description").trim().isEmpty() || tx.optLong("amountCents",0) <= 0) return error("invalid_transaction", "Descrição e valor são obrigatórios");
    String type=tx.optString("type"); if (!"income".equals(type) && !"expense".equals(type)) return error("invalid_transaction", "Tipo não permitido");
    JSONArray inbox = new JSONArray(p.getString("inbox","[]"));
    String requestId=e.getString("requestId", UUID.randomUUID().toString());
    for(int i=0;i<inbox.length();i++) if(requestId.equals(inbox.optJSONObject(i).optString("requestId"))) return error("duplicate_request","Pedido duplicado");
    JSONObject item=new JSONObject().put("requestId",requestId).put("action","propose.transaction").put("status","awaiting_confirmation").put("createdAt",System.currentTimeMillis()).put("payload",payload);
    inbox.put(item); p.edit().putString("inbox",inbox.toString()).apply();
    Bundle out=new Bundle(); out.putBoolean("ok",true); out.putBoolean("requiresConfirmation",true); out.putString("requestId",requestId); return out;
  }

  private boolean isAuthorizedCaller() {\n    String caller = getCallingPackage();\n    return ATLAS_PACKAGE.equals(caller);\n  }\n\n  private Bundle error(String code,String message){ Bundle b=new Bundle(); b.putBoolean("ok",false); b.putString("errorCode",code); b.putString("error",message); return b; }
  @Override public Cursor query(Uri u,String[] p,String s,String[] a,String so){return null;}
  @Override public String getType(Uri u){return null;}
  @Override public Uri insert(Uri u,ContentValues v){return null;}
  @Override public int delete(Uri u,String s,String[] a){return 0;}
  @Override public int update(Uri u,ContentValues v,String s,String[] a){return 0;}
}