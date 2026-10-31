---
theme: default
title: 레벨 디자이너를 위한 라이팅 2 — UE 5.8.4 프로젝트 세팅
titleTemplate: '%s · RenderBrains'
author: Sungkuk Park (RenderBrains)
info: |
  레벨 디자이너를 위한 라이팅 강의 두 번째 시간 (수업 전 준비).
  언리얼 엔진 5.8.4 새 프로젝트에 라이팅용 디폴트 프로젝트 세팅 12종을 적용합니다.
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
## 수업 전 준비: 언리얼 엔진 5.8.4 디폴트 프로젝트 세팅 12종

<div class="mt-8 text-lg opacity-80">
라이팅을 시작하기 전, 모두가 같은 출발선에 서기 위한 세팅
</div>

<div class="mt-6 text-sm opacity-70">
출처: 박성국, "라이팅을 하기 전 프로젝트 세팅하는 법" (네이버 블로그, 2025-11-01)<br>
https://blog.naver.com/sungkuk_park/224061100654
</div>

<div class="abs-bl m-10 text-sm opacity-70">
발표자: Sungkuk Park (RenderBrains) · 대상: 레벨 디자이너
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
- 다음 강의(EV 노출 세팅) 실습은 이 세팅 위에서 진행한다

<div class="mt-6 p-4 rounded bg-amber-50 border border-amber-300 text-sm">
<b>진행 방법</b> — 새 프로젝트 생성 → <code>Edit &gt; Project Settings</code> → 아래 12개 항목을 순서대로 변경 → 에디터 재시작 요구 시 재시작
</div>

<!--
"왜 이 값인가"를 모른 채 켜는 것은 "1번 켜세요, 3 넣으세요" 식 학습이다.
여기서는 각 항목이 라이팅에 왜 필요한지 한 줄씩 붙여서 본다.
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

# 세팅 10: Auto Exposure 기본값 — EV 강의의 출발점

경로: Engine › Rendering › Default Settings › **Auto Exposure**

| 항목 | 값 | 왜 |
|---|---|---|
| Auto Exposure | ✅ true | 카메라처럼 밝기에 따라 노출이 자동 조절되게 한다 |
| Auto Exposure Method | **Auto Exposure Histogram** | 화면 밝기 분포(히스토그램)로 노출을 결정. EV 강의의 디버그 뷰에서 보게 될 것 |
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
layout: center
class: text-center
---

# 다음: 3. EV(노출) 세팅

<div class="mt-6 text-lg">
<a href="/slides/ue-ev-setup/">레벨 디자이너를 위한 라이팅 3 — 언리얼 엔진 5.8.4 EV(노출) 세팅 →</a>
</div>

<div class="abs-br m-10 text-xs opacity-60">Sungkuk Park · RenderBrains</div>
