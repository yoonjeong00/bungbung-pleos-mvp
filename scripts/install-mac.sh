#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
adb_tool="$ANDROID_HOME/platform-tools/adb"
serial="${ANDROID_SERIAL:-emulator-5554}"
"$adb_tool" -s "$serial" get-state
python3 scripts/sync-android.py
(cd android && bash ./gradlew :app:assembleDebug --no-daemon --max-workers=2)
"$adb_tool" -s "$serial" install -r android/app/build/outputs/apk/debug/app-debug.apk
"$adb_tool" -s "$serial" shell am force-stop com.hipnote.bungbung
case "${1:-}" in
 --software) "$adb_tool" -s "$serial" shell am start -n com.hipnote.bungbung/.MainActivity --ez software_rendering true ;;
 --default) "$adb_tool" -s "$serial" shell am start -n com.hipnote.bungbung/.MainActivity --ez software_rendering false ;;
 *) "$adb_tool" -s "$serial" shell am start -n com.hipnote.bungbung/.MainActivity ;;
esac
