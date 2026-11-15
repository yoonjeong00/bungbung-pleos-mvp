# Pleos SDK distance integration

## Scope
Vehicle SDK 2.3.2 is loaded from the official Pleos Maven repository. Manifest requests only CAR_DRIVE read permission (binding permission and service query are merged from SDK manifest). No vehicle setters are called.

Flow: Vehicle.initialize → getOdometer → checkCurrentDistanceDrivenCapabilities → READ/READ_WRITE → registerDistanceDriven + getCurrentDistanceDriven. A capability response proves service IPC responded; calling initialize alone does not report connection success. Unsupported, null, timeout and permission failures stay distinct. Distance is in km according to the SDK source. Listener events update the displayed SDK number; a 15-second read verifies availability without relying on change-only notifications. Read timeouts are 10 seconds; UI masks stale data after 45 seconds.

The SDK monitor is independent of mocked pet growth/gears/fuel. It never overwrites pet progress or saved mock data. It is deliberately labelled as SDK odometer, not distance travelled with Toto. Gear/CarUxRestrictions integration is still pending and no driving-use declaration is added. Emulator values are not physical vehicle evidence.

Subscription and Vehicle resources release in onStop and reconnect in onStart. Epoch checks ignore callbacks from stopped sessions. Initial read does not overwrite newer listener values. Native status is buffered until WebView loads and bootstrapped if the JS monitor mounts later.

## Mac verification
1. Pull feat/team1-demo-session; run `bash scripts/install-mac.sh` (retains chosen rendering mode).
2. The SDK panel should show service response, READ/READ_WRITE support and a numeric value. Do not count waiting/error/unsupported as success.
3. In the Pleos Virtual Console change the supported cumulative odometer input, not the app's mock scenario panel. Exact available controls depend on the installed emulator.
4. Verify the SDK number changes and `변경 알림` count increases. If only `현재 값 조회` updates, polling works but listener verification is incomplete.
5. Background/resume the app; verify reconnection and no duplicate callbacks. Test unavailable values/disconnection and verify no fake zero or stale live claim.
6. Logs: `$HOME/Library/Android/sdk/platform-tools/adb -s emulator-5554 logcat -d -s BungbungVehicle:I '*:S'`.

SDK AAR manifest declares minimum Vehicle Service version 2.3.13 / code 65. The user's AVD name (v2.1.0) does not establish the installed Vehicle Service version. If connection fails, inspect service version and logs before changing SDK versions.

## Evidence and limits
Official docs: https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/Vehicle/project-setup and vehicle-permission. Signatures, nullable Float values, km unit and listener methods were checked against the official Vehicle-2.3.2-sources.jar and compiled AAR. Web state tests cover live changes, null/invalid/error/stale suppression and source separation. Native compilation and APK/device verification are reported separately; no successful on-device connection is claimed by these tests.

Native Java compilation passed with Eclipse ECJ (Java 17 target), official Vehicle 2.3.2 classes, Kotlin stdlib, Android 14 API classes and AndroidX WebKit 1.12.1. This is not a Gradle APK build or a live service integration test. All 10 Node test scripts passed.
