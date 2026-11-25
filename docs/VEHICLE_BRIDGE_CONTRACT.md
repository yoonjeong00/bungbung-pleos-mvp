# 차량 값 연결 약속 (Android → 웹)

> 작성: 2026-11-25 · 기준 코드: main `778f01d`
> Android(Java)가 읽은 차량 값을 웹 화면(WebView)에 넘기는 **약속(계약)**을 적은 문서다. 서비스 기준은 [SERVICE_SPEC.md](SERVICE_SPEC.md)를 따른다.
> 1장은 **지금 있는 그대로**, 2장부터는 **앞으로의 제안**이다. 제안은 코드에 아직 없다.
>
> 역할(기준서 13.1): **Java 연결은 팀원1**, **웹 연결기·성장 계산·테스트는 윤서**.

---

## 1. 지금 방식 (ODO, 그대로 정리)

### 1.1 흐름

```
Pleos Vehicle SDK ──▶ VehicleDistanceBridge.java ──▶ MainActivity.java ──▶ 웹(WebView)
 Odometer             값·상태를 JSON 하나로 묶음      evaluateJavascript로 전달   sdk-distance.js가 받아 표시
```

| 단계 | 파일 | 하는 일 |
| --- | --- | --- |
| 읽기 | [`VehicleDistanceBridge.java`](../android/app/src/main/java/com/hipnote/bungbung/VehicleDistanceBridge.java) | `Vehicle.initialize` → `getOdometer` → 지원 여부 조회(`checkCurrentDistanceDrivenCapabilities`) → READ·READ_WRITE면 변경 알림 등록(`registerDistanceDriven`) + 현재 값 조회(`getCurrentDistanceDriven`). 15초마다 다시 조회. 쓰기(set)는 하지 않음 |
| 전달 | [`MainActivity.java`](../android/app/src/main/java/com/hipnote/bungbung/MainActivity.java) | 마지막 패킷 1개(`latestVehiclePacket`)를 기억해 두었다가, 페이지가 다 열린 뒤(`pageReady`) 웹에 보냄. 페이지가 늦게 열려도 마지막 패킷을 다시 보냄 |
| 받기 | [`sdk-distance.js`](../dist/js/sdk-distance.js) | `?android=1`일 때만 "차량 SDK · 누적 거리" 확인 칸을 만들고 값을 보여 줌. **토토 성장·기어·연료에는 쓰지 않음** |
| 수명 | `MainActivity.onStart` / `onStop` | 앱이 보이면 연결(`start`), 안 보이면 구독 해제(`stop`). 다시 연결할 때 예전 연결의 늦은 응답은 무시(`generation` 번호 비교) |

권한: `AndroidManifest.xml`의 `pleos.car.permission.CAR_DRIVE` 하나.

### 1.2 웹으로 보내는 방법

Java가 웹에서 아래 코드를 실행한다.

```js
window.__bungbungVehicle = { /* 패킷 */ };
window.dispatchEvent(new CustomEvent('bungbung-vehicle', { detail: window.__bungbungVehicle }));
```

- **`window.__bungbungVehicle`**: 마지막 패킷. 웹 코드가 신호보다 늦게 준비돼도 이 값을 먼저 읽으면 된다.
- **`bungbung-vehicle` 신호**: 새 패킷이 올 때마다 한 번씩 보낸다.
- 페이지 주소가 정확히 `https://appassets.androidplatform.net/assets/index.html?android=1`일 때만 보낸다(`onPageFinished`에서 비교).

### 1.3 패킷 모양 (지금)

```json
{
  "source": "pleos-sdk",
  "state": "live",
  "message": "누적 거리 수신 완료",
  "connected": true,
  "supported": true,
  "access": "READ",
  "odometerKm": 10180.5,
  "receivedAt": 1764032400000,
  "updates": 3,
  "valueChanges": 1,
  "via": "listener"
}
```

| 이름 | 형식 | 뜻 |
| --- | --- | --- |
| `source` | 글자 | 값을 읽은 곳. 지금은 항상 `pleos-sdk` |
| `state` | 글자 | 연결 상태: `connecting`(연결 중) · `waiting`(지원 확인, 값 기다림) · `live`(값 받음) · `unsupported`(읽기 미지원) · `unavailable`(값 없음·이상함) · `error`(실패·시간 초과) · `stopped`(앱이 안 보여 구독 해제) |
| `message` | 글자 | 사람이 읽는 설명 (확인 칸에 표시, 최대 240자로 잘라 씀) |
| `connected` | true/false | 차량 서비스가 응답했는지 |
| `supported` | true/false | 읽기를 지원하는지 (`access`가 READ 또는 READ_WRITE) |
| `access` | 글자 | SDK가 알려준 권한 종류: `UNKNOWN` · `NONE` · `READ` · `WRITE` · `READ_WRITE` |
| `odometerKm` | 숫자 또는 `null` | 누적 거리(km). 없거나 음수·무한대면 `null` (0으로 바꾸지 않음) |
| `receivedAt` | 숫자 | 값을 받은 시각. **1970-01-01부터 지난 밀리초**(Java `System.currentTimeMillis()`, JS `Date.now()`와 같은 형식). 아직 못 받았으면 `0` |
| `updates` | 정수 | 변경 알림을 받은 횟수 |
| `valueChanges` | 정수 | 숫자가 실제로 바뀐 횟수 (알림 횟수만으로는 값이 바뀌었다고 말할 수 없음) |
| `via` | 글자 | 이번 패킷의 계기: `capability`(지원 조회) · `listener`(변경 알림) · `read`(직접 조회) · `timeout` · `error` · `lifecycle`(시작·정지) |

웹(`sdk-distance.js`)은 아래를 **모두** 만족할 때만 숫자를 "받음"으로 표시한다. 하나라도 어긋나면 `—`로 숨기고 0으로 쓰지 않는다.
- `state === 'live'`, `connected === true`, `supported === true`
- `odometerKm`이 0 이상의 숫자
- `receivedAt`이 지금부터 45초 이내 (5초 넘게 미래면 무효)

### 1.4 시연용 신호 (따로 있음, 섞지 말 것)

디버그 빌드에서만 ADB로 `com.hipnote.bungbung.SIMULATE` 인텐트를 보내면 `bungbung-simulation` 신호가 간다(`scene` 1~10 또는 `payload` JSON 8KB 이하). 웹은 이를 **시연**으로 처리한다(`session.enter` → 저장 안 함). 이 신호는 진짜 차량 값이 아니며, 아래 2장의 `bungbung-vehicle`과 섞지 않는다.

---

## 2. 제안: 항목을 늘릴 때의 패킷 모양

### 2.1 원칙
- **신호 이름과 통로는 그대로**: `bungbung-vehicle` 신호, `evaluateJavascript`.
- **패킷 하나 = 항목 하나.** 1.3의 모양을 그대로 쓰고, 두 칸만 더한다.
  - `item`: 어떤 항목인지 (웹 내부 이름 그대로, 기준서 10.1)
  - `status`: 웹이 바로 쓰는 수신 상태 (아래 2.3)
- 값은 **항목 이름과 같은 칸**에 넣는다. 예: `"item":"gear"`이면 `"gear":"D"`.
- `item`이 없는 패킷은 옛 ODO 패킷으로 보고 `item:"odometerKm"`처럼 처리한다 (지금 코드와 호환).
- 새 항목은 이 표에 한 줄을 더하는 것으로 늘린다. 패킷 모양은 바꾸지 않는다.

### 2.2 예시

```json
{ "item": "uxRestricted", "uxRestricted": false, "status": "OK",
  "source": "aaos-car", "state": "live", "message": "주행 제한 신호 수신",
  "connected": true, "supported": true, "access": "READ",
  "receivedAt": 1764032400000, "updates": 12, "valueChanges": 2, "via": "listener" }
```

```json
{ "item": "gear", "gear": null, "status": "NO_PERMISSION",
  "source": "aaos-car", "state": "error", "message": "기어 읽기 권한 없음",
  "connected": true, "supported": false, "access": "NONE",
  "receivedAt": 0, "updates": 0, "valueChanges": 0, "via": "capability" }
```

### 2.3 수신 상태 `status`

웹의 `dataStatus`와 같은 다섯 값을 쓴다 ([`vehicle.js`](../dist/js/vehicle.js)가 이미 받는 값).

| `status` | 뜻 | Java에서 언제 | 값 칸 |
| --- | --- | --- | --- |
| `OK` | 믿을 수 있는 값 | `state:"live"` + 값이 범위 안 | 값 |
| `LOADING` | 아직 모름 | `connecting`, `waiting`, `stopped`, 첫 값 전 | `null` |
| `NO_PERMISSION` | 권한 없음 | 권한 거부, `VehicleException`의 `ERROR_SECURITY_PERMISSION`, `SecurityException` | `null` |
| `UNSUPPORTED` | 이 차·이 버전에서 못 읽음 | 지원 조회 결과 `NONE`·`WRITE`, 속성 없음 | `null` |
| `ERROR` | 실패·이상한 값 | 시간 초과, 범위 밖 값, 모르는 기어 값, 그 밖의 예외 | `null` |

규칙: `status`가 `OK`가 아니면 값 칸은 **반드시 `null`**. 웹은 `OK`가 아닌 값을 쓰지 않는다(0이나 "정상"으로 바꾸지 않고 숨김).

### 2.4 1차로 보낼 항목 (주행 제한·기어·시동)

| `item` | 값 | 읽는 곳 (Android) | Java에서 바꾸는 규칙 |
| --- | --- | --- | --- |
| `uxRestricted` | `true` / `false` | `CarUxRestrictionsManager`의 현재 제한 (`isRequiresDistractionOptimization()`) | 제한이 걸려 있으면 `true`. 모르면 `null` + `LOADING`/`ERROR` |
| `gear` | `"P"` · `"R"` · `"N"` · `"D"` | 차량 속성 `GEAR_SELECTION` (권한 `CAR_POWERTRAIN`) 또는 Pleos SDK (팀원1 확인) | PARK→`P`, REVERSE→`R`, NEUTRAL→`N`, DRIVE와 1~9단→`D`. 그 밖(UNKNOWN 등)은 `null` + `ERROR` |
| `ignition` | `"OFF"` · `"ACC"` · `"ON"` · `"START"` | 차량 속성 `IGNITION_STATE` (권한 `CAR_POWERTRAIN`) | LOCK·OFF→`OFF`, ACC→`ACC`, ON→`ON`, START→`START`. UNDEFINED는 `null` + `ERROR` |
| `odometerKm` | km 숫자 (0~999,999) | Pleos `Odometer` (지금 있음) | 지금 그대로 + `item`, `status` 칸 추가 |

`source` 값: Pleos SDK로 읽으면 `pleos-sdk`, Android 차량 속성·`CarUxRestrictionsManager`로 읽으면 `aaos-car`.

### 2.5 나중에 같은 모양으로 늘릴 항목

| `item` | 값 | 비고 |
| --- | --- | --- |
| `rangeRemainingKm` | km 숫자 (0~1,500) | 원본이 m면 Java에서 ÷1000 |
| `outsideTempC` | °C 숫자 (-40~60) | |
| `tripDistanceKm`, `tripTimeMin` | 숫자 | SDK가 안 주면 웹에서 시동 ON 때 ODO·시각으로 계산 (별도 결정) |
| `wiperState` | `"OFF"` · `"INT"` · `"LOW"` · `"HIGH"` | |
| `headlightOn` | `true` / `false` | |
| `tireWarning` | `true` / `false` | |
| `safetyWarnings` | `[{id, level:"red"\|"yellow", label}]` (최대 20개) | **일반 권한으로 막힘 → 당분간 시연 모드에서만** (13.1) |

### 2.6 Java에서 함께 바꿀 것 (팀원1)
1. **항목별 마지막 패킷 기억**: 지금은 패킷 1개(`latestVehiclePacket`)만 기억한다. 항목이 여러 개면 마지막 항목만 남는다. 항목 이름별로 마지막 패킷을 기억하고, 페이지가 열리면 **모두** 다시 보낸다.
2. **웹의 늦은 준비 대비**: `window.__bungbungVehicle`은 ODO 호환용으로 남기고, 항목별 묶음 `window.__bungbungVehicleItems = { gear: {...}, uxRestricted: {...}, ... }`도 함께 채운다.
3. **살아 있음 알림(heartbeat)**: 주행 제한·기어·시동은 값이 안 바뀌어도 **5초마다** 같은 값을 `via:"heartbeat"`로 다시 보낸다(웹은 15초 넘게 소식이 없으면 막음, 3.4).
4. **앱이 안 보일 때**: `stop` 때 항목마다 `status:"LOADING"`, 값 `null` 패킷을 한 번 보낸다.

---

## 3. 웹이 값을 받아 쓰는 규칙 (제안, 윤서)

### 3.1 실차 모드와 시연 모드

| | 실차 모드 | 시연 모드 |
| --- | --- | --- |
| 언제 | `?android=1`이고, 시연 중이 아닐 때 | 시연 패널(미리보기·시나리오·수동 입력), ADB 시연(`bungbung-simulation`), 녹화 모드(`?record=1`), `?android=1` 없는 브라우저 |
| 실제 값 | 화면·성장 계산에 사용 | **무시** (화면에 안 씀). 마지막 실제 값만 기억해 둠 |
| 저장 | `session.checkpoint`로 저장 | **저장 안 함** (지금 `DemoSession`과 같음) |
| 돌아올 때 | — | "내 토토로 돌아가기" 때 기억해 둔 실제 값을 다시 적용. 단 3.3·3.4의 유효 조건을 다시 검사 |

- 실제 값은 **저장 데이터에 넣지 않는다.** 저장하는 건 부화 때 ODO(`baseOdo`) 같은 최소 값뿐이다(기준서 6.4). 지금 `load`는 모의 스냅샷(`isMock:true`)만 받아들이므로, 이 규칙과 맞다.
- 시연 값(예: 2,180km, 청소년)이 진짜 토토에 덮어써지면 안 된다. 실차 모드에서도 저장은 반드시 `session.checkpoint`를 거친다.

### 3.2 항목마다 진짜·모의 표시
- 지금은 차 데이터 전체에 `isMock` 하나만 있고, `VehicleProvider.set`이 항상 `isMock:true`로 덮는다. 진짜 ODO와 모의 기어처럼 **섞이면 구분할 수 없다.**
- 제안: 항목별 출처 `origin: { gear: "real", odometerKm: "real", rangeRemainingKm: "mock", ... }`를 둔다.
  - `"real"`: `bungbung-vehicle`로 받은 값
  - `"mock"`: 기본값, 시연 패널, ADB 시연
- 화면 구석 "모의 데이터" 표시는 **화면에 쓰인 항목 중 하나라도 `mock`이면** 계속 보인다(기준서 2장 "모의 데이터", 3.2). 모든 항목이 `real`일 때만 표시를 바꾼다(문구는 별도 결정).
- `isMock`은 옛 저장 데이터 호환을 위해 남겨 둔다.

### 3.3 ODO: 연결이 살아 있으면 마지막 값을 유효로 봄
- 주차 중에는 ODO가 안 바뀌는 게 정상이다. 변경 알림이 안 와도 값이 오래됐다고 버리지 않는다.
- **유효 조건**: 마지막 ODO 패킷이 `status:"OK"`(지금 패킷은 `state:"live"`)이고, 그 뒤로 `stopped`·`error`·`unavailable`·`unsupported` 패킷이 오지 않았다.
- 연결이 끊기면(`stopped`·`error`) ODO는 `null`. 성장 거리는 저장된 최대값(`maxDistanceKm`)을 유지해서 줄어들지 않는다.
- 바꿀 곳: `sdk-distance.js`의 45초 조건, `logic.js` `signalValid`의 15초 조건은 ODO에 적용하지 않도록 고친다.
- **ODO를 성장에 연결하는 작업은 부화 때 실제 ODO 저장과 반드시 함께 한다** (기준서 14장. 안 하면 바로 어른이 됨).

### 3.4 주행 제한 신호를 못 받으면 토토 안내를 시작하지 않음
- `uxRestricted`, `gear`, `ignition`은 **안전 신호**다. 셋 중 하나라도 아래면 화면을 막는다(지금 `derive`의 `restricted`, "차량 상태를 확인하고 있어요" 화면).
  - `status`가 `OK`가 아님 (`LOADING`, `NO_PERMISSION`, `UNSUPPORTED`, `ERROR`)
  - 실제 값인데 마지막 수신이 **15초**를 넘음 (Java는 5초마다 heartbeat, 2.6)
  - `uxRestricted`가 `true`, `ignition`이 `ON`이 아님
- 앱을 막 켰을 때도 같다. 주행 제한 신호를 처음 받기 전에는 토토 안내를 시작하지 않는다(기준서 2장 "제한 상태", 3.1 "제한·불명").
- 기어 `D`이고 속도 0(신호 대기)도 주행 중이다. 정차 화면은 `P`에서만 연다.

### 3.5 웹 쪽에서 바꿀 곳 (작업 목록)

| 파일 | 바꿀 내용 |
| --- | --- |
| 새 파일 (예: `vehicle-live.js`) | `bungbung-vehicle`·`__bungbungVehicleItems`를 받아 항목별 값·`status`·`receivedAt`·`origin:"real"`로 바꿔 `VehicleProvider`에 넣음. 시연 중이면 무시 |
| `vehicle.js` | `set`이 항상 `isMock:true`로 덮는 부분을 항목별 `origin`으로 바꿈 |
| `logic.js` (`signalValid`) | 항목별 `origin`을 보고 신선도 검사. ODO는 3.3 규칙 |
| `sdk-distance.js` | `item`이 `odometerKm`가 아닌 패킷은 무시. 안 그러면 기어 패킷을 ODO 오류로 표시함 |
| `hmi-app.js` | 실차·시연 모드 전환, "모의 데이터" 표시 조건 |
| `tests/` | 상태 5종, heartbeat 끊김, 시연 중 실제 값 무시·저장 안 함, 옛 ODO 패킷 호환 |

---

## 4. 에뮬레이터 검증 기록 (팀원1 확인)

| 항목 | 결과 | 확인 방법·메모 |
| --- | --- | --- |
| 누적 거리 `odometerKm` | ✅ 앱이 받음 | Pleos Virtual Console에서 값을 바꾸면 마이카펫 앱 SDK 확인 칸에 반영 |
| 기어 `gear` (P·D·R·N) | △ 진단 앱에서만 받음 | 마이카펫 앱에서는 아직 확인 안 함 |
| 주행 제한 `uxRestricted` | △ 진단 앱에서만 받음 | 마이카펫 앱에서는 아직 확인 안 함 |
| 차량 경고 `safetyWarnings` | ✕ 막힘 | 일반 권한으로는 읽을 수 없음 → 당분간 시연 모드에서만 |
| 시동 `ignition` | 미확인 | |
| 주행 가능 거리 `rangeRemainingKm` | 미확인 | |
| 바깥 기온 `outsideTempC` | 미확인 | |
| 와이퍼 `wiperState` | 미확인 | |
| 전조등 `headlightOn` | 미확인 | |
| 타이어 `tireWarning` | 미확인 | |
| ADB 시연 (`SIMULATE` 인텐트) | △ 예전 빌드에서 작동 | 현재 빌드에서 다시 확인 필요 |

---

## 5. 팀원1에게 확인할 질문

1. 진단 앱에서 기어·주행 제한을 읽을 때 쓴 **API와 권한**은 무엇인가요? (Android `GEAR_SELECTION`·`CarUxRestrictionsManager` / Pleos SDK 중 어느 쪽, 권한 문자열)
2. 그 권한을 **마이카펫 앱 매니페스트**에 넣으면 일반 앱 권한으로 허용되나요, 아니면 시스템·서명 권한이 필요한가요?
3. 에뮬레이터에서 기어를 바꿀 때 `uxRestricted`도 함께 바뀌나요? D·속도 0(신호 대기)에서 값이 `true`로 유지되나요?
4. 시동(`IGNITION_STATE`)을 Virtual Console에서 바꿀 수 있나요? 바꿀 수 있다면 어떤 값이 오나요 (LOCK·OFF·ACC·ON·START)?
5. 기어·주행 제한·시동은 값이 바뀔 때만 알림이 오나요? 주기적으로 오나요? (5초 heartbeat를 Java에서 따로 만들어야 하는지)
6. 차량 경고(Safety)가 막힐 때 받은 **오류 내용**(예외 이름, `ERROR_SECURITY_PERMISSION` 여부, 필요한 권한)을 적어 줄 수 있나요?
7. 현재 빌드에서 ADB `SIMULATE` 인텐트(`scene`, `payload`)가 다시 작동하나요? 안 되면 로그(`BungbungSim`)를 받을 수 있나요?
8. ODO 값의 단위가 km인지 실제 차·에뮬레이터 둘 다에서 확인했나요? 소수점(예: 10180.5)이 오나요?
9. 앱을 백그라운드로 보냈다가 돌아왔을 때 ODO 재연결과 중복 알림이 없는지 확인했나요?
10. 주행 가능 거리·기온·와이퍼·전조등·타이어 중 Virtual Console에서 바꿀 수 있는 항목은 무엇인가요? 권한은 각각 무엇인가요?
11. 2장의 패킷 모양(`item`, `status` 추가, 항목별 마지막 패킷 기억, 5초 heartbeat)으로 Java를 바꾸는 데 문제가 있나요?
