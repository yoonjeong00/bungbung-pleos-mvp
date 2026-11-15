# Android / 제출 최종 감사

기준: feat/team1-demo-session의 45c2f86 이후 제출 점검 변경본. 최종 커밋은 통합 후 결정됩니다.

## 판정
조건부 가능. 이 환경에서 최신 APK의 실제 빌드·설치·화면 조작은 검증하지 못했습니다. 기존 사용자 화면은 SDK READ 및 0 km 수신의 증거이지 실제 값 변경 검증은 아닙니다.

## 수정 사항
- P1: 15초 백업 읽기의 타임아웃이 그동안 listener로 받은 최신 정상 거리를 지우던 경쟁 조건을 수정. 읽기 시작 후 listener 알림이 있었다면 늦은 읽기 성공/실패/타임아웃이 덮어쓰지 않습니다.
- P1: 알림 수신 횟수와 실제 서로 다른 값 수신 횟수(`valueChanges`) 분리. 첫 0 수신은 변경 0회, 반복 0도 0회, 이후 1 수신은 1회. invalid 값은 변경 횟수에 포함하지 않습니다. 앱 구독 재시작 시 카운터 초기화.
- P1: 재빌드한 APK 식별 불가능 문제. installer가 git 커밋을 Gradle property로 전달하고 versionName 및 UI r5 진단 표시에 포함. 로컬 수정 시 dirty 표시.
- 중복 onPageFinished에서 진단 badge를 재사용하도록 변경.
- 이름 입력 시 키보드에 앱이 가려지지 않도록 Activity adjustResize 명시. 실제 Pleos 키보드 확인은 필요.
- installer 인자·JDK·adb 경로 사전 확인, Activity 시작 대기 추가.
- read-only `scripts/verify-submission-mac.sh` 추가. 앱 데이터, 로그 버퍼, 차량 속성을 삭제/변경하지 않음.
- README의 “SDK 연동 없음”, SVG viewport 재사용 등 오래된 설명을 현재 범위와 한계로 교체.

## 검증 결과
| 항목 | 결과 | 근거/한계 |
|---|---|---|
| Java 소스 컴파일 | 통과 | 실제 Vehicle 2.3.2, Kotlin stdlib, Android 14 API, WebKit 1.12.1 클래스에 ECJ Java17 컴파일 |
| shell syntax | 통과 | bash -n install-mac.sh verify-submission-mac.sh |
| Python syntax | 통과 | py_compile sync-android.py simulate-android.py |
| SDK lifecycle | 코드 확인 | onStart 시작, onStop 등록 해제·release, generation으로 늦은 callback 무시. 실제 서비스 연속 복귀 미검증 |
| SDK 변경 카운터 | 코드 확인 | 이전 유효 Float와 비교. native callback 실행 테스트는 별도 필요 |
| APK 전체 빌드 | 차단 | Gradle 8.9 다운로드: java.net.SocketException Network is unreachable |
| 실제 설치 버전 | 미검증 | 이 환경에 adb 및 사용자 Mac 연결 없음 |
| debug/release 구분 | 코드 확인 | SIMULATE와 rendering override는 BuildConfig.DEBUG만 허용. release APK는 생성하지 않음 |
| 자동차 권한/지원 | 부분 확인 | CAR_DRIVE 선언, SDK AAR 서비스 binding 사용. 실제 주행 허용/CarUxRestrictions 미구현 |
| 키보드·전원 복귀·반복 화면전환 | 미검증 | 실제 에뮬레이터 필요 |

## 최종 Mac 확인
1. 통합 변경을 pull하고 `bash scripts/install-mac.sh` 실행.
2. 출력의 installed versionName / git 커밋 / UI r5 커밋 일치 확인.
3. `bash scripts/verify-submission-mac.sh`로 상태와 로그 기록. 로그는 이전 실행 항목이 남아 있을 수 있으므로 시간 확인.
4. SDK에서 실제 누적 거리를 바꿔 숫자가 바뀌고 `값 변경` 카운터가 증가하는지 확인. 알림만 증가하는 것으로 통과 처리하지 않음.
5. 앱을 배경으로 보내고 복귀하여 수치 수신 재개·중복 UI 없음 확인.

최종 APK 예정 경로: `android/app/build/outputs/apk/debug/app-debug.apk`. 이번 환경에서 생성됐다고 주장할 수 없습니다. 제출 요구가 release/서명 APK인지 별도 확인 필요하며 debug 시연 Intent를 사용하는 촬영에는 debug APK가 필요합니다.
