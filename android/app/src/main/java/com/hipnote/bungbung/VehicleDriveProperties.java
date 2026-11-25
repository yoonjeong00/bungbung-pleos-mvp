package com.hipnote.bungbung;

import android.app.Activity;
import android.car.Car;
import android.car.VehiclePropertyIds;
import android.car.hardware.CarPropertyConfig;
import android.car.hardware.CarPropertyValue;
import android.car.hardware.property.CarPropertyManager;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.Looper;
import android.util.Log;
import java.util.function.Consumer;
import org.json.JSONException;
import org.json.JSONObject;

/** Read-only properties on the AAOS car connection; never infers a value or enables a screen. */
final class VehicleDriveProperties {
 private static final String TAG = "BungbungDrive";
 private static final int GLOBAL = 0;
 private final Activity activity;
 private final Consumer<JSONObject> sink;
 private final Handler main = new Handler(Looper.getMainLooper());
 private final HandlerThread thread = new HandlerThread("bungbung-car-properties");
 private final Handler worker;
 private final Signal gear = new Signal("gear", VehiclePropertyIds.GEAR_SELECTION);
 private final Signal ignition = new Signal("ignition", VehiclePropertyIds.IGNITION_STATE);
 private final Signal[] signals = {gear, ignition};
 // Set only on the main thread. A stop/disconnect invalidates pending IO immediately.
 private volatile int generation;
 private CarPropertyManager manager;
 private Car car;
 private CarPropertyManager.CarPropertyEventCallback listener;
 private Runnable poll;

 VehicleDriveProperties(Activity activity, Consumer<JSONObject> sink) {
  this.activity = activity;
  this.sink = sink;
  thread.start();
  worker = new Handler(thread.getLooper());
 }

 /** A null service invalidates every property, with no guessed replacements. Main thread only. */
 void setService(Car ready, String status, String state, String message, String via) {
  int epoch = ++generation;
  for (Signal signal : signals) deliver(signal.item, null, status, state, message, via,
      false, false, "UNSUPPORTED".equals(status) || "NO_PERMISSION".equals(status) ? "NONE" : "UNKNOWN",
      0, 0, 0);
  worker.removeCallbacksAndMessages(null);
  worker.post(() -> {
   unbind();
   if (ready != null && epoch == generation) bind(ready, epoch);
  });
 }

 private void bind(Car ready, int epoch) {
  try {
   if (activity.checkSelfPermission(Car.PERMISSION_POWERTRAIN) != PackageManager.PERMISSION_GRANTED)
    throw new SecurityException("CAR_POWERTRAIN not granted");
   if (!ready.isConnected()) {
    rows(null, "ERROR", "error", "차량 속성 서비스 연결 끊김", "lifecycle", false, epoch);
    return;
   }
   Object service = ready.getCarManager(Car.PROPERTY_SERVICE);
   if (!(service instanceof CarPropertyManager)) {
    rows(null, "UNSUPPORTED", "unsupported", "차량 속성 읽기 미지원", "capability", true, epoch);
    return;
   }
   car = ready;
   manager = (CarPropertyManager) service;
   listener = new CarPropertyManager.CarPropertyEventCallback() {
    @Override public void onChangeEvent(CarPropertyValue value) {
     if (value != null) scheduleChange(epoch, value.getPropertyId(), value.getAreaId());
    }
    @Override public void onErrorEvent(int id, int area) {
     scheduleChange(epoch, id, area);
    }
   };
   poll = new Runnable() {
    @Override public void run() {
     if (epoch != generation) return;
     for (Signal signal : signals) refresh(signal, epoch, "heartbeat");
     if (epoch == generation) worker.postDelayed(this, VehicleUxBridge.HEARTBEAT_MS);
    }
   };
   for (Signal signal : signals) refresh(signal, epoch, "read");
   if (epoch == generation) worker.postDelayed(poll, VehicleUxBridge.HEARTBEAT_MS);
  } catch (RuntimeException e) {
   boolean denied = e instanceof SecurityException;
   rows(null, denied ? "NO_PERMISSION" : "ERROR", "error",
       denied ? "차량 속성 읽기 권한 없음" : "차량 속성 서비스 오류", "capability", false, epoch);
   Log.w(TAG, "Cannot open read-only car properties", e);
  }
 }

 private void scheduleChange(int epoch, int id, int area) {
  if (area != GLOBAL || epoch != generation) return;
  Signal signal = id == gear.id ? gear : id == ignition.id ? ignition : null;
  if (signal == null) return;
  // Both callback delivery and lifecycle changes are on main. Coalesce duplicate notifications.
  worker.removeCallbacksAndMessages(signal);
  worker.postAtTime(() -> {
   if (epoch != generation) return;
   ++signal.updates;
   refresh(signal, epoch, "listener");
  }, signal, android.os.SystemClock.uptimeMillis());
 }

 private void refresh(Signal signal, int epoch, String via) {
  if (epoch != generation || manager == null) return;
  try {
   if (!car.isConnected()) {
    send(signal, null, "ERROR", "error", "차량 속성 서비스 연결 끊김", via, false, epoch);
    return;
   }
   if (!signal.registered) {
    CarPropertyConfig<?> config = manager.getCarPropertyConfig(signal.id);
    if (config == null) {
     signal.supported = false;
     send(signal, null, "UNSUPPORTED", "unsupported", "차량 속성 미지원", "capability", true, epoch);
     return;
    }
    signal.supported = true;
    signal.cleanup = true;
    signal.registered = manager.registerCallback(listener, signal.id, CarPropertyManager.SENSOR_RATE_ONCHANGE);
    if (!signal.registered) {
     send(signal, null, "ERROR", "error", "차량 속성 구독 실패", "capability", true, epoch);
     return;
    }
   }
   CarPropertyValue<Integer> property = manager.getProperty(Integer.class, signal.id, GLOBAL);
   String value = null;
   if (property != null && property.getPropertyId() == signal.id && property.getAreaId() == GLOBAL
       && property.getStatus() == CarPropertyValue.STATUS_AVAILABLE && property.getValue() != null) {
    value = signal == gear ? DriveValues.gear(property.getValue()) : DriveValues.ignition(property.getValue());
   }
   boolean connected = car.isConnected();
   if (value == null || !connected) {
    send(signal, null, "ERROR", "unavailable", "차량 속성 값 미수신 또는 미확인", via, connected, epoch);
    return;
   }
   if (signal.previous != null && !signal.previous.equals(value)) ++signal.changes;
   signal.previous = value;
   send(signal, value, "OK", "live", "차량 속성 값 수신", via, true, epoch);
  } catch (RuntimeException e) {
   boolean denied = e instanceof SecurityException;
   send(signal, null, denied ? "NO_PERMISSION" : "ERROR", "error",
       denied ? "차량 속성 읽기 권한 없음" : "차량 속성 조회 실패", via, car.isConnected(), epoch);
   Log.w(TAG, "Read failed for " + signal.item, e);
  }
 }

 private void rows(String value, String status, String state, String message, String via,
                  boolean connected, int epoch) {
  for (Signal signal : signals) send(signal, value, status, state, message, via, connected, epoch);
 }

 private void send(Signal signal, String value, String status, String state, String message,
                   String via, boolean connected, int epoch) {
  long sampledAt = value == null ? 0 : System.currentTimeMillis();
  int updates = signal.updates, changes = signal.changes;
  boolean denied = "NO_PERMISSION".equals(status), supported = signal.supported && !denied;
  String access = supported ? "READ" : denied || "UNSUPPORTED".equals(status) ? "NONE" : "UNKNOWN";
  main.post(() -> {
   if (epoch == generation)
    deliver(signal.item, value, status, state, message, via, connected, supported, access,
        sampledAt, updates, changes);
  });
 }

 private void deliver(String item, String value, String status, String state, String message,
                      String via, boolean connected, boolean supported, String access,
                      long sampledAt, int updates, int changes) {
  try {
   sink.accept(new JSONObject().put("source", "aaos-car").put("item", item).put("status", status)
       .put(item, value == null ? JSONObject.NULL : value)
       .put("state", state).put("message", message).put("via", via)
       .put("connected", connected).put("supported", supported).put("access", access)
       .put("receivedAt", sampledAt).put("updates", updates).put("valueChanges", changes));
  } catch (JSONException e) { Log.e(TAG, "Property packet encoding", e); }
 }

 private void unbind() {
  if (poll != null) worker.removeCallbacks(poll);
  poll = null;
  for (Signal signal : signals) {
   if (manager != null && listener != null && signal.cleanup) {
    try { manager.unregisterCallback(listener, signal.id); }
    catch (RuntimeException e) { Log.w(TAG, "Unsubscribe " + signal.item, e); }
   }
   signal.registered = signal.supported = signal.cleanup = false;
   signal.previous = null;
   signal.updates = signal.changes = 0;
  }
  listener = null;
  manager = null;
  car = null;
 }

 void close() {
  ++generation;
  worker.removeCallbacksAndMessages(null);
  worker.post(() -> { unbind(); thread.quitSafely(); });
 }

 private static final class Signal {
  final String item;
  final int id;
  boolean supported, registered, cleanup;
  String previous;
  int updates, changes;
  Signal(String item, int id) { this.item = item; this.id = id; }
 }
}
