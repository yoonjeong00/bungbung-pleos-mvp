# Artwork background correction — 2026-11-15

## Root cause
Screenshot crops had opaque lavender backgrounds and some neighboring UI remnants. CSS masks and multiply blending could not turn these into clean cutouts and also changed white fabric colors. Rain crop contained clipped black numerals; stage 3 and cap contained blue UI fragments.

## Applied
- 13 independent alpha WebP assets: rain, stages 1–4, logo, headphones, cap, scarf, flower, star, knit, bowl.
- Generated from each original reference, preserving intended character/outfit/prop. These are regenerated clean assets, not pixel-identical background removal.
- No CSS color multiplication or feather masks on cutouts. Maximum 768 px character / 320 px accessory images; total approximately 527 KB.
- Rain and other standalone driving characters use normal flex layout, with separate centered live-value chips. No absolute positioning that can overlap values.
- Recovery, summary, fitting and welcome keep their intentional scenery, using consistent rounded framing and full-image containment.
- Module/CSS cache revision r8; cutouts use a new directory to avoid stale image caches.

## Verified
- Composited all 13 exported WebP images on the application's pale lavender background and inspected their silhouettes, ears, feet, umbrella and accessory edges.
- All 13 retain alpha. 15 Node test files passed, including image existence and alpha WebP-header/budget checks.
- Chromium could not start in this environment: socket() Operation not permitted. Browser layout, actual clicks and Mac/Android rendering remain to be checked. These tests do not prove visual layout correctness.

## Remaining review
- Teammate hungry/hurt/worried PNG originals are present remotely but binary retrieval was unavailable here; their pixel edges/transparency have NOT been verified or replaced. Their container remains contained and rounded; this does not remove a baked-in background.
- Full room/fitting artwork still contains the depicted accessories. This update does not implement runtime outfit compositing.
- Badges and map remain screenshot-derived illustrations. They were not regenerated as standalone cutouts.
