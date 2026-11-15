# Android artwork and home layout fix

The reported screen showed duplicated wardrobe controls above the app header and underneath the wardrobe tile. Existing artwork used full reference screenshots inside SVG clip paths. Replace these DOM-dependent crops with independent WebP regions so neighbouring reference UI is not part of any rendered asset. Keep original reference files for provenance.

Home layout now constrains the content row with minmax(0,1fr); growth progress occupies its own row in the room card. Wardrobe illustration, description and action occupy distinct rows. Remove the Android home artwork mask and distance blur to reduce composition work. Narrow windows retain scrolling.

Validation: automated WebP dimensions, safe labels, app interactions and existing state tests. Android assets synchronized. Browser rendering unavailable in this environment (Chromium socket permission); actual APK render and performance still require emulator verification. This does not claim to resolve every emulator ColorBuffer failure.
