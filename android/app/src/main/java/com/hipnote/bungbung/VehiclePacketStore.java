package com.hipnote.bungbung;

import java.util.LinkedHashMap;
import java.util.Map;
import org.json.JSONObject;

/** Main-thread store. One latest packet per item, never one per source. */
final class VehiclePacketStore {
 private static final String ODO = "odometerKm";
 private final Map<String, JSONObject> latest = new LinkedHashMap<>();

 // A missing item is reserved for the original Pleos ODO packet.
 String remember(JSONObject packet) {
  String item = packet.optString("item", "");
  if (!packet.has("item") && "pleos-sdk".equals(packet.optString("source"))
      && packet.has(ODO)) item = ODO;
  if (!item.matches("[a-z][A-Za-z0-9]{0,63}") || !packet.has(item)) return null;
  latest.put(item, packet);
  return item;
 }

 // Called once on page ready (all items) or on each update (one changed item).
 String javascript(String changedItem, String pageUrl) {
  if (latest.isEmpty()) return null;
  JSONObject odo = latest.get(ODO);
  return "(function(){if(location.href!==" + JSONObject.quote(pageUrl) + ")return;"
    + "const items=JSON.parse(" + JSONObject.quote(new JSONObject(latest).toString()) + ");"
    + "window.__bungbungVehicleItems=items;"
    + "window.__bungbungVehicle=" + (odo != null ? "items.odometerKm" : "null") + ";"
    + "const keys=" + (changedItem == null ? "Object.keys(items)" : "[" + JSONObject.quote(changedItem) + "]") + ";"
    + "for(const key of keys)window.dispatchEvent(new CustomEvent('bungbung-vehicle',{detail:items[key]}));"
    + "})();";
 }
}
