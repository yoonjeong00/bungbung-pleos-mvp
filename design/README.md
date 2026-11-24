# design/ — 디자인 원본·보관 그림

화면(`dist/`)에서 쓰지 않는 그림을 보관하는 곳이다. `dist/` 밖이라 Android 앱에 들어가지 않는다.

## source/ — 지금 화면 그림을 잘라낸 원본

- `reference-growth.png` — 성장 기록 시안. 성장 단계 그림(stage1~4)과 자동차 그림을 잘라냈다.
- `reference-badges.png` — 배지 도감 시안. 배지 그림 6장을 잘라냈다.
- `reference-driving.png` — 주행 화면 시안. 빗길 토토와 지도 그림을 잘라냈다.
- `reference-home.png` — 내 방 시안. 지금은 잘라 쓰는 그림이 없다.
- `reference-recovery.png` — 주유 회복 시안. 회복 장면과 밥그릇 그림을 잘라냈다.
- `reference-summary.png` — 하루 마무리 시안. 마무리 장면 그림을 잘라냈다.
- `reference-wardrobe.png` — 꾸미기(옷장) 시안. 옷장·소품 6개·로고 그림을 잘라냈다.
- `welcome-reference.webp` — 첫 만남 화면 시안. `welcome-hero/growth/fuel/closet.webp` 4장을 잘라냈다.

잘라낸 위치(좌표)는 `dist/js/hmi-art.js`의 `crops`와 `dist/js/onboarding.js`의 `regions`에 있다.

## archive/ — 예전 화면에서 쓰던 그림 (지금은 안 씀)

- `music-room.png` — 옛 "픽셀 음악방" 화면의 방 배경.
- `toto-poses.png` — 옛 화면의 토토 자세 모음(한 장에 여러 자세).
- `toto-growth.png` — 옛 화면의 토토 성장 단계 모음(한 장에 여러 단계).
- `navigation-city.png` — 옛 내비 배경 그림. 어느 화면에서도 쓰지 않았다.
- `onboarding-hero.webp` — 옛 첫 만남 화면의 토토 그림. 지금은 `extracted/welcome-hero.webp`를 쓴다.
