# Android artwork and home layout fix

The reported screen showed duplicated wardrobe controls above the app header and underneath the wardrobe tile. Existing artwork used full reference screenshots inside SVG clip paths. Replace these DOM-dependent crops with independent WebP regions so neighbouring reference UI is not part of any rendered asset. Keep original reference files for provenance.

Home layout now constrains the content row with minmax(0,1fr); growth progress occupies its own row in the room card. Wardrobe illustration, description and action occupy distinct rows. Remove the Android home artwork mask and distance blur to reduce composition work. Narrow windows retain scrolling.

Validation: automated WebP dimensions, safe labels, app interactions and existing state tests. Android assets synchronized. Browser rendering unavailable in this environment (Chromium socket permission); actual APK render and performance still require emulator verification. This does not claim to resolve every emulator ColorBuffer failure.

## UI r3: opt-in renderer comparison
Repeated top/bottom controls still appeared in the supplied screenshot; its installed commit was not verified. Add a visible debug-only `UI r3` marker and opt-in `software_rendering` intent extra. On a fresh Activity launch the debug preference selects WebView LAYER_TYPE_SOFTWARE; release builds ignore it. Compatibility CSS removes animation/masks/filters/shadows. This is a diagnostic mitigation, not a confirmed GPU fix or speed improvement: software drawing can be slower. Toggle back with `--ez software_rendering false` after force-stop, or `bash scripts/install-mac.sh --default`. User data is retained.

`bash scripts/install-mac.sh --software` builds, installs and opens compatibility mode on Mac. Native build unavailable in this workspace; Java compilation and emulator outcome remain unverified.
