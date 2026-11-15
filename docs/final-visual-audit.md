# 제출 전 화면·성능 점검 — 2026-11-15

## 판정
조건부: 코드상 잘림·접근성 및 이미지 구현 문제를 수정했으나 실제 Pleos 화면의 렌더링 중복 현상은 재검증이 필요하다. 제공된 사용자 스크린샷의 겹침이 CSS만의 원인이라고 단정하지 않는다.

## 확인한 문제와 수정

| 항목 | 확인 근거 | 조치 | 검증 범위 |
| --- | --- | --- | --- |
| 낮은 창/키보드 표시 시 하단 컨트롤 접근 불가 위험 | Android app-window 최소높이 420px인데 screen overflow:hidden이 마지막 규칙이었음. SDK 바까지 추가되면 viewport가 더 작아짐 | screen/app-window 스크롤 허용, 이벤트 내용 스크롤, 확인버튼 최소 44px | CSS 검토, 실기기 키보드 확인 남음 |
| 첫 만남 주변 UI가 이미지 뷰포트 밖으로 노출될 가능성 | onboarding.js가 전체 welcome-reference를 nested SVG/viewBox로 잘라 표시했음 | 같은 좌표를 독립 WebP 4개로 추출. flow 담당이 img 태그로 연결 | 추출 이미지 육안 확인, 파일/마크업 자동 검사 통과 |
| 방·회복 화면에서 캐릭터 잘림 | 기존 object-fit:cover는 다른 비율의 창에서 상하/좌우를 자름 | Android에서 contain으로 전체 장면 유지 | CSS 검토, 실제 분할창 비율 확인 남음 |
| 주행 소형 글자 | cqw 단독으로 좁은 창에서 10px 미만 가능 | 날씨·거리·온도 최소 글자크기 설정, 메시지 최소높이 | CSS 검토 |
| 새 출발 이미지 | 정적 WebP 약 88KB, 별도 텍스트/차량 값 | 기존 contain 및 별도 상태 영역 유지 | 파일 존재 확인 |
| 미리보기 안내 추가로 꾸미기 높이 증가 | flow 담당이 기본 시안 안내 추가 | 안내 줄간격/최소 글자크기 지정 | 실기기 확인 남음 |

## 실행한 검증
- `node tests/layout-model.mjs`: 통과. 저장 레이아웃 정규화/경계값 검사이며 렌더링 검사는 아님.
- `node tests/visual-assets.mjs`: 통과. 모든 HMI 이미지 파일 존재 및 이미지 속 주변 UI가 튀어나오는 전체 참조 SVG 방식이 제거됐는지 확인.
- `chromium --headless --no-sandbox --disable-gpu ...`: 실패. 환경에서 `socket() failed: Operation not permitted` (exit 134)로 브라우저 시작 전 중단. 앱 오류가 아니라 실행 환경 제약이며 실제 클릭·스크린샷 렌더링 검증을 대신하지 못함.
- 첫 만남 hero/growth 추출 파일을 직접 열어 캐릭터·아이콘과 텍스트 분리를 확인.

## 최종 APK에서 필요한 시각 확인
1. 첫 실행 화면 전체 → 이름 입력 키보드 → 시작/취소 버튼까지 접근 가능.
2. 내 방에서 성장 바/옷장/탭이 각 한 번만 표시되는지. 위·아래 잔상 여부.
3. 3개 탭을 왕복 후 회복·하루 마무리에서 확인 버튼 눌러 복귀.
4. SDK 바가 표시된 상태에서 주행 그림 귀·발과 거리·온도, 한 줄 메시지 확인.
5. 좁은 분할창/키보드 표시 상태에서 필요한 스크롤이 가능한지.
6. 하드웨어 렌더링/호환 렌더링 차이는 같은 화면·같은 입력으로 비교. 느린 에뮬레이터와 앱 자체 성능은 분리 측정.

## 변경 파일
- dist/hmi.css
- dist/hmi-assets/extracted/welcome-hero.webp
- dist/hmi-assets/extracted/welcome-growth.webp
- dist/hmi-assets/extracted/welcome-fuel.webp
- dist/hmi-assets/extracted/welcome-closet.webp
- tests/visual-assets.mjs
- dist/js/onboarding.js는 flow 담당 변경.

승인된 캐릭터나 색상, 기능을 새로 생성/변경하지 않았다. 추출은 기존 이미지의 정확한 영역 분리다.
