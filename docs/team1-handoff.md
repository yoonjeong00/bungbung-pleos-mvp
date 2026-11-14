# 팀원 1 인수인계 · 가상 차량 / 시나리오 / 주차 연출

2026-11-14. 이번 변경은 동작 기반 작업이며, 승인된 화이트 3D 시안은 아직 적용하지 않았다. 기존 픽셀 그래픽은 임시 소스로 사용한다.

## 파일 소유권
- 팀원 1: dist/js/vehicle.js, dist/js/presentation.js, tests/team1.mjs
- 팀원 2: dist/js/logic.js, dist/js/state-machine.js — 성장·회복 판단, 배지, 저장
- 팀원 3: dist/js/character.js, room-ui.js, CSS, 이미지
- app.js: 통합 연결부. 병합 담당과 변경 위치 공유 필요.

## 가상 데이터 계약
VehicleProvider.value는 복사본이다. subscribe(listener)는 구독 해제 함수를 반환한다. set(patch)는 항목별 갱신이며 isMock은 항상 true다.
- gear: P/R/N/D 또는 null
- uxRestricted: true/false/null
- ignition: OFF/ACC/ON/START 또는 null
- odometerKm: 0–999999 km
- tripDistanceKm: 0–2000 km
- tripTimeMin: 0–1440 분
- rangeRemainingKm: 0–1500 km
- outsideTempC: -40–60 °C
- dataStatus: 각 항목별 OK/LOADING/NO_PERMISSION/UNSUPPORTED/ERROR
- receivedAt: 항목별 수신 시각(ms), sequence: 변경 순번
잘못된 값은 null+ERROR로 전달. 0과 null을 구분한다. null 기본 상태는 LOADING이며 명시적 dataStatus를 우선한다. 유효한 새 값이 오면 해당 항목 상태는 OK로 회복한다. 데모 baseline의 빈 상태 맵은 기존 모의 데이터 호환용이며 실차 허가를 뜻하지 않는다.

## 시나리오
자동/다음 단계는 S1에서 초기화한 뒤 동일 캐릭터 상태를 유지하며 S1–S5를 진행한다. 회복·성장 보상은 팀원 2 규칙이 판정한다. 일시정지 후 이어 재생은 다음 단계부터 진행한다. 자동재생 다시 누르기는 S1부터 재시작한다. 마지막 단계 후 다시 시작하려면 자동재생을 누른다.
개별 S1–S10 버튼은 독립 fixture이며 데모 저장 상태를 초기화한다. 특히 독립 S4/S5는 결과를 직접 보여주는 fixture이고, 실차 감지 증명이 아니다.
수동 패널: 기어/누적 거리/제한 상태/주행 가능 거리/외기온. 누적 거리를 10300으로 변경하면 부화 기준 10000 대비 첫 성장 조건을 확인할 수 있다.

## 연출 연결 계약
PresentationController는 차량 판단이나 보상을 계산하지 않는다.
- setParked(boolean): 통합부의 검증된 parked만 전달
- start(type,{duration,payload}): 주차가 아니면 false
- onChange(active|null): 표시할 포즈 변경
- onComplete(event): 정상 완료 시에만 호출
- stop()/dispose(): 타이머 및 오래된 콜백 무효화
주행/미수신/오류 시 즉시 취소하며 취소된 연출은 onComplete를 호출하지 않는다. 보류 이벤트 저장은 팀원 2 대기열 책임이다.
표준 이벤트 대응: REFUEL_RECOVERED→recovery, GROWTH_READY→growth, DAILY_SUMMARY→summary, BIRTH_READY→birth. 대응표는 외부 팀 연동용이며 현재 앱 내부 대기열은 소문자 명칭을 사용한다.
현재 controller 연결: 터치 joy, 걷기 walking, 메모 후 summary. 회복/성장은 기존 이벤트 카드와 CSS 연출을 사용한다. 완성된 3D 모션 클립은 아직 없다.

## 그래픽 교체
character.js의 pet() 출력 경계를 유지하면 이미지 교체 가능. 그래픽 담당자는 투명 PNG, 공통 캔버스, 발바닥 중앙 기준점, 두 귀 포함 여백을 전달해야 한다. 기존 sprite sheet 좌표는 새 개별 PNG에 그대로 재사용하지 않는다.

## 검증
node tests/team1.mjs
node tests/logic.mjs
node tests/state-regressions.mjs
node tests/layout-model.mjs
브라우저에서 다음 단계 S1→S5와 S8 화면 제한을 확인했다. 자동 타이머 pause/resume/cancel은 결정적 타이머 테스트로 검증했다. 실제 Android/실차 SDK 검증은 미완료다.

## Android 실행
python scripts/sync-android.py
Android Studio에서 android 폴더 열기 → JDK17 / SDK35 / Gradle8.9 환경 → 프로젝트 동기화 → 준비된 AVD 선택 → Run.
이 프로젝트는 WebView 데모이며 Pleos SDK 연동 앱이나 주행 승인 완료 앱이 아니다. 현재 작업 환경에는 Android SDK/adb/emulator가 없어 APK 빌드와 에뮬레이터 실행은 수행하지 못했다.
