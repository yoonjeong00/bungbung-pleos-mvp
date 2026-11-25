package com.hipnote.bungbung;

import android.car.VehicleGear;
import android.car.VehicleIgnitionState;
import java.util.Objects;

public final class DriveValuesSmoke {
 public static void main(String[] args) {
  eq("P", DriveValues.gear(VehicleGear.GEAR_PARK));
  eq("R", DriveValues.gear(VehicleGear.GEAR_REVERSE));
  eq("N", DriveValues.gear(VehicleGear.GEAR_NEUTRAL));
  for (int raw : new int[]{VehicleGear.GEAR_DRIVE, VehicleGear.GEAR_FIRST, VehicleGear.GEAR_SECOND,
      VehicleGear.GEAR_THIRD, VehicleGear.GEAR_FOURTH, VehicleGear.GEAR_FIFTH, VehicleGear.GEAR_SIXTH,
      VehicleGear.GEAR_SEVENTH, VehicleGear.GEAR_EIGHTH, VehicleGear.GEAR_NINTH}) eq("D", DriveValues.gear(raw));
  eq(null, DriveValues.gear(VehicleGear.GEAR_UNKNOWN));
  eq(null, DriveValues.gear(Integer.MIN_VALUE));
  eq("OFF", DriveValues.ignition(VehicleIgnitionState.LOCK));
  eq("OFF", DriveValues.ignition(VehicleIgnitionState.OFF));
  eq("ACC", DriveValues.ignition(VehicleIgnitionState.ACC));
  eq("ON", DriveValues.ignition(VehicleIgnitionState.ON));
  eq("START", DriveValues.ignition(VehicleIgnitionState.START));
  eq(null, DriveValues.ignition(VehicleIgnitionState.UNDEFINED));
  eq(null, DriveValues.ignition(99));
  System.out.println("PASS AAOS gear/ignition map; unknown never becomes P/ON");
 }
 private static void eq(String expected, String actual) {
  if (!Objects.equals(expected, actual)) throw new AssertionError("Expected " + expected + ", got " + actual);
 }
}
