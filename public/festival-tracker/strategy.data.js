// 해신 2026-10 ~ 2027-12 전략 경로(critical path) — 손으로 편집하는 파일입니다.
// 근거: docs/strategy/HAESIN_scope_controlled_growth_and_submission_strategy_2026-2027.md (10장 실행 순서, 7장 주력 하나 + 조건부 보조)
// 주력: BitSummit 2027(JP-05). 행사 날짜(focusId + use)만 출품 데이터에서 가져오고, 나머지 날짜는 모두 제안 시점(estimate)이다.
// 노드 필드
//   id, lane, label, kind: 'task'(작업 기간) | 'gate'(결정) | 'event'(행사·제출) | 'milestone'(완료 시점)
//   start, end: 'YYYY-MM-DD'(focusId+use가 있으면 데이터 날짜가 우선)
//   focusId, use: 'event' | 'deadline' — festivals.data.js 날짜 사용
//   estimate: true면 예상·미확정(점선), critical: 주력 경로, branch: 대체 경로(BitSummit Skip 시)
//   after: 선행 노드 id 목록(화살표), note: 설명
window.HAESIN_STRATEGY = {
  source: 'docs/strategy/HAESIN_scope_controlled_growth_and_submission_strategy_2026-2027.md',
  updatedAt: '2026-10-07',
  primary: 'JP-05',
  range: ['2026-10-01', '2027-12-31'],
  principle: '완성할 대상은 줄이고, 그 대상에 요구하는 완성도는 높인다.',
  lanes: [
    { key: 'dev', label: '개발·검증', short: '개발' },
    { key: 'gate', label: '결정 게이트', short: '결정' },
    { key: 'primary', label: '주력 · BitSummit', short: '주력' },
    { key: 'support', label: '보조·검증 행사', short: '행사' },
    { key: 'eval', label: '평가', short: '평가' },
  ],
  nodes: [
    { id: 'build-review', lane: 'dev', kind: 'task', critical: true, estimate: true, start: '2026-10-07', end: '2026-10-19', label: '현재 빌드·관찰 기록 확인', note: '이미 살아 있는 재미와 가장 큰 방해 요소를 구분한다. 테스트·결정 기록 양식을 만든다.' },
    { id: 'nordics', lane: 'support', kind: 'event', critical: true, focusId: 'EU-02', use: 'event', label: 'PGC Nordics 피칭 · 검증 #1', after: ['build-review'], note: '설명 없이 5분 안에 핵심 재미가 전달되는가?' },
    { id: 'scope', lane: 'dev', kind: 'task', critical: true, estimate: true, start: '2026-10-22', end: '2026-11-19', label: '피드백 → 가설 · 작은 게임 범위·완료 기준 · 가용 자원 확인', after: ['nordics'], note: '시작 → 이해 → 핵심 선택 → 결과 → 종료·재시도 흐름에 필요한 것만 남기고 나머지는 보류한다.' },
    { id: 'tigs-gate', lane: 'gate', kind: 'gate', estimate: true, start: '2026-11-10', label: 'TIGS 지원 판단 (일본 출장 2회 가능?)', after: ['nordics'], note: '현장 참석 의무를 이행할 수 없으면 지원하지 않는다.' },
    { id: 'tigs-submit', lane: 'support', kind: 'event', focusId: 'JP-01', use: 'deadline', label: 'TIGS 제출 (조건부)', after: ['tigs-gate'], note: '현재 빌드와 공통 자료로 제출한다.' },
    { id: 'bitsummit-terms', lane: 'gate', kind: 'gate', critical: true, estimate: true, start: '2026-11-20', label: 'BitSummit 요강 확인 (의무·비용·빌드 갱신)', after: ['scope'], note: '공고 확인은 참가 약속이 아니다. 마감·필수 참석·부스료·빌드 갱신 조건을 확인한다.' },
    { id: 'london-gate', lane: 'gate', kind: 'gate', estimate: true, start: '2026-11-30', label: 'London 피칭 판단', after: ['nordics'], note: 'Nordics 이후 바꾼 것이 없거나 1월 출장 여력이 없으면 건너뛴다.' },
    { id: 'design-fix', lane: 'dev', kind: 'task', critical: true, estimate: true, start: '2026-11-21', end: '2027-01-14', label: '디자인 문제 하나 개선 → 자체 재검증', after: ['bitsummit-terms'], note: '기존 규칙의 수치·배치·타이밍·가독성·안내 수정부터 검토한다. 효과가 없으면 폐기한다.' },
    { id: 'go-skip', lane: 'gate', kind: 'gate', critical: true, estimate: true, start: '2027-01-15', label: 'BitSummit Go / Skip', after: ['design-fix'], note: '완료 기준을 채우지 못하면 이번 회차를 건너뛰고 BIC를 주력으로 바꾼다.' },
    { id: 'bitsummit-submit', lane: 'primary', kind: 'event', critical: true, estimate: true, start: '2027-01-20', end: '2027-02-15', label: 'BitSummit 제출 (마감 미발표 · 예상)', after: ['go-skip'], note: '같은 게임·빌드·공통 자료로 제출한다. 행사 전용 버전을 만들지 않는다.' },
    { id: 'complete-flow', lane: 'dev', kind: 'task', critical: true, estimate: true, start: '2027-02-16', end: '2027-04-15', label: '완료 기준 작업 (끝까지 이어지는 흐름)', after: ['bitsummit-submit'], note: '안내·실패 처리·재시작·안정성을 채운다. 콘텐츠 수를 늘리는 작업이 아니다.' },
    { id: 'tigs-show', lane: 'support', kind: 'event', focusId: 'JP-01', use: 'event', label: 'TIGS 전시 · 검증 #2 (조건부)', after: ['tigs-submit'], note: '11월에 개선한 디자인 문제가 관객 앞에서도 해결됐는가?' },
    { id: 'show-build', lane: 'dev', kind: 'task', critical: true, estimate: true, start: '2027-04-16', end: '2027-05-14', label: '전시 빌드 확정 (같은 게임)', after: ['complete-flow'], note: '시작 설정만 조절한다. 데모에서 재미있던 이유가 실제 게임에서도 유지되어야 한다.' },
    { id: 'bitsummit-show', lane: 'primary', kind: 'event', critical: true, focusId: 'JP-05', use: 'event', label: 'BitSummit 전시·어워드 · 검증 #3', after: ['show-build'], note: '반복 플레이에서 플레이어가 의도적으로 다른 선택을 하는가?' },
    { id: 'bic-apply', lane: 'support', kind: 'event', branch: true, estimate: true, start: '2027-04-01', end: '2027-04-30', label: 'BIC 지원 (Skip 시 주력 · 예상)', after: ['go-skip'], note: 'BitSummit을 건너뛰면 주력으로 올린다. 진행 시에는 같은 빌드로 보조 지원 여부만 판단한다.' },
    { id: 'tgs-apply', lane: 'support', kind: 'event', estimate: true, start: '2027-04-30', label: 'TGS SI80 지원 판단 (예상 마감)', after: ['complete-flow'], note: '5일 현장 운영과 자격 요건을 감당할 수 있을 때만 지원한다.' },
    { id: 'polish', lane: 'dev', kind: 'task', critical: true, estimate: true, start: '2027-05-24', end: '2027-07-30', label: '피드백 반영 → 작은 게임 완성', after: ['bitsummit-show'], note: '발언·행동 기록 → 원인 가설 → 작은 변경 → 재검증 → 유지·수정·폐기.' },
    { id: 'complete', lane: 'dev', kind: 'milestone', critical: true, estimate: true, start: '2027-07-31', label: '작은 게임 완성 (완료 기준 통과)', after: ['polish'], note: '시작부터 종료·재시도까지 끊기지 않고, 변경 전후를 같은 빌드로 비교할 수 있다.' },
    { id: 'bic-show', lane: 'support', kind: 'event', branch: true, estimate: true, start: '2027-08-13', end: '2027-08-15', label: 'BIC 전시·어워드 (예상)', after: ['bic-apply'], note: '2026은 08-14~16 개최. 2027 일정 미발표.' },
    { id: 'stabilize', lane: 'dev', kind: 'task', critical: true, estimate: true, start: '2027-08-01', end: '2027-09-30', label: '하반기 검증 반영 · 안정화', after: ['complete'], note: '출시일은 수상 일정이 아니라 완성도와 운영 준비로 판단한다.' },
    { id: 'tgs-show', lane: 'support', kind: 'event', focusId: 'JP-02', use: 'event', label: 'TGS SI80 · SOWN (보조)', after: ['tgs-apply'], note: '디자인 아이디어를 무엇으로 인정받는지 구분해 기록한다.' },
    { id: 'gstar', lane: 'support', kind: 'event', estimate: true, start: '2027-11-18', end: '2027-11-21', label: 'G-STAR (조건부 · 예상)', after: ['stabilize'], note: '4일 운영 인력을 확보할 수 있을 때만.' },
    { id: 'beaver', lane: 'support', kind: 'event', estimate: true, start: '2027-12-17', end: '2027-12-19', label: 'BEAVER ROCKS (검증 · 예상)', after: ['complete'], note: '완성한 흐름이 끝까지 이어지는가? 연말 평가와 충돌하면 건너뛴다.' },
    { id: 'review', lane: 'eval', kind: 'task', critical: true, estimate: true, start: '2027-10-01', end: '2027-12-20', label: '2027 평가: 디자인 성취 · 외부 인정 · 조직 역량', after: ['stabilize'], note: '수상 여부와 게임 성장·조직 역량을 따로 평가한다.' },
  ],
};
