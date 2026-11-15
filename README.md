# 붕붕이 · Pleos 차량 동행 MVP

토토와 첫 만남 → 주차 중 방·꾸미기 → 모의 출발·연료 부족·회복·성장 → 하루 마무리를 시연하는 Android WebView 앱입니다. 웹 진입점은 `dist/index.html`, 앱 로직은 `dist/js/hmi-app.js`입니다.

## 실제 연동과 시연 범위

| 항목 | 현재 범위 |
|---|---|
| Pleos Vehicle SDK | `Vehicle:2.3.2`의 누적 거리 읽기 지원 조회·1회 읽기·변경 listener 연결 |
| 실제 SDK 수신 증거 | 사용자 에뮬레이터 화면에서 READ 지원, 0 km, 반복 알림 확인. 실제 값 변경→숫자 변경은 별도 기기 검증 필요 |
| SDK 표시 | 별도 누적 거리 패널. 알림 횟수와 서로 다른 값 수신 횟수를 구분. 미지원·실패·미수신을 0으로 표시하지 않음 |
| 토토 성장·기어·연료·기온·주행 시간 | 모의 데이터. SDK 누적 거리를 성장 저장값에 자동 합산하지 않음 |
| 주행 제한 | 모의 제한 신호·기어 기준 UI 제한. 실제 CarUxRestrictions 미연동, 실제 주행 중 사용 승인 검증 전 |
| 지도·주유소·경유지 | 시연 표현. 실제 내비게이션/NaviHelper 연결 없음 |
| 그림·소품 | 정적 2D 이미지. 방의 토토·옷은 이미지에 포함되므로 실제 소품 선택과 그림이 완전히 일치하지 않음 |

실제 SDK가 연결됐다고 앱 전체가 실차 연동된 것으로 설명하지 마세요. 캐릭터 동작·실차 제어·모든 성장 단계 연출이 완성된 제품은 아닙니다.

## Mac에서 APK 빌드·설치

JDK 17 이상, Android SDK 35 및 에뮬레이터가 필요합니다. 설치 스크립트는 기본적으로 Android Studio의 JDK와 `~/Library/Android/sdk`를 사용합니다. `JAVA_HOME`, `ANDROID_HOME`, `ANDROID_SERIAL`로 변경할 수 있습니다.

```bash
cd "$HOME/StudioProjects/bungbung-pleos-mvp"
git switch feat/team1-demo-session
git pull --ff-only origin feat/team1-demo-session
bash scripts/install-mac.sh
```

- 생성 경로: `android/app/build/outputs/apk/debug/app-debug.apk`
- 종류: debug APK. ADB 시연 Intent는 debug 빌드에서만 허용됩니다.
- 버전: `0.1.0-demo.<commit>`, 앱 진단 표시에 `UI r5 · <commit>` 표시.
- 수정된 로컬 파일이 있으면 `-dirty`가 붙습니다.
- `install -r`로 기존 앱을 갱신하며 앱 데이터를 초기화하지 않습니다.
- UI가 깨질 때만 `bash scripts/install-mac.sh --software`를 비교 진단에 사용합니다. 소프트웨어 렌더링은 더 느릴 수 있습니다. 복귀는 `--default`입니다.
- ADB 설치·Activity 시작 성공은 화면/버튼/SDK 동작의 검증 결과가 아닙니다.

설치 상태·커밋·로컬 APK 체크섬·최근 로그를 읽기 전용으로 확인합니다.

```bash
bash scripts/verify-submission-mac.sh
```

이 작업 환경에서는 Gradle 배포 다운로드가 네트워크 오류로 실패해 최종 APK 생성·설치는 검증하지 못했습니다. 사용자 Mac에서 기존 버전 빌드·설치 성공 증거는 있지만, 최종 변경본은 다시 확인해야 합니다.

## 사용자 흐름과 시연

- 신규 사용자는 첫 만남에서 이름을 정하고 시작합니다.
- 주차 중 내 방, 성장 기록, 꾸미기 등을 조작합니다.
- S1–S10·수동 차량 입력은 별도의 모의 시연 세션입니다. `내 토토로 돌아가기`로 기존 상태를 복원합니다.
- 시나리오 단계 이동과 실제 사용자 버튼 조작은 별개입니다. 다음 시나리오를 보내는 것만으로 앞 화면의 버튼 동작이 검증되지 않습니다.
- 최종 SDK 수치 변화 검증은 에뮬레이터의 지원되는 차량 데이터 조작 기능으로 누적 거리를 바꾸고 SDK 패널 숫자 및 값 변경 횟수를 확인해야 합니다. 아래 시연 명령은 SDK 값을 변경하지 않습니다.

```bash
python3 scripts/simulate-android.py --tour
```

일반 웹 확인:

```bash
python3 -m http.server 8080 --directory dist
```

`http://localhost:8080`은 웹 모형, `http://localhost:8080/?android=1`은 앱 전용 레이아웃입니다. 웹에는 Android SDK 서비스가 없습니다.

## 검증·제출

`tests/*.mjs`는 Node 단위/연결 테스트입니다. 실제 렌더링, 키보드, 터치 지연, Pleos 서비스 호환성까지 보증하지 않습니다. 최종 감사 결과는 `docs/final-*-audit.md`를 참고하세요.

제출 전에 최소한 첫 만남 → 내 방 → 꾸미기 취소/적용 → 출발 → 연료 부족 → 회복 → 성장 → 주차 복귀 → 하루 마무리를 실제 에뮬레이터에서 확인하고, 실제 연동/모의/미구현 범위를 시연 설명과 일치시켜야 합니다.

그래픽은 새 생성 에셋과 `hmi-assets/extracted/*.webp`로 분리된 그림을 사용합니다. 숫자·이름·버튼은 HTML 요소입니다. 배경과 캐릭터가 합쳐진 일부 이미지는 여전히 독립 모션이나 실제 착용 표현을 제공하지 않습니다.
