package com.hipnote.bungbung;

import android.app.Activity;
import android.car.Car;
import android.car.drivingstate.CarUxRestrictions;
import android.car.drivingstate.CarUxRestrictionsManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import java.util.function.Consumer;
import org.json.JSONException;
import org.json.JSONObject;

/** Read-only UX restriction telemetry for this Activity's display. Does not enable any UI. */
final class VehicleUxBridge {
 private static final String TAG = "BungbungUx";
 static final long HEARTBEAT_MS = 5000;
 private final Activity activity;
 private final Consumer<JSONObject> sink;
 private final Handler main = new Handler(Looper.getMainLooper());
 private final VehicleDriveProperties drive;
 private Car car;
 private CarUxRestrictionsManager manager;
 private boolean active, subscribed, driveTimedOut;
 private int generation, subscription, updates, changes;
 private long connectingAt;
 private Boolean previous;

 VehicleUxBridge(Activity activity, Consumer<JSONObject> sink) {
  this.activity = activity;
  this.sink = sink;
  this.drive = new VehicleDriveProperties(activity, sink);
 }

 void start() {
  if (active) return;
  active = true;
  driveTimedOut = false;
  final int epoch = ++generation;
  updates = changes = 0;
  previous = null;
  connectingAt = android.os.SystemClock.elapsedRealtime();
  emit(null, "LOADING", "connecting", "차량 서비스 연결 대기", "lifecycle", false);
  drive.setService(null, "LOADING", "connecting", "차량 서비스 연결 대기", "lifecycle");
  try {
   // This may call serviceChanged synchronously. That callback uses its own Car argument.
   car = Car.createCar(activity, main, Car.CAR_WAIT_TIMEOUT_DO_NOT_WAIT,
       (service, ready) -> { if (active && epoch == generation) serviceChanged(service, ready); });
   if (car == null) {
    emit(null, "UNSUPPORTED", "unsupported", "차량 서비스 미지원", "capability", false);
    drive.setService(null, "UNSUPPORTED", "unsupported", "차량 서비스 미지원", "capability");
    return;
   }
   main.postDelayed(new Runnable() {
    @Override public void run() {
     if (!active || epoch != generation) return;
     if (manager != null) {
      // Re-read from AAOS. Never turn a cached value into a fresh observation.
      read(manager, "heartbeat");
     } else if (car != null && !car.isConnected()
         && android.os.SystemClock.elapsedRealtime() - connectingAt >= 10000L) {
      emit(null, "ERROR", "error", "차량 서비스 미연결", "timeout", false);
      if (!driveTimedOut) {
       driveTimedOut = true;
       drive.setService(null, "ERROR", "error", "차량 서비스 미연결", "timeout");
      }
     }
     main.postDelayed(this, HEARTBEAT_MS);
    }
   }, HEARTBEAT_MS);
  } catch (RuntimeException e) {
   failure(e, "capability", false);
   drive.setService(null, e instanceof SecurityException ? "NO_PERMISSION" : "ERROR",
       "error", "차량 서비스 초기화 실패", "capability");
  } catch (LinkageError e) {
   Log.w(TAG, "AAOS API is not available", e);
   emit(null, "UNSUPPORTED", "unsupported", "주행 제한 API 미지원", "capability", false);
   drive.setService(null, "UNSUPPORTED", "unsupported", "AAOS API 미지원", "capability");
  }
 }

 private void serviceChanged(Car service, boolean ready) {
  releaseManager();
  previous = null;
  car = service;
  driveTimedOut = false;
  drive.setService(ready ? service : null, "LOADING", "waiting",
      ready ? "차량 속성 조회 대기" : "차량 서비스 연결 끊김", "lifecycle");
  if (!ready) {
   connectingAt = android.os.SystemClock.elapsedRealtime();
   emit(null, "LOADING", "waiting", "차량 서비스 연결 끊김", "lifecycle", false);
   return;
  }
  try {
   Object candidate = service.getCarManager(Car.CAR_UX_RESTRICTION_SERVICE);
   if (!(candidate instanceof CarUxRestrictionsManager)) {
    emit(null, "UNSUPPORTED", "unsupported", "주행 제한 읽기 미지원", "capability", true);
    return;
   }
   CarUxRestrictionsManager bound = (CarUxRestrictionsManager) candidate;
   final int token = ++subscription;
   manager = bound;
   // AAOS may retain a local listener even if remote registration fails.
   subscribed = true;
   bound.registerListener(ignored -> {
    if (active && token == subscription && manager == bound) {
     ++updates;
     read(bound, "listener");
    }
   });
   read(bound, "read");
  } catch (RuntimeException e) {
   releaseManager();
   failure(e, "capability", true);
  }
 }

 private void read(CarUxRestrictionsManager bound, String via) {
  try {
   if (car == null || !car.isConnected()) {
    emit(null, "ERROR", "error", "차량 서비스 미연결", via, false);
    return;
   }
   CarUxRestrictions state = bound.getCurrentCarUxRestrictions();
   if (state == null || !car.isConnected()) {
    emit(null, "ERROR", "unavailable", "주행 제한 상태 미수신", via, false);
    return;
   }
   boolean restricted = state.isRequiresDistractionOptimization();
   if (previous != null && previous != restricted) ++changes;
   previous = restricted;
   emit(restricted, "OK", "live", "주행 제한 신호 수신", via, true);
  } catch (RuntimeException e) {
   failure(e, via, false);
  }
 }

 private void failure(RuntimeException e, String via, boolean serviceReady) {
  boolean denied = e instanceof SecurityException;
  Log.w(TAG, "Read-only UX status: " + via, e);
  emit(null, denied ? "NO_PERMISSION" : "ERROR", "error",
      denied ? "주행 제한 읽기 권한 없음" : "주행 제한 조회 실패", via, serviceReady);
 }

 private void emit(Boolean value, String status, String state, String message, String via,
                   boolean connected) {
  try {
   JSONObject packet = new JSONObject();
   packet.put("source", "aaos-car").put("item", "uxRestricted").put("status", status)
       .put("uxRestricted", value == null ? JSONObject.NULL : value)
       .put("state", state).put("message", message).put("via", via)
       .put("connected", connected).put("supported", manager != null)
       .put("access", manager != null ? "READ" : ("NO_PERMISSION".equals(status)
           || "UNSUPPORTED".equals(status) ? "NONE" : "UNKNOWN"))
       .put("receivedAt", value == null ? 0L : System.currentTimeMillis())
       .put("updates", updates).put("valueChanges", changes);
   sink.accept(packet);
  } catch (JSONException e) {
   Log.e(TAG, "Could not encode UX status", e);
  }
 }

 private void releaseManager() {
  ++subscription;
  if (manager != null && subscribed) {
   try { manager.unregisterListener(); } catch (RuntimeException e) { Log.w(TAG, "UX unsubscribe", e); }
  }
  subscribed = false;
  manager = null;
 }

 void stop() {
  if (!active) return;
  active = false;
  ++generation;
  drive.setService(null, "LOADING", "stopped", "앱 비활성 · 차량 속성 구독 해제", "lifecycle");
  main.removeCallbacksAndMessages(null);
  releaseManager();
  if (car != null) {
   try { car.disconnect(); } catch (RuntimeException e) { Log.w(TAG, "Car disconnect", e); }
  }
  car = null;
  previous = null;
  emit(null, "LOADING", "stopped", "앱 비활성 · 주행 제한 구독 해제", "lifecycle", false);
 }
 void close() { stop(); drive.close(); }
}
