# 차량 값 연결 약속 (Android → 웹)

> 작성: 2026-11-25 · 기준 코드: main `778f01d`
> Android(Java)가 읽은 차량 값을 웹 화면(WebView)에 넘기는 **약속(계약)**을 적은 문서다. 서비스 기준은 [SERVICE_SPEC.md](SERVICE_SPEC.md)를 따른다.
> 1장은 **지금 있는 그대로**, 2장부터는 **앞으로의 약속**이다. 2장 이후 내용은 코드에 아직 없다.
>
> 역할(기준서 13.1): **Java 연결은 팀원1(윤정)**, **웹 연결기·성장 계산·테스트는 윤서**.

## 0. 확정된 결정 (2026-11-25, 윤정 답변 반영)

| 주제 | 결정 | 자세히 |
| --- | --- | --- |
| 패킷 모양 | 2장 형식(`item`·`status` 추가, `OK`가 아니면 값 `null`)을 Java에서 그대로 보냄 | 2.1~2.3 |
| 주행 제한 판단 | **`CarUxRestrictionsManager` 신호로만 판단**한다. 기어·속도로 추정하지 않는다 | 2.4, 3.4 |
| Java 재조회 | 주행 제한·기어·시동은 **5초마다 다시 조회**. **조회에 성공할 때만 `receivedAt`을 갱신**하고, 연결·조회에 실패하면 값 `null`과 해당 상태를 보냄 | 2.6 |
| 웹 만료 | 웹은 새 패킷이 없어도 **자체 타이머로 15초 만료**를 처리함 | 3.4 |
| ODO 유효 시간 | **지금 45초 기준을 유지**. 연결 끊김을 따로 확실히 감지할 수 있게 되면 다시 정함 | 3.3 |
| 차량 경고 | OEM 전용 권한(`PRIVATE_CAR_SAFETY`)이 필요해 **모의로 유지**. 특권 권한은 요청하지 않음 | 2.5, 4장 |
| `__bungbungVehicle` | **ODO 전용 호환용**으로만 남김. 다른 항목은 `__bungbungVehicleItems` | 2.6 |
| 실차 모드 시작 | **기어·시동이 연결되기 전에는 실차 모드 화면을 모의 기본값으로 열지 않음**. 주행 제한 신호가 들어오는 것부터 확인 | 3.1 |
| 작업 순서 | 윤정: 주행 제한 Java 연결 + N10 · 윤서: 웹 연결기 + N12 (병행) | 기준서 13.3 |

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

## 2. 약속: 항목을 늘릴 때의 패킷 모양 (윤정 동의)

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
| `uxRestricted` | `true` / `false` | AAOS `CarUxRestrictionsManager`의 현재값과 변경 콜백에서 `isRequiresDistractionOptimization()`. 별도 특권 권한 없음 (진단 앱 확인) | 제한이 걸려 있으면 `true`. 모르면 `null` + `LOADING`/`ERROR`. **기어·속도로 추정하지 않음** |
| `gear` | `"P"` · `"R"` · `"N"` · `"D"` | AAOS `CarPropertyManager`의 `GEAR_SELECTION`, 권한 `android.car.permission.CAR_POWERTRAIN` (일반 권한, 진단 앱 확인) | PARK→`P`, REVERSE→`R`, NEUTRAL→`N`, DRIVE와 1~9단→`D`. 그 밖(UNKNOWN 등)은 `null` + `ERROR` |
| `ignition` | `"OFF"` · `"ACC"` · `"ON"` · `"START"` | AAOS `CarPropertyManager`의 `IGNITION_STATE`, 권한 `CAR_POWERTRAIN` (문서상, 실제 수신 미확인) | LOCK·OFF→`OFF`, ACC→`ACC`, ON→`ON`, START→`START`. UNDEFINED는 `null` + `ERROR` |
| `odometerKm` | km 숫자 (0~999,999). **소수점은 자르지 않음** | Pleos `Odometer`, 권한 `pleos.car.permission.CAR_DRIVE` (지금 있음) | 지금 그대로 + `item`, `status` 칸 추가 |

- 마이카펫 APK는 지금 `pleos.car.permission.CAR_DRIVE`만 선언한다. 기어·시동을 읽으려면 매니페스트에 `android.car.permission.CAR_POWERTRAIN`을 추가하고, **마이카펫 APK에서 다시 확인**한다.

`source` 값: Pleos SDK로 읽으면 `pleos-sdk`, Android 차량 속성·`CarUxRestrictionsManager`로 읽으면 `aaos-car`.

### 2.5 나중에 같은 모양으로 늘릴 항목

| `item` | 값 | 비고 |
| --- | --- | --- |
| `rangeRemainingKm` | km 숫자 (0~1,500) | 콘솔 원본은 m → Java에서 ÷1000. 권한 후보 `pleos.car.permission.CAR_ENERGY` |
| `outsideTempC` | °C 숫자 (-40~60) | 권한 후보 AAOS `android.car.permission.CAR_EXTERIOR_ENVIRONMENT`. **공조 설정 온도와 다른 값**이니 섞지 않음 |
| `tripDistanceKm`, `tripTimeMin` | 숫자 | SDK가 안 주면 웹에서 시동 ON 때 ODO·시각으로 계산 (별도 결정) |
| `wiperState` | `"OFF"` · `"INT"` · `"LOW"` · `"HIGH"` | 권한 후보 `pleos.car.permission.CAR_WINDOWS` |
| `headlightOn` | `true` / `false` | 권한 후보 `pleos.car.permission.CAR_LIGHTS` |
| `tireWarning` | `true` / `false` | 타이어 도메인 권한 후보 `pleos.car.permission.CAR_SAFETY`. TPMS 경고 API의 권한은 따로 확인 필요 |
| `safetyWarnings` | `[{id, level:"red"\|"yellow", label}]` (최대 20개) | **OEM 전용 `PRIVATE_CAR_SAFETY`가 필요해 모의로 유지** (4장). 특권 권한은 요청하지 않음 |

권한 "후보"는 Pleos·AAOS 문서 기준이다. 앱에서 실제로 받는지는 아직 확인하지 않았다.

### 2.6 Java에서 함께 바꿀 것 (팀원1)
1. **항목별 마지막 패킷 기억 (N10)**: 지금은 패킷 1개(`latestVehiclePacket`)만 기억한다. 항목이 여러 개면 마지막 항목만 남는다. 항목 이름별로 마지막 패킷을 기억한다. 페이지가 열리면 **전체 묶음(`__bungbungVehicleItems`)을 먼저 채운 뒤** 항목마다 `bungbung-vehicle` 신호를 보낸다.
2. **웹의 늦은 준비 대비**: `window.__bungbungVehicle`은 **ODO 전용 호환용**으로만 남긴다(ODO 패킷만 넣음). 다른 항목은 항목별 묶음 `window.__bungbungVehicleItems = { odometerKm: {...}, gear: {...}, uxRestricted: {...}, ... }`에만 넣는다.
3. **5초 재조회**: 기어·시동은 명세상 **값이 바뀔 때만** 알림이 오고, 주행 제한도 **제한이 바뀔 때만** 콜백이 온다. 고정값이 주기적으로 온다고 기대하면 안 된다. 그래서 Java가 주행 제한·기어·시동을 **5초마다 다시 조회**해서 보낸다(`via:"read"`).
   - **조회에 성공할 때만 `receivedAt`을 갱신**한다. 값이 안 바뀌었어도 성공했으면 갱신한다.
   - 연결·조회에 실패하면 값 `null`과 해당 `status`(`ERROR`·`NO_PERMISSION` 등)를 보낸다. 실패한 패킷에 예전 `receivedAt`을 새 시각으로 바꿔 넣지 않는다.
4. **앱이 안 보일 때**: `stop` 때 항목마다 `status:"LOADING"`, 값 `null` 패킷을 한 번 보낸다.

---

## 3. 웹이 값을 받아 쓰는 규칙 (윤서)

### 3.1 실차 모드와 시연 모드

| | 실차 모드 | 시연 모드 |
| --- | --- | --- |
| 언제 | `?android=1`이고, 시연 중이 아닐 때 | 시연 패널(미리보기·시나리오·수동 입력), ADB 시연(`bungbung-simulation`), 녹화 모드(`?record=1`), `?android=1` 없는 브라우저 |
| 실제 값 | 화면·성장 계산에 사용 | **무시** (화면에 안 씀). 마지막 실제 값만 기억해 둠 |
| 저장 | `session.checkpoint`로 저장 | **저장 안 함** (지금 `DemoSession`과 같음) |
| 돌아올 때 | — | "내 토토로 돌아가기" 때 기억해 둔 실제 값을 다시 적용. 단 3.3·3.4의 유효 조건을 다시 검사 |

- **기어·시동이 연결되기 전에는 실차 모드 화면을 모의 기본값으로 열지 않는다.** 실차 모드에서 기어·시동 값이 없으면 모의 기본값(`P`, `ON`)으로 채우지 않고, 값 없음(`LOADING`)으로 두어 화면을 막는다(3.4). 첫 단계는 **주행 제한 신호가 들어오는지 확인**하는 것이다.
- 실제 값은 **저장 데이터에 넣지 않는다.** 저장하는 건 부화 때 ODO(`baseOdo`) 같은 최소 값뿐이다(기준서 6.4). 지금 `load`는 모의 스냅샷(`isMock:true`)만 받아들이므로, 이 규칙과 맞다.
- 시연 값(예: 2,180km, 청소년)이 진짜 토토에 덮어써지면 안 된다. 실차 모드에서도 저장은 반드시 `session.checkpoint`를 거친다.

### 3.2 항목마다 진짜·모의 표시
- 지금은 차 데이터 전체에 `isMock` 하나만 있고, `VehicleProvider.set`이 항상 `isMock:true`로 덮는다. 진짜 ODO와 모의 기어처럼 **섞이면 구분할 수 없다.**
- 방법: 항목별 출처 `origin: { gear: "real", odometerKm: "real", rangeRemainingKm: "mock", ... }`를 둔다.
  - `"real"`: `bungbung-vehicle`로 받은 값
  - `"mock"`: 기본값, 시연 패널, ADB 시연
- 화면 구석 "모의 데이터" 표시는 **화면에 쓰인 항목 중 하나라도 `mock`이면** 계속 보인다(기준서 2장 "모의 데이터", 3.2). 모든 항목이 `real`일 때만 표시를 바꾼다(문구는 별도 결정).
- `isMock`은 옛 저장 데이터 호환을 위해 남겨 둔다.

### 3.3 ODO: 지금 45초 기준 유지
- 주차 중에는 ODO가 안 바뀌는 게 정상이다. 그래서 변경 알림만 보지 않고, Java가 15초마다 다시 조회한 값(`via:"read"`)으로 신선함을 유지한다.
- **유효 조건 (지금 `sdk-distance.js`와 같음)**: `status:"OK"`(지금 패킷은 `state:"live"`)이고, `connected`·`supported`가 `true`이고, 값이 0 이상의 숫자이고, **`receivedAt`이 45초 이내**다.
- 이 45초 기준은 **연결 끊김을 따로 확실히 감지할 수 있게 될 때까지 그대로 둔다.** 그때 "연결이 살아 있으면 마지막 값 유효"로 바꿀지 다시 정한다.
- 연결이 끊기면(`stopped`·`error`) ODO는 `null`. 성장 거리는 저장된 최대값(`maxDistanceKm`)을 유지해서 줄어들지 않는다.
- 바꿀 곳: `logic.js` `signalValid`는 실제 값에 15초를 쓰므로, **ODO에는 45초**를 쓰도록 항목별 기준을 둔다. 안 그러면 15초 조회 간격 사이에 ODO가 사라졌다 나타난다.
- **ODO를 성장에 연결하는 작업은 부화 때 실제 ODO 저장과 반드시 함께 한다** (기준서 14장. 안 하면 바로 어른이 됨).

### 3.4 주행 제한 신호를 못 받으면 토토 안내를 시작하지 않음
- `uxRestricted`, `gear`, `ignition`은 **안전 신호**다. 셋 중 하나라도 아래면 화면을 막는다(지금 `derive`의 `restricted`, "차량 상태를 확인하고 있어요" 화면).
  - `status`가 `OK`가 아님 (`LOADING`, `NO_PERMISSION`, `UNSUPPORTED`, `ERROR`)
  - 실제 값인데 마지막 `receivedAt`이 **15초**를 넘음 (Java는 5초마다 재조회, 2.6)
  - `uxRestricted`가 `true`, `ignition`이 `ON`이 아님
- **15초 만료는 웹이 자체 타이머로 처리한다.** 새 패킷이 오지 않아도 웹이 주기적으로(예: 1초마다) 시각을 확인해서, 15초가 지나면 그 항목을 만료로 보고 화면을 막는다. 패킷이 올 때만 검사하면, Java가 멈췄을 때 마지막 "제한 없음" 값이 계속 남는다.
- **주행 제한은 `uxRestricted` 신호로만 판단한다.** 기어·속도로 제한 여부를 추정하지 않는다. 에뮬레이터에서 D·속도 0에서도 제한이 걸리고, R→N에서도 직전 제한이 유지됐다(4장). 기어 값은 "정차 화면은 P에서만" 규칙에만 쓴다.
- 앱을 막 켰을 때도 같다. 주행 제한 신호를 처음 받기 전에는 토토 안내를 시작하지 않는다(기준서 2장 "제한 상태", 3.1 "제한·불명").
- 기어 `D`이고 속도 0(신호 대기)도 주행 중이다. 정차 화면은 `P`에서만 연다.

### 3.5 웹 쪽에서 바꿀 곳 (작업 목록)

| 파일 | 바꿀 내용 |
| --- | --- |
| 새 파일 (예: `vehicle-live.js`) | `bungbung-vehicle`·`__bungbungVehicleItems`를 받아 항목별 값·`status`·`receivedAt`·`origin:"real"`로 바꿔 `VehicleProvider`에 넣음. 시연 중이면 무시. **15초 만료 자체 타이머** |
| `vehicle.js` | `set`이 항상 `isMock:true`로 덮는 부분을 항목별 `origin`으로 바꿈 (N11) |
| `logic.js` (`signalValid`) | 항목별 `origin`을 보고 신선도 검사. 안전 신호 15초, ODO 45초 (3.3) |
| `sdk-distance.js` | `item`이 `odometerKm`가 아닌 패킷은 무시 (N12). 안 그러면 기어 패킷을 ODO 오류로 표시함 |
| `hmi-app.js` | 실차·시연 모드 전환, 실차 모드에서 모의 기본값으로 열지 않기, "모의 데이터" 표시 조건 |
| `tests/` | 상태 5종, 새 패킷 없이 15초 만료, 실패 패킷의 `receivedAt` 미갱신, 시연 중 실제 값 무시·저장 안 함, 옛 ODO 패킷 호환, 기어로 제한을 추정하지 않음 |

---

## 4. 에뮬레이터 검증 기록 (팀원1 윤정 확인, 2026-11-25 갱신)

| 항목 | 결과 | 확인 방법·메모 |
| --- | --- | --- |
| 누적 거리 `odometerKm` | ✅ 마이카펫 앱이 받음 | Virtual Console에서 2→3km로 바꾸면 같은 앱 프로세스의 SDK·화면에 2→3으로 반영. 실차 단위는 미확인. 콘솔이 1km 단위라 소수점 수신도 미확인 |
| 기어 `gear` (P·D·R·N) | △ 진단 앱에서 받음 | `GEAR_SELECTION` + `CAR_POWERTRAIN`. 마이카펫 APK는 권한 미선언 → 권한 추가 후 다시 확인 |
| 주행 제한 `uxRestricted` | △ 진단 앱에서 받음 | `CarUxRestrictionsManager` 현재값·변경 콜백. 속도 0에서 P는 제한 없음, D·R은 제한 있음(D 0km/h에서도). R→N에서 직전 제한 유지. 마이카펫 앱 미확인 |
| 차량 경고 `safetyWarnings` | ✕ 막힘 | `pleos.car.permission.CAR_SAFETY`가 있어도 `checkTelltalesCapabilities`·`registerTelltales`·`getTelltalesInfo`가 `SecurityException`으로 거절. `ERROR_SECURITY_PERMISSION` 코드는 아님. SDK 주석상 OEM용 `PRIVATE_CAR_SAFETY` 필요 → 모의 유지 |
| 시동 `ignition` | 미확인 | Virtual Console 가이드에 시동 변경 항목이 없음. 실제로 오는 값(LOCK/OFF/ACC/ON/START) 미확인 |
| 주행 가능 거리 `rangeRemainingKm` | 미확인 | 콘솔에서 변경 가능(문서상, 단위 m). 앱 수신 미확인 |
| 바깥 기온 `outsideTempC` | 미확인 | 콘솔 변경 가능 여부 미확인. 공조 설정 온도와는 다른 값 |
| 와이퍼 `wiperState` | 미확인 | 콘솔에서 와이퍼 모드 변경 가능(문서상). 앱 수신 미확인 |
| 전조등 `headlightOn` | 미확인 | 콘솔에서 전조등 모드 변경 가능(문서상). 앱 수신 미확인 |
| 타이어 `tireWarning` | 미확인 | 콘솔에서 TPMS 경고등 변경 가능(문서상). TPMS 경고 API 권한 별도 확인 필요 |
| ADB 시연 (`SIMULATE` 인텐트) | △ 이전 APK에서 작동 | 현재 main: 스크립트가 문서대로 인텐트를 만드는 것과 Java 수신 코드는 확인. 최신 APK의 `scene`·`payload` 실동작과 `BungbungSim` 로그는 재검증 전 |
| 앱 복귀 (백그라운드 → 다시 열기) | △ 일부 확인 | 복귀 후 ODO 표시 재개는 확인. 반복 백그라운드·복귀에서 구독 중복이 없는지는 미검증(실기 테스트로 남김). 코드에는 `onStop` 해제와 이전 연결 콜백 차단이 있음 |

---

## 5. 팀원1에게 확인한 질문과 답 (윤정, 2026-11-25)

1. **진단 앱에서 기어·주행 제한을 읽을 때 쓴 API와 권한은?**
   → 둘 다 AAOS 경로예요. 기어는 `CarPropertyManager`의 `GEAR_SELECTION` + `android.car.permission.CAR_POWERTRAIN`이에요. 주행 제한은 `CarUxRestrictionsManager`의 현재값과 변경 콜백에서 `isRequiresDistractionOptimization()`을 읽었어요(Pleos 주행 제한 가이드 참고).
2. **마이카펫 앱 매니페스트에 넣으면 일반 권한으로 허용되나?**
   → `CAR_POWERTRAIN`은 AAOS 문서상 일반 권한이고, 진단 앱에서 기어 읽기에 성공했어요. 주행 제한 읽기는 특권 권한을 따로 추가하지 않았어요. 마이카펫 APK는 지금 ODO용 `pleos.car.permission.CAR_DRIVE`만 선언하고 있어서, 기어는 권한을 추가한 뒤 그 APK에서 다시 확인해요. 시동도 문서상 같은 권한이지만 실제 수신은 미확인이에요.
3. **기어를 바꿀 때 `uxRestricted`도 바뀌나? D·속도 0에서 `true`가 유지되나?**
   → 에뮬레이터 속도 0에서 P는 제한 없음, D·R은 제한 있음이었어요. D는 0km/h에서도 제한이 걸렸고, R→N에서도 직전 제한이 유지됐어요. **기어·속도로 제한을 추정하지 않고 UX 신호를 따로 읽어야 해요** (0장 결정).
4. **시동을 Virtual Console에서 바꿀 수 있나? 어떤 값이 오나?**
   → 공식 Virtual Console 가이드에서 시동 변경 항목을 찾지 못했어요. LOCK/OFF/ACC/ON/START 중 실제로 오는 값도 아직 확인하지 못했어요.
5. **값이 바뀔 때만 알림이 오나? 주기적으로 오나?**
   → 기어·시동은 명세상 변경 알림이고, 주행 제한도 제한 변경 콜백이에요. 고정값이 주기적으로 온다고 기대하면 안 돼요. 5초 재조회에 찬성해요. 재조회에 성공할 때만 `receivedAt`을 갱신하고, 연결·조회에 실패하면 `null`과 해당 상태를 보내요. 웹은 새 패킷이 없어도 자체 타이머로 15초 만료를 처리하면 좋겠어요 (0장 결정, 2.6, 3.4).
6. **차량 경고가 막힐 때의 오류 내용은?**
   → `pleos.car.permission.CAR_SAFETY`가 부여된 상태에서도 `checkTelltalesCapabilities`, `registerTelltales`, `getTelltalesInfo`가 `SecurityException`으로 거절됐어요. `ERROR_SECURITY_PERMISSION` 코드로 받은 건 아니에요. SDK 주석에는 등록·지원 조회에 OEM용 `PRIVATE_CAR_SAFETY`가 필요하다고 적혀 있어요. 특권 권한은 요청하지 않고 모의로 유지하는 데 동의해요.
7. **현재 빌드에서 ADB `SIMULATE` 인텐트가 작동하나?**
   → 이전 APK에서는 실제 에뮬레이터 화면에서 작동했어요. 현재 main은 스크립트가 문서대로 인텐트를 만드는 것과 Java 수신 코드까지 확인했어요. 최신 APK의 `scene`·`payload` 실동작과 `BungbungSim` 로그는 아직 재검증 전이에요.
8. **ODO 단위가 km인가? 소수점이 오나?**
   → 에뮬레이터 콘솔에서 2→3km로 바꾸니 같은 앱 프로세스의 SDK·화면에서 2→3으로 반영됐어요. 실차 단위는 미확인이고, 콘솔이 1km 단위라 소수점 수신도 미확인이에요. 계약은 km 숫자로 유지하고 소수점은 자르지 않는 게 좋아요 (2.4).
9. **앱 복귀 때 ODO 재연결과 중복 알림이 없나?**
   → 복귀 후 값 표시가 다시 되는 건 봤어요. 반복 백그라운드·복귀에서 구독 중복이 없는지까지는 검증하지 않았어요. 코드에는 `onStop` 해제와 이전 연결 콜백 차단이 있고, 실기 테스트는 따로 남겨 둘게요.
10. **나머지 항목 중 Virtual Console에서 바꿀 수 있는 것과 권한은?**
    → 주행 가능 거리(m), 와이퍼 모드, 전조등 모드, TPMS 경고등은 문서상 변경할 수 있어요. 외기온 변경은 미확인이고, 공조 설정 온도와는 다른 값이에요. 읽기 권한 후보는 이래요(문서상 후보이고, 앱 실수신과 TPMS 경고 API 권한은 따로 확인 필요).
    - 주행 가능 거리: `pleos.car.permission.CAR_ENERGY`
    - 와이퍼: `pleos.car.permission.CAR_WINDOWS`
    - 조명: `pleos.car.permission.CAR_LIGHTS`
    - 타이어 도메인: `pleos.car.permission.CAR_SAFETY`
    - 외기온: AAOS `android.car.permission.CAR_EXTERIOR_ENVIRONMENT`
11. **2장 패킷 모양으로 Java를 바꾸는 데 문제가 있나?**
    → 2장 형식은 Java에서 보낼 수 있어요. `item`·`status`, `OK`가 아니면 값 `null`에 동의해요. Java에서 항목별로 마지막 패킷을 보관하고, 페이지가 열리면 전체 묶음을 먼저 채운 뒤 신호를 보낼게요. `__bungbungVehicle`은 ODO 전용 호환으로 남기고, 웹 ODO 확인 칸도 `item`으로 걸러 주세요(N12). ODO의 45초 조건은 연결 끊김을 따로 확실히 감지할 수 있을 때 바꾸는 게 좋겠어요 (0장 결정, 3.3).

### 남은 확인 (다음 검증)
- 마이카펫 APK에 `CAR_POWERTRAIN`을 추가하고 기어 수신 확인
- 마이카펫 APK에서 주행 제한 수신 확인 (**가장 먼저**)
- 시동 실제 값과 바꾸는 방법
- 최신 APK의 ADB 시연(`scene`·`payload`)과 `BungbungSim` 로그
- 반복 백그라운드·복귀 때 구독 중복 여부 (실기)
- 실차 ODO 단위와 소수점
- 주행 가능 거리·외기온·와이퍼·전조등·TPMS의 앱 실수신과 권한
