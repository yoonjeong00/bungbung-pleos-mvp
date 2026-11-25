package com.hipnote.bungbung;

import android.car.VehicleGear;
import android.car.VehicleIgnitionState;

/** Convert only known, documented AAOS values. Unknown data stays unknown. */
final class DriveValues {
 private DriveValues() {}
 // AAOS reports meters; the web contract accepts finite km in the inclusive 0..1500 range.
 static Double rangeKm(float meters) {
  return Float.isFinite(meters) && meters >= 0 && meters <= 1500000f ? meters / 1000.0 : null;
 }
 static String gear(int raw) {
  return switch (raw) {
   case VehicleGear.GEAR_PARK -> "P";
   case VehicleGear.GEAR_REVERSE -> "R";
   case VehicleGear.GEAR_NEUTRAL -> "N";
   case VehicleGear.GEAR_DRIVE, VehicleGear.GEAR_FIRST, VehicleGear.GEAR_SECOND,
       VehicleGear.GEAR_THIRD, VehicleGear.GEAR_FOURTH, VehicleGear.GEAR_FIFTH,
       VehicleGear.GEAR_SIXTH, VehicleGear.GEAR_SEVENTH, VehicleGear.GEAR_EIGHTH,
       VehicleGear.GEAR_NINTH -> "D";
   default -> null;
  };
 }
 static String ignition(int raw) {
  return switch (raw) {
   case VehicleIgnitionState.LOCK, VehicleIgnitionState.OFF -> "OFF";
   case VehicleIgnitionState.ACC -> "ACC";
   case VehicleIgnitionState.ON -> "ON";
   case VehicleIgnitionState.START -> "START";
   default -> null;
  };
 }
}
