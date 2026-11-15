#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
adb_tool="$ANDROID_HOME/platform-tools/adb"
serial="${ANDROID_SERIAL:-emulator-5554}"
case "${1:-}" in ""|--software|--default) ;; *) echo "Usage: bash scripts/install-mac.sh [--software|--default]" >&2; exit 2 ;; esac
[[ -x "$JAVA_HOME/bin/java" ]] || { echo "JDK not found: $JAVA_HOME" >&2; exit 1; }
[[ -x "$adb_tool" ]] || { echo "adb not found: $adb_tool" >&2; exit 1; }
revision="$(git rev-parse --short=12 HEAD 2>/dev/null || printf local)"
if [[ -n "$(git status --porcelain --untracked-files=normal 2>/dev/null)" ]]; then revision="${revision}-dirty"; fi
echo "Building revision: $revision"
"$adb_tool" -s "$serial" get-state
python3 scripts/sync-android.py
(cd android && bash ./gradlew :app:assembleDebug --no-daemon --max-workers=2 -PbuildRevision="$revision")
"$adb_tool" -s "$serial" install -r android/app/build/outputs/apk/debug/app-debug.apk
"$adb_tool" -s "$serial" shell am force-stop com.hipnote.bungbung
case "${1:-}" in
 --software) "$adb_tool" -s "$serial" shell am start -W -n com.hipnote.bungbung/.MainActivity --ez software_rendering true ;;
 --default) "$adb_tool" -s "$serial" shell am start -W -n com.hipnote.bungbung/.MainActivity --ez software_rendering false ;;
 *) "$adb_tool" -s "$serial" shell am start -W -n com.hipnote.bungbung/.MainActivity ;;
esac

echo "Installed debug APK: android/app/build/outputs/apk/debug/app-debug.apk"
echo "Screen verification is still required; launch success does not verify the UI."
bash scripts/verify-submission-mac.sh
