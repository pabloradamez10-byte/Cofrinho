package com.pablo.cofrinho;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.security.SecureRandom;
import org.json.JSONArray;

@CapacitorPlugin(name = "CofrinhoBridge")
public class CofrinhoBridgePlugin extends Plugin {
  static final String PREFS = "cofrinho_bridge_v1";
  static SharedPreferences prefs(Context context) { return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

  @PluginMethod public void syncFinancialData(PluginCall call) {
    String data = call.getString("data");
    if (data == null) { call.reject("Dados ausentes"); return; }
    prefs(getContext()).edit().putString("snapshot", data).apply();
    call.resolve();
  }

  @PluginMethod public void createPairing(PluginCall call) {
    String code = String.format("%06d", new SecureRandom().nextInt(1_000_000));
    long expiresAt = System.currentTimeMillis() + 10 * 60_000L;
    prefs(getContext()).edit().putString("pair_code", code).putLong("pair_expires", expiresAt).apply();
    JSObject result = new JSObject();
    result.put("protocol", "cofrinho-android-v1");
    result.put("code", code);
    result.put("expiresAt", expiresAt);
    call.resolve(result);
  }

  @PluginMethod public void getConnectionStatus(PluginCall call) {
    SharedPreferences p = prefs(getContext());
    long expiresAt = p.getLong("token_expires", 0L);
    boolean connected = !p.getString("token", "").isEmpty() && expiresAt > System.currentTimeMillis();
    if (!connected) p.edit().remove("token").remove("token_expires").apply();
    JSObject result = new JSObject();
    result.put("connected", connected);
    result.put("expiresAt", connected ? expiresAt : 0L);
    call.resolve(result);
  }

  @PluginMethod public void drainRequests(PluginCall call) {
    SharedPreferences p = prefs(getContext());
    String requests = p.getString("inbox", "[]");
    p.edit().putString("inbox", "[]").apply();
    JSObject result = new JSObject();
    result.put("requests", requests == null ? "[]" : requests);
    call.resolve(result);
  }
}