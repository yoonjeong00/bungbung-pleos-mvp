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
  num(0.0, DriveValues.rangeKm(0));
  num(49.5, DriveValues.rangeKm(49500));
  num(150.0, DriveValues.rangeKm(150000));
  num(1500.0, DriveValues.rangeKm(1500000));
  num(null, DriveValues.rangeKm(Float.NaN));
  num(null, DriveValues.rangeKm(Float.POSITIVE_INFINITY));
  num(null, DriveValues.rangeKm(-1));
  num(null, DriveValues.rangeKm(1500001));
  System.out.println("PASS AAOS gear/ignition map + range meters→km, valid zero, no synthetic default");
 }
 private static void num(Double expected, Double actual) {
  if (!Objects.equals(expected, actual)) throw new AssertionError("Expected " + expected + ", got " + actual);
 }
 private static void eq(String expected, String actual) {
  if (!Objects.equals(expected, actual)) throw new AssertionError("Expected " + expected + ", got " + actual);
 }
}
