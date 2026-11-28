package com.hipnote.bungbung;

import org.json.JSONObject;

/** Supplies the exact production-generated scripts to the WebView JS smoke. */
public final class VehiclePacketStoreSmoke {
 private static final String PAGE = "https://appassets.androidplatform.net/assets/index.html?android=1";

 public static void main(String[] ignored) throws Exception {
  VehiclePacketStore store = new VehiclePacketStore();
  if (store.javascript(null, PAGE) != null) throw new AssertionError("empty replay");
  if (store.remember(new JSONObject("{\"source\":\"aaos-car\",\"gear\":\"P\"}")) != null)
   throw new AssertionError("untyped non-ODO data accepted");
  String odo = store.remember(new JSONObject("{\"source\":\"pleos-sdk\",\"state\":\"live\",\"supported\":true,\"connected\":true,\"odometerKm\":2.5,\"receivedAt\":1000}"));
  String ux = store.remember(new JSONObject("{\"source\":\"aaos-car\",\"item\":\"uxRestricted\",\"status\":\"OK\",\"uxRestricted\":true,\"receivedAt\":1001}"));
  store.remember(new JSONObject("{\"source\":\"aaos-car\",\"item\":\"uxRestricted\",\"status\":\"OK\",\"uxRestricted\":false,\"receivedAt\":1002}"));
  if (!"odometerKm".equals(odo) || !"uxRestricted".equals(ux)) throw new AssertionError("wrong keys");
  System.out.println(store.javascript(null, PAGE));
  store.remember(new JSONObject("{\"source\":\"aaos-car\",\"item\":\"uxRestricted\",\"status\":\"LOADING\",\"state\":\"stopped\",\"uxRestricted\":null,\"receivedAt\":0}"));
  System.out.println(store.javascript(ux, PAGE));
  System.out.println(store.javascript(null, PAGE));
 }
}
