---
theme: default
title: 레벨 디자이너를 위한 라이팅 2 — UE 5.8.4 EV 세팅
titleTemplate: '%s · RenderBrains'
author: Sungkuk Park (RenderBrains)
info: |
  레벨 디자이너를 위한 라이팅 강의 두 번째 시간.
  언리얼 엔진 5.8.4에서 프로젝트를 세팅하고, 노출(EV)의 원리를 이해한 뒤,
  Post Process Volume으로 노출 범위를 직접 잡아 보는 실습 중심 강의입니다.
lang: ko
aspectRatio: 16/9
transition: slide-left
mdc: true
routerMode: hash
colorSchema: light
fonts:
  sans: Noto Sans KR
  mono: JetBrains Mono
layout: cover
class: text-left
---

# 레벨 디자인에서의 라이팅 2
## 언리얼 엔진 5.8.4에서 EV(노출) 세팅하기

<div class="mt-8 text-lg opacity-80">
"밝기"를 느낌이 아니라 숫자로 다루는 첫걸음
</div>

<div class="abs-bl m-10 text-sm opacity-70">
발표자: Sungkuk Park (RenderBrains) · 대상: 레벨 디자이너
</div>

<!--
지난 편은 개념 위주였고 엔진을 열지 않았다. 이번 편은 UE 5.8.4를 직접 열고 따라 하는 실습 편.
강의 순서는 Unreal Lighting Camp "언리얼 코어 라이팅 클래스 — 첫 번째 시간"(youtu.be/EpC5siHpS_U)의 흐름을 따른다.
-->

---
layout: two-cols
layoutClass: gap-8
---

# 지난 시간 복습

라이팅이 레벨 디자인에서 하는 세 가지 일

- **시각적 유도** (Visual Guidance)  
  포컬 포인트, 키아로스쿠로
- **정서적 분위기** (Mood)  
  색온도, 하이키/로우키
- **가독성** (Readability)  
  실루엣 분리, 색 규칙

::right::

# 오늘 할 일

- **수업 전 준비**: UE 5.8.4 프로젝트 세팅 12종
- 노출(Exposure)이 무엇인지, 카메라로 이해하기
- 스톱(Stop)과 **EV100**
- 다이내믹 레인지와 "어디에 노출을 맞출 것인가"
- 언리얼의 기본값은 왜 "안드로메다 값"인가
- 실습: **Post Process Volume**으로 Min/Max EV100 잡기

<!--
지난 편의 모든 개념(포컬 포인트, 무드, 가독성)은 결국 "어디가 얼마나 밝은가"로 구현된다.
그 "얼마나"를 숫자로 다루지 못하면 라이팅을 비교하거나 재현할 수 없다. 그래서 EV부터 배운다.
-->

---
layout: section
---

# 0. 수업 전 준비
## 언리얼 라이팅 캠프 공식 디폴트 프로젝트 세팅 12종

<div class="text-sm opacity-70 mt-4">
출처: 박성국, "라이팅을 하기 전 프로젝트 세팅하는 법" (네이버 블로그, 2025-11-01)<br>
https://blog.naver.com/sungkuk_park/224061100654
</div>

<!--
새 프로젝트(Blank 또는 Third Person, Starter Content 없음)를 UE 5.8.4로 만든 뒤 시작.
모든 항목은 Edit > Project Settings 안에 있다. 대부분 변경 후 에디터 재시작을 요구한다.
-->

---

# 왜 "디폴트 세팅"이 필요한가

- **디폴트(Default)** = 프로젝트의 기준점. 매번 새로 고민하지 않아도 같은 품질에서 출발하기 위한 출발선
- 기준: **일반적인 PC 환경에서 낼 수 있는 가장 높은 품질의 라이팅**
- 모바일, 저사양 타깃 등 특수한 목적이면 일부 항목을 **바꿔야** 한다. 맹신 금지
- 오늘 강의의 노출 실습은 이 세팅 위에서 진행한다

<div class="mt-6 p-4 rounded bg-amber-50 border border-amber-300 text-sm">
<b>진행 방법</b> — 새 프로젝트 생성 → <code>Edit &gt; Project Settings</code> → 아래 12개 항목을 순서대로 변경 → 에디터 재시작 요구 시 재시작
</div>

<!--
"왜 이 값인가"를 모른 채 켜는 것은 지난 시간 말한 "1번 켜세요, 3 넣으세요" 식 학습이다.
오늘은 각 항목이 라이팅에 왜 필요한지 한 줄씩 붙여서 본다.
-->

---

# 세팅 1–3: 렌더러와 Lumen

| # | 경로 (Project Settings) | 값 | 왜 |
|---|---|---|---|
| 1 | Platforms › Windows › Target RHIs › **Default RHI** | **DirectX 12** | Lumen HWRT, Nanite, VSM이 DX12를 전제로 함 |
| 2 | Engine › Rendering › Global Illumination › **Dynamic Global Illumination Method** | **Lumen** | 실시간 간접광. 라이트를 옮기면 바운스가 즉시 따라옴 |
| 3 | Engine › Rendering › Reflections › **Reflection Method** | **Lumen** | GI와 같은 데이터로 반사를 계산해 일관성 확보 |

<div class="mt-4 grid grid-cols-3 gap-4 text-xs opacity-70">
<div class="h-24 border-2 border-dashed rounded flex items-center justify-center">스크린샷: Default RHI</div>
<div class="h-24 border-2 border-dashed rounded flex items-center justify-center">스크린샷: Dynamic GI Method</div>
<div class="h-24 border-2 border-dashed rounded flex items-center justify-center">스크린샷: Reflection Method</div>
</div>

<!--
스크린샷 자리표시. UE 5.8.4에서 직접 찍은 캡처로 교체 예정 (public/ 폴더).
-->

---

# 세팅 4–6: 레이 트레이싱 방식

| # | 경로 (Engine › Rendering) | 값 | 왜 |
|---|---|---|---|
| 4 | Lumen › **Use Hardware Ray Tracing when available** | ✅ true | GPU가 지원하면 더 정확한 트레이싱 사용 |
| 5 | Hardware Ray Tracing › **Support Hardware Ray Tracing** | ✅ true | 4번이 실제로 동작하기 위한 전제 조건 |
| 6 | Lumen › **Software Ray Tracing Mode** | **Detail Tracing** | 메시 디스턴스 필드를 써서 작은 디테일의 간접광·반사 품질 향상 |

<div class="mt-6 p-4 rounded bg-red-50 border border-red-300">
<b>⚠ 6번은 매번 바꿔야 한다.</b> 엔진 기본값은 <b>Global Tracing</b>이라 새 프로젝트를 만들 때마다 <b>Detail Tracing</b>으로 직접 바꿔 줘야 한다.
</div>

<!--
Detail Tracing은 Mesh Distance Field를 사용하므로 8번(Generate Mesh Distance Fields)과 짝이다.
-->

---

# 세팅 7–9: 그림자, 디스턴스 필드, Nanite

| # | 경로 (Engine › Rendering) | 값 | 왜 |
|---|---|---|---|
| 7 | Direct Lighting › **Shadow Map Method** | **Virtual Shadow Maps** | Nanite 지오메트리에 맞는 고해상도 그림자. 근경·원경 모두 선명 |
| 8 | Software Ray Tracing › **Generate Mesh Distance Fields** | ✅ true | 6번 Detail Tracing과 Lumen 소프트웨어 경로의 데이터 소스 |
| 9 | Nanite › **Nanite** | ✅ true | 고밀도 메시를 그대로 사용. VSM·Lumen과 함께 묶여 동작 |

<div class="mt-4 text-sm opacity-70">
7·8·9는 서로 의존한다. 하나만 켜면 품질이나 성능이 어긋나기 쉽다.
</div>

---

# 세팅 10: Auto Exposure 기본값 — 오늘 강의의 출발점

경로: Engine › Rendering › Default Settings › **Auto Exposure**

| 항목 | 값 | 왜 |
|---|---|---|
| Auto Exposure | ✅ true | 카메라처럼 밝기에 따라 노출이 자동 조절되게 한다 |
| Auto Exposure Method | **Auto Exposure Histogram** | 화면 밝기 분포(히스토그램)로 노출을 결정. 오늘 디버그 뷰에서 보게 될 것 |
| **Auto Exposure Bias** | **1 → 0** | 엔진 기본값 1은 모든 장면을 +1스톱(2배) 밝게 만든다. 0이어야 측정값과 결과가 일치 |
| Extend default luminance range in Auto Exposure settings | true (고정) | 5.6 이후 항상 켜져 있고 바꿀 수 없다. EV100 단위로 노출을 다루기 위한 전제 |

<div class="mt-4 p-3 rounded bg-red-50 border border-red-300 text-sm">
<b>⚠ Bias를 0으로 바꾸지 않으면</b> 이후 모든 EV 측정과 세팅이 한 스톱씩 어긋난다.
</div>

<!--
Auto Exposure Bias는 콘솔 변수 r.DefaultFeature.AutoExposure.Bias 에 해당. 기본 1.0.
강의 Q&A에서도 "캘리브레이션할 때는 Exposure Compensation을 0으로" 라고 설명됨 105′01″.
-->

---

# 세팅 11–12: 라이트 단위와 대기 안개

| # | 경로 (Engine › Rendering) | 값 | 왜 |
|---|---|---|---|
| 11 | Default Settings › **Light Units** | **Lumens – Luminous Flux, Normalized** | 포인트·스팟 라이트를 실제 전구처럼 루멘(lm)으로 입력. 물리 기반 라이팅의 기본 |
| 12 | **Support Sky Atmosphere Affecting Height Fog** | ✅ true | 높이 안개가 하늘 색·태양 색을 물려받아 대기와 안개가 따로 놀지 않게 한다 |

<div class="mt-6 p-4 rounded bg-sky-50 border border-sky-300 text-sm">
Directional Light는 <b>lux</b>, Sky Light는 <b>cd/m²</b>, Point/Spot은 <b>lm</b>(또는 cd). 단위가 다르다는 것만 먼저 기억하자. 뒤에서 왜 중요한지 나온다.
</div>

---

# 세팅 완료 체크리스트

<div class="grid grid-cols-2 gap-x-10 text-sm">
<div>

- [ ] 1. Default RHI = DirectX 12
- [ ] 2. Dynamic GI Method = Lumen
- [ ] 3. Reflection Method = Lumen
- [ ] 4. Lumen HWRT when available = true
- [ ] 5. Support Hardware Ray Tracing = true
- [ ] 6. Software Ray Tracing Mode = **Detail Tracing**

</div>
<div>

- [ ] 7. Shadow Map Method = Virtual Shadow Maps
- [ ] 8. Generate Mesh Distance Fields = true
- [ ] 9. Nanite = true
- [ ] 10. Auto Exposure: Histogram, **Bias = 0**
- [ ] 11. Light Units = Lumens (Normalized)
- [ ] 12. Sky Atmosphere Affecting Height Fog = true

</div>
</div>

<div class="mt-6 text-sm opacity-70">
에디터를 재시작하고 나면, 이제 "빛의 양"을 배울 준비가 끝났다.
</div>

---
layout: section
---

# 1. 오토 익스포저가 하는 일

<!--
강의 08′27″–15′01″. 오늘은 오토 익스포저 "1단계"(범위 잡기)만 다룬다. 2단계(PPV 여러 개와 트랜지션), 3단계(Exposure Compensation Curve)는 다음 편.
-->

---

# 실내로 들어가면 창밖이 하얗게 "탄다"

<div class="grid grid-cols-2 gap-8">
<div>

플레이어가 **밝은 실외 → 어두운 실내**로 들어가면

1. 카메라(눈)가 어두움에 적응해 "조리개를 연다"
2. 실내는 보이기 시작하고
3. 창밖 실외는 너무 밝아져 **하얗게 클리핑**된다

다시 실외로 나가면 반대로 조리개가 닫히며 재조정된다.

이 현상을 자동으로 만들어 주는 것이 **오토 익스포저(Auto Exposure)**.  
언리얼 디버그 뷰 이름은 **Eye Adaptation**(눈의 적응)이다.

</div>
<div class="h-56 border-2 border-dashed rounded flex items-center justify-center text-xs opacity-70">
스크린샷: 실내에서 바라본 창밖 클리핑 (UE 5.8.4)
</div>
</div>

<!--
09′19″ 강사의 자작 레벨 데모. 콘솔 ShowFlag.VisualizeHDR 1 로 하단 디버그 창을 띄움.
-->

---

# 업계는 예전에도, 지금도, 앞으로도 이 기법을 쓴다

- *Call of Duty: Modern Warfare* (2019) — 실내외 전환 시 노출 변화가 긴장감의 핵심
- *Red Dead Redemption 2* — 시간대와 날씨에 따라 노출이 계속 움직임
- *Cyberpunk 2077* — 네온 밤거리와 실내의 대비

**레벨 디자이너에게 중요한 이유**

- 어두운 방을 "그냥 어둡게" 만들면 오토 익스포저가 **알아서 밝혀 버린다** → 의도한 가독성·무드가 사라짐
- 반대로 노출 범위를 잡아 주면 **어두운 곳은 어둡게, 밝은 곳은 눈부시게** 남길 수 있다

<!--
12′03″ 레퍼런스 언급. 지난 편 가독성 슬라이드에서 "너무 어두운 전투 공간" 경고와 연결된다.
-->

---

# 파라미터 암기가 아니라 카메라 원리

<div class="grid grid-cols-3 gap-6 text-center mt-8">
<div class="p-6 rounded border">
<div class="text-4xl">📷</div>
<div class="font-bold mt-2">이론</div>
<div class="text-sm opacity-70 mt-1">카메라가 빛을 다루는 방식</div>
</div>
<div class="p-6 rounded border">
<div class="text-4xl">🧠</div>
<div class="font-bold mt-2">이해</div>
<div class="text-sm opacity-70 mt-1">언리얼 파라미터가 무엇의 번역인지</div>
</div>
<div class="p-6 rounded border">
<div class="text-4xl">🛠</div>
<div class="font-bold mt-2">실습</div>
<div class="text-sm opacity-70 mt-1">Post Process Volume에서 값 잡기</div>
</div>
</div>

<div class="mt-8 text-center opacity-80">
언리얼의 노출 파라미터는 전부 <b>전통적인 카메라 개념을 게임 엔진에 옮긴 것</b>이다.
</div>

<!--
13′31″ 수업 철학. "1번 켜세요, 3 넣으세요"는 다음 프로젝트에서 재현이 안 된다.
-->

---
layout: section
---

# 2. 노출(Exposure)이란

<!--
강의 15′01″–21′15″
-->

---

# 노출 = 빛의 "양"을 조절하는 것

<div class="grid grid-cols-2 gap-8">
<div>

- 라이팅에는 두 축이 있다
  - **빛의 질(Quality)**: 색, 방향, 부드러움, 그림자 모양
  - **빛의 양(Quantity)**: 얼마나 많은 빛이 센서(눈)에 들어오는가
- **노출은 "양"만 다룬다**
- 비유: 수도꼭지. 물의 성분은 그대로, 얼마나 틀지만 정한다

</div>
<div>

### 카메라의 세 변수

| 변수 | 뜻 | 언리얼에서 |
|---|---|---|
| ISO | 센서 감도 | 거의 안 씀 (기준 100 고정) |
| 셔터 스피드 | 빛을 받는 시간 | 거의 안 씀 |
| **애퍼처(조리개)** | 빛이 들어오는 구멍 크기 | **핵심** |

</div>
</div>

<!--
15′01″ 노출 정의, 16′54″ 세 변수. 라이팅 아티스트라면 수동 카메라를 한 대 사서 직접 찍어 보라는 조언.
-->

---

# 조리개(Aperture) = 구멍의 크기, F값으로 표시

<div class="grid grid-cols-5 gap-3 text-center mt-4">
<div class="p-3 rounded border"><div class="text-5xl">●</div><div class="font-mono mt-2">F1.4</div><div class="text-xs opacity-70">활짝 열림<br>매우 밝음<br>초점 범위 얕음</div></div>
<div class="p-3 rounded border"><div class="text-4xl">●</div><div class="font-mono mt-2">F2</div><div class="text-xs opacity-70">밝음<br>배경 흐림</div></div>
<div class="p-3 rounded border"><div class="text-3xl">●</div><div class="font-mono mt-2">F5.6</div><div class="text-xs opacity-70">중간</div></div>
<div class="p-3 rounded border"><div class="text-2xl">●</div><div class="font-mono mt-2">F11</div><div class="text-xs opacity-70">어두움</div></div>
<div class="p-3 rounded border"><div class="text-xl">●</div><div class="font-mono mt-2">F16</div><div class="text-xs opacity-70">대낮용<br>꽉 닫음</div></div>
</div>

<div class="mt-6">

- **F값이 작을수록 구멍이 크다 → 밝다.** F값이 클수록 구멍이 작다 → 어둡다
- 구멍을 열면 빛이 많이 들어오지만 초점 맞는 범위(DOF)가 얕아진다
- 사람의 **동공**이 정확히 이 역할을 한다. 대낮엔 수축(F16), 밤엔 확장(F1.4)  
  → 카메라는 눈을 보고 만든 것이고, 오토 익스포저는 **동공을 흉내 내는 것**

</div>

<!--
17′42″ 애퍼처, 19′58″ 동공 = 조리개. 강사가 그래프 방향을 거꾸로 그렸다가 정정한 부분이 있으니 "F값 작을수록 밝다"를 분명히.
-->

---
layout: section
---

# 3. 스톱(Stop)과 EV100

<!--
강의 21′22″–29′01″
-->

---

# "한 스톱 올려 줘" = 두 배 밝게

<div class="grid grid-cols-2 gap-8">
<div>

- **+1 스톱 = 밝기 2배**, **−1 스톱 = 절반**
- 스톱은 **2의 거듭제곱** 단위다

| 변화 | 밝기 배율 |
|---|---|
| +1 스톱 | × 2 |
| +2 스톱 | × 4 |
| +3 스톱 | × 8 |
| +4 스톱 | × 16 |
| −1 스톱 | × 0.5 |

</div>
<div>

### 퀴즈

−1 스톱에서 +1 스톱으로 가면 몇 배 밝아지는가?

<v-click>

**4배.** 두 스톱 차이이므로 2² = 4.

</v-click>

<v-click>

<div class="mt-4 p-3 rounded bg-amber-50 border border-amber-300 text-sm">
흔한 실수: "3배 밝게"와 "3스톱 밝게"는 다르다. 3스톱은 <b>8배</b>다. 디렉터와 대화할 때 단위를 꼭 확인하자.
</div>

</v-click>

</div>
</div>

<!--
21′22″ 원스톱. 강의 Q&A 107′47″에서 "세 배 = 쓰리스톱"이라는 발언이 있었는데 3스톱은 8배가 맞다. 슬라이드에서 정정.
-->

---

# EV100: ISO 100 기준으로 "빛의 양"을 한 숫자로

<div class="grid grid-cols-2 gap-8">
<div>

- **EV**(Exposure Value) = 조리개와 셔터의 조합을 하나의 숫자로 묶은 것
- **EV100** = ISO 100을 기준으로 한 EV. 언리얼 HDR 디버그 창에 표시되는 값
- EV가 1 커지면 빛의 양이 2배 → EV도 **스톱과 같은 단위**다

### Sunny 16 법칙

맑은 날 정오, ISO 100, F16, 1/100초  
→ **EV 15**

</div>
<div>

### 실세계 EV100 기준표 (대략)

| 장면 | EV100 |
|---|---|
| 맑은 날 정오, 햇빛 아래 | **15** |
| 같은 날 그늘 | 11~12 |
| 흐린 날 | 12 |
| 일출·일몰 직후 | 12 → 9 |
| 밝은 실내 (사무실) | 7~8 |
| 가정집 실내 | 5~6 |
| 밤 거리 (가로등) | 2~4 |
| 보름달 아래 풍경 | −2~−3 |

</div>
</div>

<!--
23′24″ EV100, 24′14″ Sunny 16. 표는 표준 노출표 기준. 강의에서 든 수치(태양 15, 그늘 11, 엘리베이터 6.6)와 일치.
-->

---

# 라이트 미터: 체중계처럼 "지금 여기"의 밝기를 잰다

<div class="grid grid-cols-2 gap-8">
<div>

### 실제 라이트 미터로 잰 하루

| 장소 | EV100 | 태양 대비 |
|---|---|---|
| 햇빛 아래 | 15 | 기준 |
| 건물 그늘 | 11 | 4스톱 = **1/16** |
| 엘리베이터 안 | 6.6 | 약 8.4스톱 ≈ **1/340** |

눈은 "조금 어둡네" 정도로 느끼지만, 센서에 들어오는 빛은 **수백 배** 차이가 난다.

</div>
<div>

### 언리얼에도 라이트 미터가 있다

- 뷰포트 **Show › Visualize › HDR (Eye Adaptation)**  
  또는 콘솔 `ShowFlag.VisualizeHDR 1`
- 화면 중앙 박스 = **Luminance Meter** (스팟 측정, 그 지점의 EV100)
- 하단 그래프 = 화면 전체 밝기 **히스토그램**
- **Average Scene EV100** = 모든 픽셀의 평균

<div class="h-28 mt-2 border-2 border-dashed rounded flex items-center justify-center text-xs opacity-70">
스크린샷: HDR (Eye Adaptation) 디버그 뷰
</div>

</div>
</div>

<!--
25′35″ 언리얼 Luminance Meter, 26′34″ 실측. 강의에서 15 vs 11을 "32배"로 정답 처리했지만 2^4 = 16배가 맞다. 엘리베이터 6.6과 태양 15는 8.4스톱 차이, 2^8.4 ≈ 338배.
-->

---
layout: section
---

# 4. 다이내믹 레인지
## 현실은 넓고, 눈은 좁고, 카메라는 더 좁다

<!--
강의 29′01″–37′09″
-->

---

# 모든 밝기를 한 번에 담을 수는 없다

<div class="mt-4">

```
EV100   -6      0       5      10      15      20   22
현실    |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■|   별빛 … 태양 직사광
눈             |■■■■■■■■■■■■■■■■■■■■■■■■■■|              대략 EV 1~15 (동공이 움직이며 적응)
카메라               |■■■■■■■■■■■■■■|                      한 번에 약 10스톱
```

</div>

- 카메라(게임 화면)는 현실의 레인지 중 **약 10스톱짜리 창문**만 보여 줄 수 있다
- 그 창문을 **어디에 둘지** 정하는 것이 노출이다
- 창문 위쪽은 하얗게 **타고**(clipping), 아래쪽은 검게 **뭉개진다**(crushed)

<!--
29′01″ 다이내믹 레인지. 수치는 강의에서 언급된 대략값. 눈의 범위는 문헌마다 다르다(순간 ~10~14스톱, 적응 포함 훨씬 넓음). 핵심은 "창문의 위치"라는 개념.
-->

---

# Expose to Dark vs Expose to Bright

<div class="grid grid-cols-2 gap-8 mt-4">
<div class="p-5 rounded border">

### 어두운 곳에 노출을 맞추면 (Expose to Dark)

- 실내·그림자가 잘 보인다
- 하늘과 창밖은 **하얗게 탄다**
- 느낌: 밝고 개방적, 때로는 "눈부심"

<div class="h-24 mt-3 border-2 border-dashed rounded flex items-center justify-center text-xs opacity-70">예시 이미지</div>

</div>
<div class="p-5 rounded border">

### 밝은 곳에 노출을 맞추면 (Expose to Bright)

- 하늘·광원의 디테일이 살아난다
- 그림자는 **검게 뭉개진다**
- 느낌: 무겁고 극적, 실루엣 강조

<div class="h-24 mt-3 border-2 border-dashed rounded flex items-center justify-center text-xs opacity-70">예시 이미지</div>

</div>
</div>

<div class="mt-4 text-sm opacity-80">
영화, 게임, 애니메이션(*WALL-E*처럼 물리 기반 라이팅을 쓴 작품)에서 모두 같은 선택이 반복된다. <b>지난 편의 키아로스쿠로는 결국 "Expose to Bright"의 선택</b>이다.
</div>

<!--
31′58″ 예시들. 레벨 디자이너는 이 선택이 "어디를 보여 주고 어디를 숨길지"와 같다는 점을 기억.
-->

---

# 라이팅 시나리오와 다이내믹 TOD

- **라이팅 시나리오** = 같은 공간을 다른 시간대·날씨로 세팅한 묶음 (정오, 선셋, 밤, 흐림…)
- 각 시나리오마다 **노출을 정확히 맞춰 두면**, 그것들을 시간 순으로 이으면 **다이내믹 TOD**(Time of Day)가 된다
- 레벨 디자이너는 보통 **트리거 박스**로 시나리오를 전환하거나, 특정 구역에 다른 노출을 준다

<div class="mt-6 p-4 rounded bg-sky-50 border border-sky-300 text-sm">
다이내믹 TOD는 <b>비싸다.</b> 매 프레임 하늘·GI를 다시 계산해야 하므로 고정 시간대보다 2~4배의 비용이 든다는 것이 강사의 경험치. 패키지 게임이라면 고정 시나리오로 충분한 경우가 많다.
</div>

<!--
34′06″ 시나리오·TOD, 60′42″ TOD 비용. 비용 수치는 경험 기반이라 프로젝트마다 다름.
-->

---
layout: section
---

# 5. 언리얼의 기본값은 왜 "안드로메다 값"인가

<!--
강의 37′09″–44′32″, 72′35″–81′25″
-->

---

# 실습 A: 빈 레벨에서 하늘 만들기

<div class="grid grid-cols-2 gap-8">
<div>

1. **File › New Level › Empty Level**
2. Place Actors에서 추가
   - **Directional Light** (태양)
   - **Sky Atmosphere** (대기)
   - **Sky Light** (하늘에서 오는 간접광)
   - **Volumetric Cloud** (구름)
3. Sky Light와 Directional Light의 Mobility를 **Movable**로  
   (Lumen을 쓰면 라이트는 Movable이 기본)
4. Directional Light를 수직으로 세우면 **정오**, 눕히면 **선셋**

이것으로 "라이팅이 끝났다"고 느껴진다. 과연 그럴까?

</div>
<div class="h-64 border-2 border-dashed rounded flex items-center justify-center text-xs opacity-70">
스크린샷: 기본 프로시저럴 스카이 (UE 5.8.4)
</div>
</div>

<!--
37′09″ 빈 레벨 데모, 57′41″ 필요 액터 4종. 이 네 액터를 묶어 "프로시저럴 스카이"라 부른다.
-->

---

# 디버그 뷰를 켜 보면: 히스토그램이 왼쪽으로 쏠려 있다

<div class="grid grid-cols-2 gap-8">
<div>

**Show › Visualize › HDR (Eye Adaptation)** 을 켠다.

| 측정 | 기본 씬 | 정오 실세계 |
|---|---|---|
| 태양을 직접 볼 때 | 10~11 | ≫ 15 |
| 태양 반대편 땅 | **−3** | 11~13 |
| Average Scene EV100 | **≈ 0** | 13~15 |

- 기본 선셋 씬을 재면 **EV −1** 이 나온다. 표에서 −1은 **별빛·달밤**이다
- 선셋은 실제로 **EV 9~12**. 기본값은 현실과 10스톱 이상 차이 → "안드로메다 값"

</div>
<div class="h-64 border-2 border-dashed rounded flex items-center justify-center text-xs opacity-70">
스크린샷: 기본 씬 히스토그램(왼쪽 쏠림) vs 물리값 씬(오른쪽)
</div>
</div>

<!--
39′08″ 히스토그램 비교, 72′35″ 기본 선셋 EV −1. 강사 샘플 씬은 EV 13(오후 3시 느낌).
-->

---

# 원인: Directional Light Intensity가 10 lux

<div class="grid grid-cols-2 gap-8">
<div>

- Directional Light의 Intensity 단위는 **lux**(조도)
- 엔진 기본값: **10 lux**
- 실세계
  - 밝은 햇빛: 약 **100,000 lux**
  - 흐린 날: 1,000~10,000 lux
  - 일출·일몰: 약 **400 lux**
  - 사무실 실내: 300~500 lux
- 기본 10 lux는 **해질녘 직후 수준**. 오토 익스포저가 조리개를 활짝 열어 "정오처럼 보이게" 속이고 있을 뿐

</div>
<div>

### 그럼 왜 겉보기엔 비슷한가?

- **오토 익스포저 때문이다.** 10 lux든 100,000 lux든 자동으로 밝기를 맞춰 버린다
- 하지만 그림자 깊이, 실내외 대비, 인공조명과의 균형은 **전부 어긋난다**
- CoD·RDR 같은 노출 전환 효과는 기본값으로는 만들 수 없다

<div class="mt-4 p-3 rounded bg-amber-50 border border-amber-300 text-sm">
강사의 작업값: 태양 <b>8,000 lux</b> 안팎(실측보다 낮춰 안정성 확보). 핵심은 정확한 숫자가 아니라 <b>태양·하늘·인공조명의 비율이 현실과 같아야</b> 한다는 것.
</div>

</div>
</div>

<!--
42′27″ 10 lux, 67′47″ 조도 위키 수치. 100,000 lux는 자막에서 "100 럭스"로 들렸지만 문맥상 100,000.
-->

---

# Physically Based *Lighting*: 세기에도 물리값을

- PBR(Physically Based Rendering)은 **재질**이 빛에 물리적으로 반응하게 한다
- 그 위에 **라이트의 세기까지** 물리값을 넣는 것이 Physically Based Lighting
- 효과
  - 태양(lux)과 실내 형광등(lm)이 **현실과 같은 비율**이 된다
  - 실내 ↔ 실외 이동 시 CoD 같은 노출 전환이 **자연히** 생긴다
  - 어떤 씬에서도 같은 값이 같은 결과를 낸다 → **재현 가능**
- **색은 크리에이티브 인풋**이다. 물리값은 세기만 고정하고, 색온도·색조는 무드를 위해 자유롭게

<div class="mt-6 p-4 rounded bg-sky-50 border border-sky-300 text-sm">
"아무도 믿지 마라, 특히 언리얼은." 프로시저럴 스카이는 실제 하늘을 캡처한 값과 룩이 다르다. 포토리얼이 목표라면 캡처 + 캘리브레이션, 지금은 <b>비율을 맞추는 것</b>까지가 목표.
</div>

<!--
76′13″–81′25″ Physically Based Lighting, 63′xx″ "언리얼을 믿지 마라".
-->

---
layout: section
---

# 6. 실습 B: Post Process Volume으로 노출 범위 잡기
## 오토 익스포저 1단계

<!--
강의 81′25″–88′16″. 오늘의 핵심 실습.
-->

---

# 두 가지 측정값을 구분하자

<div class="grid grid-cols-2 gap-8">
<div>

### Luminance Meter (스팟)

- 화면 중앙 박스가 가리키는 **한 지점**의 EV100
- "저 벽은 얼마나 밝은가"를 잴 때
- 예: 창밖 13, 실내 벽 9

</div>
<div>

### Average Scene EV100 (평균)

- 화면 **모든 픽셀의 평균** EV100
- 오토 익스포저가 실제로 **이 값을 보고** 조리개를 결정한다
- 히스토그램 위의 **파란 선**이 현재 평균
- 예: 실외 10.4, 실내 6.17

</div>
</div>

<div class="mt-6 p-4 rounded border">

**방향 규칙** — 히스토그램에서  
**오른쪽 = 밝음 = 조리개를 닫아야 함**, **왼쪽 = 어두움 = 조리개를 열어야 함**.  
"안드로메다처럼 어두우면 다 열고, 태양이면 다 닫아라."

</div>

<!--
81′25″ 스팟 vs 평균, 83′47″ 방향 규칙.
-->

---

# Post Process Volume 배치

<div class="grid grid-cols-2 gap-8">
<div>

1. Place Actors › Volumes › **Post Process Volume**
2. Details › Post Process Volume Settings › **Infinite Extent (Unbound)** ✅  
   → 레벨 전체에 적용
3. Details › **Exposure** 섹션 펼치기
   - Metering Mode: **Auto Exposure Histogram**
   - **Min EV100** / **Max EV100**: 오토 익스포저가 움직일 수 있는 **하한·상한**
   - **Exposure Compensation**: 전체를 몇 스톱 밀어 올릴지 (지금은 **0**)

</div>
<div class="h-64 border-2 border-dashed rounded flex items-center justify-center text-xs opacity-70">
스크린샷: PPV Details › Exposure (UE 5.8.4)
</div>
</div>

<div class="mt-4 text-sm opacity-70">
UE 5.8.4에서는 Min/Max EV100 항목 왼쪽 체크박스를 켜야 값이 적용된다(오버라이드).
</div>

<!--
84′51″. 프로젝트 세팅 10번에서 Bias를 0으로 둔 것과 PPV의 Exposure Compensation 0이 같은 의미.
-->

---

# Min EV100을 바꿔 가며 관찰하기

실내에 서서 평균 EV100이 약 **6**인 상태라고 하자. 오토 익스포저는 6까지 열고 싶어 한다.

| Min EV100 | 결과 | 해석 |
|---|---|---|
| (제한 없음) | 실내 적정, 창밖 하얗게 탐 | 카메라가 6까지 활짝 열었다 |
| **8** | 실내 약간 어두움, 창밖 디테일 조금 복귀 | "6까지 열지 마, 8에서 멈춰" |
| **10** | 실내 매우 어두움, 창밖 선명 | 2스톱 더 닫음 = 실내 1/4 밝기 |
| **4** | 실내 매우 밝음, 창밖 완전 클리핑 | 아래로 더 열 수 있게 허용 |

<div class="mt-4 grid grid-cols-3 gap-3 text-xs opacity-70">
<div class="h-20 border-2 border-dashed rounded flex items-center justify-center">Min 8</div>
<div class="h-20 border-2 border-dashed rounded flex items-center justify-center">Min 10</div>
<div class="h-20 border-2 border-dashed rounded flex items-center justify-center">Min 4</div>
</div>

<!--
85′00″–86′36″ 데모 값 8 → 10 → 4.
-->

---

# 1단계의 정의: "노출이 움직일 수 있는 범위를 정해 주는 것"

<div class="grid grid-cols-2 gap-8">
<div>

- **Min EV100** = 가장 어두운 곳에서 얼마나 열어 줄지 → 너무 낮으면 어두운 방이 "구제"되어 무드가 사라짐
- **Max EV100** = 가장 밝은 곳에서 얼마나 닫을지 → 너무 높으면 밝은 실외가 칙칙해짐
- 두 값을 **함께** 조절하는 것이 캘리브레이션. 하나만 만지면 반대쪽이 깨진다

</div>
<div>

### 레벨 디자이너를 위한 번역

- "이 방은 어둡게 유지하고 싶다" → **Min EV100을 올린다**
- "밖으로 나갈 때 눈부신 느낌" → Max는 그대로, 실내 Min을 올려 **대비를 키운다**
- 태양 8,000 lux를 줄이는 게 아니라 **카메라를 조정**한다. 광원 값은 물리값으로 고정

</div>
</div>

<div class="mt-6 p-4 rounded bg-amber-50 border border-amber-300 text-sm">
디렉터가 "좀 더 어둡게"라고 하면: 라이트를 끄지 말고 <b>노출</b>을 보라. 1스톱 = Min/Max를 1씩 올리기, 또는 Exposure Compensation −1.<br>
하프 스톱 = 0.5, 쿼터 스톱 = 0.25. 디렉터와 공유할 수 있는 <b>공통 언어</b>가 생긴다.
</div>

<!--
102′55″ 디렉터가 어둡게 요구할 때(TLOU Part II 예), 105′01″ Exposure Compensation 단위, 109′35″ Min/Max 함께 조절.
-->

---

# 보너스: 스팟 미터가 재는 것은 "빛 × 알베도"

- 화면에서 보이는 밝기 = **들어온 빛** × **표면 반사율(알베도, Base Color)**
- 같은 빛 아래서도 흰 벽과 검은 벽은 EV가 다르게 찍힌다

| 표면 | 알베도 | 비고 |
|---|---|---|
| 측정용 완전 백색 | 1.0 | 현실엔 없음 (최대 약 0.9998) |
| 흰 종이 | ≈ 0.7 | |
| **미들 그레이** | **0.18** | 카메라·라이트 미터의 기준값 |
| 차콜(숯) | ≈ 0.03 | |

- 레벨 디자이너에게: **벽 재질의 밝기를 바꾸면 노출도 바뀐다.** 블록아웃 재질을 미들 그레이(0.18)로 두면 노출 작업이 안정적이다

<!--
98′42″ 스팟 미터 Q&A. Deferred 렌더러에서 Base Color 버퍼 × 라이팅 버퍼.
-->

---
layout: section
---

# 7. 정리와 과제

---

# 레벨 디자이너 EV 체크리스트

<div class="grid grid-cols-2 gap-x-10 text-sm">
<div>

### 세팅

- [ ] 프로젝트 세팅 12종 적용 (특히 **Bias = 0**, **Detail Tracing**)
- [ ] Directional Light 세기는 **lux 물리값**으로 (정오 수만 lux, 선셋 수백 lux)
- [ ] Light Units = Lumens, 실내 조명도 실제 전구 값으로
- [ ] PPV 하나를 **Unbound**로 두고 Min/Max EV100 설정

</div>
<div>

### 작업 습관

- [ ] 막막하면 **Show › Visualize › HDR** 부터 켠다
- [ ] 라이트를 끄기 전에 **노출**을 먼저 의심한다
- [ ] "어둡게/밝게"는 **스톱 단위**로 말한다 (1스톱 = 2배)
- [ ] 블록아웃 재질은 **미들 그레이 0.18**
- [ ] 어두운 공간이 "구제"되어 가독성 문제가 숨지 않았는지 디버그 뷰로 확인

</div>
</div>

---

# 흔한 실수

| 실수 | 증상 | 처방 |
|---|---|---|
| Bias(Exposure Compensation)를 1로 둔 채 작업 | 모든 측정이 1스톱씩 어긋남 | 프로젝트 세팅 10번, PPV에서 0 확인 |
| Directional Light 10 lux 그대로 | 그림자 얕고, 실내외 전환 느낌 없음 | 물리값 lux로 교체 |
| Min EV100 미설정 | 어두운 방이 자동으로 밝아져 무드 상실 | Min EV100을 올려 하한 고정 |
| 라이트 세기로 분위기 조절 | 다른 씬에서 재현 불가, 비율 붕괴 | 라이트는 물리값, 분위기는 노출로 |
| "3배 밝게" = 3스톱으로 이해 | 8배 밝아짐 | 스톱 ↔ 배율 표 기억 |
| Software Ray Tracing Mode 기본값 유지 | 작은 디테일의 GI·반사 뭉개짐 | Detail Tracing으로 매번 변경 |

---

# 과제

<div class="grid grid-cols-2 gap-8">
<div>

### 만들 것

Empty Level에서 다음 다섯 액터만으로 프로시저럴 야외 씬을 만든다.

- Directional Light (물리값 lux)
- Sky Atmosphere
- Sky Light (Movable)
- Volumetric Cloud
- **Post Process Volume** (Unbound, Min/Max EV100)

</div>
<div>

### 제출할 것

1. 시간대 하나를 고른다 (정오 / 골든아워 / 밤)
2. 그 시간대의 **실세계 EV100**을 표에서 찾는다
3. **HDR (Eye Adaptation)** 디버그 뷰를 켠 스크린샷
4. Average Scene EV100이 목표와 **±1 이내**인지 적는다
5. 사용한 Directional Light lux, Min/Max EV100 값을 적는다

</div>
</div>

<div class="mt-6 text-sm opacity-70">
다음 편: 오토 익스포저 2단계(여러 PPV와 트랜지션) · 3단계(Exposure Compensation Curve)
</div>

<!--
88′16″ 과제. 원 강의는 디스코드 제출. 본 강의는 블로그 공개용이므로 자기 점검 형태.
-->

---
layout: end
---

# 감사합니다

<div class="text-sm opacity-80 mt-6 text-left max-w-2xl mx-auto">

**참고 자료**

- Unreal Lighting Camp, "언리얼 코어 라이팅 클래스 — 첫 번째 시간" — https://youtu.be/EpC5siHpS_U  
  (본 강의의 구성 순서는 이 영상을 따랐습니다)
- 박성국, "라이팅을 하기 전 프로젝트 세팅하는 법 (디폴트 프로젝트 세팅 12종)" — https://blog.naver.com/sungkuk_park/224061100654
- Epic Games, Unreal Engine 문서: Auto Exposure / Physical Lighting Units
- Wikipedia: Exposure value, Daylight (Illuminance table)
- 지난 편: 레벨 디자인에서의 라이팅 "맛보기" 강의

</div>

<div class="abs-br m-10 text-xs opacity-60">Sungkuk Park · RenderBrains</div>
