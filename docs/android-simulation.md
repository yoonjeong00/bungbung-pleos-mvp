# Android 터미널 시뮬레이션

이 기능은 디버그 APK에 ADB intent로 모의 값을 넣는다. Pleos Vehicle SDK/Virtual Console 값을 읽거나 차량 값을 변경하지 않는다. release 빌드에서는 intent 입력을 무시한다.

## 실행
최신 feat/team1-demo-session을 빌드·설치한 후 저장소 루트에서:

```bash
python3 scripts/simulate-android.py --tour
```
Enter를 누를 때마다 S1~S10을 차례로 전송한다. 각 화면은 다음 입력까지 유지된다. Ctrl+C는 진행을 중단한다. 앱이 열려 있으면 singleTop/onNewIntent로 전달하며, 처음 실행되면 WebView 로딩 완료 후 전달한다.

```bash
python3 scripts/simulate-android.py 1
python3 scripts/simulate-android.py --payload '{"gear":"D","ignition":"ON","uxRestricted":false}'
python3 scripts/simulate-android.py --payload '{"gear":"P","rangeRemainingKm":49}'
python3 scripts/simulate-android.py --payload '{"rangeRemainingKm":620}'
python3 scripts/simulate-android.py --payload '{"uxRestricted":null}'
```

payload에서 생략한 항목은 이전 모의 값을 유지한다. 초기화하려면 S1부터 시작한다. S1~S5는 연속 흐름으로 주유·성장을 이어간다. S6~S10은 독립 fixture다. 자동 재생의 다음 장면은 이전 이벤트 확인으로 처리된다. 실제 차량 이벤트에 이 정책을 적용하지 않는다.

## 판정
- 상단에 ADB 모의 데이터 표시
- S2/S7 주행 화면에서 방 조작 불가
- S3 배고픔, S4 회복, S5 성장
- S8 제한/미수신에서 상호작용 차단
- S9 주행 가능 거리 미지원 처리
- S10 하루 요약
- 시연 설정 > 내 토토로 돌아가기: 원래 저장 복원

Node HMI 연결 테스트에서 위 입력 흐름과 저장 격리를 실행했다. Android Java 컴파일·Intent 수신·실제 터치 지연은 Mac에서 빌드 및 실행 검증이 필요하다. 이 작업 환경은 사용자의 Mac/adb에 연결돼 있지 않다.
