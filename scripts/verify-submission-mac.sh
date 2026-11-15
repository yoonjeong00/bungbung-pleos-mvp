#!/usr/bin/env bash
# Read-only evidence; never clears app state, logs or vehicle values.
set -euo pipefail
cd "$(dirname "$0")/.."
adb_tool="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
serial="${ANDROID_SERIAL:-emulator-5554}"
[[ -x "$adb_tool" ]] || { echo "adb not found: $adb_tool" >&2; exit 1; }
echo '=== Source revision and local modifications ==='
git log -1 --format='%h %s' || true
git status --short || true
echo '=== APK checksum (local file, not proof of installed bytes) ==='
apk='android/app/build/outputs/apk/debug/app-debug.apk'
if [[ -f "$apk" ]]; then shasum -a 256 "$apk"; else echo 'No local APK'; fi
echo '=== Device state and boot completion ==='
"$adb_tool" -s "$serial" get-state
"$adb_tool" -s "$serial" shell getprop sys.boot_completed
echo '=== Installed app version ==='
"$adb_tool" -s "$serial" shell dumpsys package com.hipnote.bungbung | grep -E 'versionCode=|versionName=|lastUpdateTime=' || true
echo '=== Foreground activity ==='
"$adb_tool" -s "$serial" shell dumpsys activity activities | grep -E 'mResumedActivity|topResumedActivity' || true
echo '=== Recent diagnostics (historical entries may remain) ==='
"$adb_tool" -s "$serial" logcat -d -t 250 -s BungbungVehicle:I BungbungRender:I BungbungSim:W AndroidRuntime:E '*:S'
echo 'Compare installed versionName revision with git revision and UI r5 badge.'
echo 'A distance number and notification count do not prove a changed value. Verify a real odometer change separately.'
