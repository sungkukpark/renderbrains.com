// 인디 게임 출품 트래커 — 화면 렌더링과 개인 추적 상태 관리.
// 데이터: window.FESTIVAL_DATA (festivals.data.js), 집중 관리: window.FESTIVAL_FOCUS (focus.data.js), 상태 계산: window.FestivalStatus (status.js)
(function () {
  'use strict';

  const DATA = window.FESTIVAL_DATA;
  const FS = window.FestivalStatus;
  const STORAGE_KEY = 'festival-tracker:v1';
  const TRACK_STATES = [
    ['', '추적 안 함'],
    ['interested', '관심'],
    ['planned', '지원 예정'],
    ['submitted', '제출 완료'],
    ['accepted', '선정'],
    ['rejected', '탈락'],
    ['skipped', '패스'],
  ];
  const TRACK_LABEL = Object.fromEntries(TRACK_STATES);
  const PRICE_LABEL = { free: '무료 표기', paid: '유료', unknown: '비용 미공개' };
  const STAT_DEFS = [
    ['soon', '7일 이내 마감', (s) => s === 'today' || s === 'urgent'],
    ['open', '접수 중(마감 확인)', (s) => s === 'open'],
    ['rolling', '접수 중·마감 미공개', (s) => s === 'rolling'],
    ['upcoming', '접수 예정', (s) => s === 'upcoming'],
    ['focus', '집중 관리', null],
    ['live', '지금 열리는 전시', null],
    ['tracked', '내 추적', null],
  ];

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // DOM 헬퍼: 데이터 문자열은 항상 textContent로만 넣는다.
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
      else if (value === true) el.setAttribute(key, '');
      else el.setAttribute(key, String(value));
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
  }

  if (!DATA || !Array.isArray(DATA.items) || !FS) {
    document.getElementById('view').append(
      h('p', { class: 'empty' }, 'festivals.data.js 를 찾지 못했습니다. node apps/festival-tracker/scripts/build-data.mjs 를 실행하세요.'),
    );
    return;
  }

  const ITEMS = DATA.items;
  const BY_ID = new Map(ITEMS.map((item) => [item.id, item]));
  const FOCUS = (window.FESTIVAL_FOCUS && window.FESTIVAL_FOCUS.items) || {};
  const TIER_RANK = { S: 0, A: 1, mine: 2 };
  // 전략 문서 7장: 주력 하나와 조건부 보조 후보. S는 '우선 검토', A는 자동 출품하지 않는 저비용 후보.
  const ROLE_LABEL = {
    primary: '주력',
    fallback: '대체 주력·보조',
    support: '보조 후보',
    validation: '검증 기회',
    conditional: '조건부',
    skipDefault: '건너뛰기 기본',
    mine: '내 집중',
  };
  const ROLE_RANK = { primary: 0, fallback: 1, validation: 2, support: 3, conditional: 4, mine: 5, skipDefault: 6 };
  const TIER_LABEL = { S: 'S 우선 검토', A: 'A 저비용 후보' };
  const CHECK_DEFS = [
    ['strength', '강점', '해신의 실제 강점을 보여 줄 수 있는가'],
    ['reuse', '재사용', '기존 빌드와 자료를 활용할 수 있는가'],
    ['value', '가치', '확인할 질문이나 얻을 가치가 분명한가'],
    ['obligation', '의무', '선정 후 의무를 감당할 수 있는가'],
    ['feedback', '반영', '피드백을 반영할 여력이 있는가'],
    ['skip', '건너뛰기', '준비가 부족하면 무엇을 할 것인가'],
  ];
  const VERDICT = { ok: ['✓', '충족'], check: ['?', '확인 필요'], risk: ['!', '위험'] };

  // ---------- 저장소 ----------
  function loadTracking() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (parsed && typeof parsed.items === 'object') return parsed;
    } catch (error) {
      console.warn('[festival-tracker] 저장된 추적 상태를 읽지 못했습니다.', error);
    }
    return { version: 1, items: {} };
  }

  let tracking = loadTracking();
  let storageOk = true;

  function saveTracking() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tracking));
      storageOk = true;
    } catch (error) {
      if (storageOk) toast('브라우저 저장소를 쓸 수 없어 이 창을 닫으면 추적 상태가 사라집니다. "추적 내보내기"로 백업하세요.');
      storageOk = false;
    }
  }

  function getTrack(id) {
    return tracking.items[id] || { status: '', starred: false, memo: '', target: '' };
  }

  // focus: 값이 없으면 큐레이션(focus.data.js)을 따르고, true/false면 내가 추가·해제한 것이다.
  function setTrack(id, patch) {
    const next = { ...getTrack(id), ...patch, updatedAt: new Date().toISOString() };
    if (typeof next.focus !== 'boolean') delete next.focus;
    if (!next.status && !next.starred && !next.memo && !next.target && next.focus === undefined) delete tracking.items[id];
    else tracking.items[id] = next;
    saveTracking();
  }

  function isTracked(id) {
    const t = tracking.items[id];
    return Boolean(t && (t.status || t.starred || t.memo || t.target || t.focus === true)) || window.FestivalExpenseUI.has(id);
  }

  // 집중 관리 정보: 큐레이션 항목 또는 내가 추가한 항목. 내가 해제했으면 null.
  function focusInfo(id) {
    const override = getTrack(id).focus;
    if (override === false) return null;
    if (FOCUS[id]) return { ...FOCUS[id], source: 'curated' };
    if (override === true) return { tier: 'mine', role: 'mine', source: 'mine' };
    return null;
  }

  function focusAgenda(item, now) {
    const info = focusInfo(item.id);
    return info ? FS.focusAgenda(item, info, now, getTrack(item.id).status) : null;
  }

  function roleBadge(info) {
    return h('span', { class: `badge role-${info.role || 'mine'}` }, `◆ ${ROLE_LABEL[info.role] || ROLE_LABEL.mine}`);
  }

  function tierBadge(info) {
    return TIER_LABEL[info.tier] ? h('span', { class: 'badge outline', title: '후보 조사 등급 — 참가 의무가 아님' }, TIER_LABEL[info.tier]) : null;
  }

  // ---------- 상태(필터) ----------
  const DEFAULT_STATE = { view: 'upcoming', q: '', cat: '', st: '', price: '', track: '', hide: '1', skip: '1', recheck: '', stat: '', sort: '', dir: 'asc' };
  let state = readHash();

  function readHash() {
    const params = new URLSearchParams(location.hash.slice(1));
    const next = { ...DEFAULT_STATE };
    for (const key of Object.keys(DEFAULT_STATE)) if (params.has(key)) next[key] = params.get(key);
    if (!['upcoming', 'all', 'timeline', 'path', 'mine'].includes(next.view)) next.view = 'upcoming';
    return next;
  }

  function writeHash() {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(state)) if (value !== DEFAULT_STATE[key]) params.set(key, value);
    const hash = params.toString();
    history.replaceState(null, '', hash ? `#${hash}` : location.pathname + location.search);
  }

  function setState(patch) {
    state = { ...state, ...patch };
    writeHash();
    render();
  }

  // ---------- 포맷 ----------
  const fmtLocal = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const fmtClock = new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const fmtBerlin = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Europe/Berlin', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const fmtDate = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

  function shortRange(event) {
    if (!event) return '';
    if (event.precision === 'month') return `${event.start.slice(0, 7)} (세부일 미정)`;
    if (event.start === event.end) return event.start;
    const sameYear = event.start.slice(0, 4) === event.end.slice(0, 4);
    return `${event.start} ~ ${sameYear ? event.end.slice(5) : event.end}`;
  }

  function deadlineText(item) {
    const d = item.deadline;
    if (!d) return '';
    if (d.precision === 'exact') {
      const times = FS.deadlineTimes(item);
      return `마감 베를린 ${d.berlinText} · 내 시간 ${fmtLocal.format(times.dueAt)}`;
    }
    if (d.localTime) return `마감일 ${d.date} ${d.localTime} (현지, 시간대 미표기) · 전날까지 제출 권장`;
    return `마감일 ${d.date} (시각·시간대 미공개) · 전날까지 제출 권장`;
  }

  // ---------- 계산 ----------
  function snapshot(now) {
    const status = new Map();
    const phase = new Map();
    for (const item of ITEMS) {
      status.set(item.id, FS.effectiveStatus(item, now));
      phase.set(item.id, FS.eventPhase(item, now));
    }
    return { now, status, phase };
  }

  function signature(snap) {
    let sig = '';
    for (const item of ITEMS) sig += snap.status.get(item.id)[0] + (snap.phase.get(item.id) || '-')[0];
    return sig;
  }

  function matchesFilters(item, snap, options = {}) {
    const status = snap.status.get(item.id);
    const track = getTrack(item.id);
    if (state.cat && item.categoryKey !== state.cat) return false;
    if (state.st && status !== state.st) return false;
    if (state.price && item.priceTag !== state.price) return false;
    if (state.recheck && !item.needsRecheck) return false;
    if (state.track === '*' && !isTracked(item.id)) return false;
    if (state.track === 'star' && !track.starred) return false;
    if (state.track === 'focus' && !focusInfo(item.id)) return false;
    if (state.track && !['*', 'star', 'focus'].includes(state.track) && track.status !== state.track) return false;
    if (!options.ignoreHide && state.hide && !state.st && (status === 'closed' || status === 'ended')) return false;
    if (state.stat) {
      const def = STAT_DEFS.find(([key]) => key === state.stat);
      if (state.stat === 'live' && snap.phase.get(item.id) !== 'live') return false;
      if (state.stat === 'tracked' && !isTracked(item.id)) return false;
      if (state.stat === 'focus' && !focusInfo(item.id)) return false;
      if (def && def[2] && !def[2](status)) return false;
    }
    if (state.q) {
      const hay = [item.id, item.name, item.region, item.kind, item.category, item.edition, item.statusText, item.summary, item.notes, item.price, track.memo]
        .join(' ')
        .toLowerCase();
      for (const word of state.q.toLowerCase().split(/\s+/).filter(Boolean)) if (!hay.includes(word)) return false;
    }
    return true;
  }

  // 다가오는 마감: 접수 가능한 상태만 보이고, '패스 숨기기'가 켜져 있으면 내가 패스한 항목을 뺀다(내 상태 필터로 '패스'를 고르면 보인다).
  function isUpcomingItem(item, snap) {
    if (!['today', 'urgent', 'open', 'upcoming', 'rolling'].includes(snap.status.get(item.id))) return false;
    if (state.skip && state.track !== 'skipped' && getTrack(item.id).status === 'skipped') return false;
    return true;
  }

  // ---------- 공통 조각 ----------
  function statusBadge(status) {
    return h('span', { class: `badge ${status}` }, FS.STATUS_LABELS[status]);
  }

  function badges(item, snap) {
    const status = snap.status.get(item.id);
    const track = getTrack(item.id);
    const focus = focusInfo(item.id);
    return h(
      'div',
      { class: 'card-badges' },
      focus ? roleBadge(focus) : null,
      focus ? tierBadge(focus) : null,
      statusBadge(status),
      snap.phase.get(item.id) === 'live' ? h('span', { class: 'badge live' }, '전시·방송 진행 중') : null,
      h('span', { class: 'badge outline' }, PRICE_LABEL[item.priceTag]),
      item.needsRecheck ? h('span', { class: 'badge outline', title: '보조자료 기반이거나 원문 재확인이 필요한 항목' }, '재확인 필요') : null,
      track.status ? h('span', { class: 'badge track' }, TRACK_LABEL[track.status]) : null,
    );
  }

  function starButton(item) {
    const starred = getTrack(item.id).starred;
    return h(
      'button',
      {
        type: 'button',
        class: 'star',
        'aria-pressed': String(Boolean(starred)),
        'aria-label': starred ? '별표 해제' : '별표',
        title: starred ? '별표 해제' : '별표',
        onclick: (event) => {
          event.stopPropagation();
          setTrack(item.id, { starred: !getTrack(item.id).starred });
          render();
        },
      },
      '★',
    );
  }

  function countdown(item, snap) {
    const times = FS.deadlineTimes(item);
    if (!times || snap.now >= times.passAt) return null;
    const status = snap.status.get(item.id);
    if (status === 'closed') return null;
    return h(
      'div',
      { class: 'countdown' },
      h('span', { class: 'dday' }, FS.dLabel(item, snap.now)),
      h('span', { class: 'ticker', dataset: { due: String(times.dueAt), exact: times.exact ? '1' : '' } }, tickerText(times.dueAt, times.exact, snap.now)),
    );
  }

  function tickerText(dueAt, exact, now) {
    const left = dueAt - now;
    if (left >= 0) return `${exact ? '마감까지' : '권장 목표(전날 자정)까지'} ${FS.formatCountdown(left)}`;
    return '오늘이 마감일 — 시각 미공개, 즉시 제출';
  }

  // 집중 관리 섹션의 카드 상단 줄: 지금 기다리는 일정과 다음 행동.
  function focusLine(item, snap, agenda) {
    const info = focusInfo(item.id);
    let label = '';
    if (agenda.kind === 'event') {
      const diff = FS.dayDiff(agenda.at, snap.now);
      label = `${info.eventLabel || '전시·피칭'} · ${agenda.live ? '진행 중' : diff === 0 ? 'D-DAY' : `D-${diff}`}`;
    } else if (agenda.kind === 'deadline') label = `제출 마감 ${FS.dLabel(item, snap.now)}`;
    else if (agenda.kind === 'rolling') label = '접수 중 · 마감 미공개 — 일찍 제출';
    else if (agenda.kind === 'next') {
      label = info.watchFrom ? (agenda.due ? `지금 공고 확인 (${info.watchFrom}~)` : `${info.watchFrom}부터 공고 확인`) : '차기 공고 확인';
    }
    return h(
      'div',
      { class: `focus-line k-${agenda.kind}${agenda.due ? ' due' : ''}` },
      h('strong', {}, label),
      agenda.kind === 'next' && info.expect ? h('span', {}, info.expect) : null,
      info.next ? h('span', {}, `다음 행동: ${info.next}`) : null,
    );
  }

  function card(item, snap, agenda = null) {
    const status = snap.status.get(item.id);
    const track = getTrack(item.id);
    const cd = countdown(item, snap);
    return h(
      'article',
      {
        class: `card s-${status}${focusInfo(item.id) ? ' focus' : ''}`,
        tabindex: '0',
        dataset: { id: item.id },
        onclick: () => openDetail(item.id),
        onkeydown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openDetail(item.id);
          }
        },
      },
      h('div', { class: 'card-head' }, h('h3', { class: 'card-title' }, item.name), starButton(item)),
      h('div', { class: 'card-meta' }, h('span', { class: 'card-id' }, item.id), ` · ${item.region}${item.kind ? ` · ${item.kind}` : ''}`),
      badges(item, snap),
      agenda ? focusLine(item, snap, agenda) : null,
      cd,
      cd ? h('div', { class: 'when muted' }, deadlineText(item)) : h('div', { class: 'when muted' }, item.statusDetail.split('\n')[0] || item.statusText),
      item.event ? h('div', { class: 'when' }, `전시·방송 ${shortRange(item.event)}`) : h('div', { class: 'when muted' }, `전시·방송 ${item.eventText.split(';')[0]}`),
      track.memo ? h('div', { class: 'when muted' }, `메모: ${track.memo}`) : null,
      focusWhy(item),
    );
  }

  // 집중 항목 카드 하단: 전략적 추천 근거(focus.data.js의 why).
  function focusWhy(item) {
    const info = focusInfo(item.id);
    if (!info || !info.why) return null;
    return h(
      'div',
      { class: 'focus-why' },
      h('strong', {}, '추천 근거'),
      h('p', {}, info.why),
      info.checks ? checkChips(info.checks) : null,
      info.question ? h('p', { class: 'focus-question' }, h('strong', {}, '검증 질문 '), info.question) : null,
    );
  }

  // 전략 문서 7장 출품 판단 기준 6개를 칩으로 보여 준다(마우스를 올리면 판단 메모).
  function checkChips(checks) {
    return h(
      'div',
      { class: 'check-chips', 'aria-label': '출품 판단 기준' },
      CHECK_DEFS.map(([key, label, question]) => {
        const c = checks[key];
        if (!c) return null;
        const [mark, word] = VERDICT[c.v];
        return h('span', { class: `chip v-${c.v}`, title: `${question} — ${word}: ${c.note}` }, `${mark} ${label}`);
      }),
    );
  }

  function emptyState(text) {
    return h('p', { class: 'empty' }, text);
  }

  // ---------- 보기: 다가오는 마감 ----------
  function viewUpcoming(snap) {
    const list = ITEMS.filter((item) => matchesFilters(item, snap, { ignoreHide: true }) && isUpcomingItem(item, snap)).sort((a, b) => FS.compareItems(a, b, snap.now));
    const focusSection = viewFocus(snap);

    if (list.length === 0) return [focusSection, emptyState('조건에 맞는 다가오는 마감이 없습니다. 필터를 바꾸거나 전체 목록을 확인하세요.')].filter(Boolean);

    const groups = new Map();
    const push = (key, item) => {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    };
    for (const item of list) {
      const status = snap.status.get(item.id);
      if (status === 'today' || status === 'urgent') push('7일 이내 마감', item);
      else if (status === 'rolling') push('접수 중 · 마감일 미공개(선착순·상시·문의)', item);
      else {
        const due = FS.deadlineTimes(item).dueAt;
        const d = new Date(due);
        push(`${d.getFullYear()}년 ${d.getMonth() + 1}월 마감`, item);
      }
    }
    // 월 그룹은 날짜순, 마감 미공개 그룹은 맨 뒤.
    const order = [...groups.keys()].sort((a, b) => groupRank(a) - groupRank(b) || a.localeCompare(b, 'ko', { numeric: true }));
    return [
      focusSection,
      ...order.map((key) =>
        h('section', { class: 'group' }, h('h2', {}, `${key} · ${groups.get(key).length}`), h('div', { class: 'cards' }, groups.get(key).map((item) => card(item, snap)))),
      ),
    ].filter(Boolean);
  }

  // 집중 관리: 접수 상태와 관계없이(공고 전·선정 후 포함) 맨 위에 고정한다. 이번 회차가 끝났거나 패스·탈락으로 둔 항목은 뺀다.
  function focusEntries(snap) {
    const rows = [];
    for (const item of ITEMS) {
      const agenda = focusAgenda(item, snap.now);
      if (!agenda || agenda.kind === 'done') continue;
      const trackStatus = getTrack(item.id).status;
      if ((trackStatus === 'skipped' || trackStatus === 'rejected') && state.track !== trackStatus) continue;
      if (!matchesFilters(item, snap, { ignoreHide: true })) continue;
      const info = focusInfo(item.id);
      rows.push({ item, agenda, tier: info.tier, role: info.role || 'mine' });
    }
    // 주력 → 대체 주력을 먼저 두고, 나머지는 날짜가 정해진 일정(마감·행사) → 마감 미공개 접수 → 공고 대기(확인 시작 월 순), 같은 시점이면 S가 먼저.
    const kindRank = (agenda) => (agenda.kind === 'next' ? 2 : agenda.kind === 'rolling' ? 1 : 0);
    const pinRank = (row) => (row.role === 'primary' ? 0 : row.role === 'fallback' ? 1 : 2);
    return rows.sort(
      (a, b) =>
        pinRank(a) - pinRank(b) ||
        kindRank(a.agenda) - kindRank(b.agenda) ||
        (a.agenda.at ?? Infinity) - (b.agenda.at ?? Infinity) ||
        TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
        a.item.id.localeCompare(b.item.id),
    );
  }

  function viewFocus(snap) {
    const rows = focusEntries(snap);
    if (rows.length === 0) return null;
    return h(
      'section',
      { class: 'group focus' },
      h('h2', {}, `◆ 집중 관리 · ${rows.length}`, h('span', { class: 'muted' }, ' — 접수 전·선정 후 일정까지 함께 표시')),
      h('div', { class: 'cards' }, rows.map(({ item, agenda }) => card(item, snap, agenda))),
    );
  }

  function groupRank(key) {
    if (key.startsWith('7일')) return 0;
    if (key.startsWith('접수 중')) return 2;
    return 1;
  }

  // ---------- 보기: 전체 목록 ----------
  const COLUMNS = [
    ['id', 'ID', (item) => item.id],
    ['name', '행사', (item) => item.name],
    ['category', '구분', (item) => item.category],
    ['status', '상태', null],
    ['deadline', '제출 마감', (item) => item.deadline?.date ?? '9999'],
    ['left', '남은 시간', null],
    ['event', '전시·방송', (item) => item.event?.start ?? '9999'],
    ['price', '비용', (item) => item.priceTag],
    ['track', '내 상태', (item) => getTrack(item.id).status || 'zzz'],
  ];

  function viewAll(snap) {
    const list = ITEMS.filter((item) => matchesFilters(item, snap));
    const col = COLUMNS.find(([key]) => key === state.sort);
    if (col && col[2]) {
      const dir = state.dir === 'desc' ? -1 : 1;
      list.sort((a, b) => String(col[2](a)).localeCompare(String(col[2](b)), 'ko', { numeric: true }) * dir || a.id.localeCompare(b.id));
    } else {
      list.sort((a, b) => FS.compareItems(a, b, snap.now));
      if (state.sort && state.dir === 'desc') list.reverse();
    }
    if (list.length === 0) return [emptyState('조건에 맞는 항목이 없습니다.')];

    const head = h(
      'tr',
      {},
      COLUMNS.map(([key, label]) =>
        h(
          'th',
          {
            scope: 'col',
            'aria-sort': state.sort === key ? (state.dir === 'desc' ? 'descending' : 'ascending') : null,
            onclick: () => setState({ sort: key, dir: state.sort === key && state.dir === 'asc' ? 'desc' : 'asc' }),
          },
          label,
        ),
      ),
    );
    const rows = list.map((item) => {
      const status = snap.status.get(item.id);
      const times = FS.deadlineTimes(item);
      const live = times && snap.now < times.passAt && status !== 'closed';
      const track = getTrack(item.id);
      return h(
        'tr',
        {
          tabindex: '0',
          onclick: () => openDetail(item.id),
          onkeydown: (event) => {
            if (event.key === 'Enter') openDetail(item.id);
          },
        },
        h('td', { class: 'mono' }, focusInfo(item.id) ? h('span', { class: 'focus-mark', title: '집중 관리' }, '◆ ') : null, item.id),
        h('td', {}, h('div', { class: 'clip' }, item.name), h('div', { class: 'muted clip' }, item.region)),
        h('td', {}, item.category),
        h('td', {}, statusBadge(status), snap.phase.get(item.id) === 'live' ? h('div', {}, h('span', { class: 'badge live' }, '진행 중')) : null),
        h('td', { class: 'mono' }, item.deadline ? (item.deadline.precision === 'exact' ? item.deadline.berlinText : item.deadline.date) : '—'),
        h('td', { class: 'mono' }, live ? h('span', { dataset: { due: String(times.dueAt), exact: times.exact ? '1' : '', compact: '1' } }, compactLeft(times.dueAt, snap.now)) : '—'),
        h('td', { class: 'mono' }, item.event ? shortRange(item.event) : '—'),
        h('td', { class: 'nowrap' }, PRICE_LABEL[item.priceTag]),
        h('td', { class: 'nowrap' }, track.starred ? '★ ' : '', track.status ? TRACK_LABEL[track.status] : ''),
      );
    });
    return [h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, head), h('tbody', {}, rows)))];
  }

  function compactLeft(dueAt, now) {
    const left = dueAt - now;
    if (left < 0) return '오늘 마감';
    const days = Math.floor(left / FS.DAY);
    const hours = Math.floor((left % FS.DAY) / 3600000);
    const minutes = Math.floor((left % 3600000) / 60000);
    return days > 0 ? `${days}일 ${hours}시간` : `${hours}시간 ${minutes}분`;
  }

  // ---------- 보기: 타임라인 ----------
  function viewTimeline(snap) {
    const list = ITEMS.filter((item) => matchesFilters(item, snap) && (item.deadline || item.event));
    const nowDate = new Date(snap.now);
    const rangeStart = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1).getTime();
    const rangeEnd = new Date(2028, 0, 1).getTime();
    const span = rangeEnd - rangeStart;
    const pct = (ms) => `${(((Math.min(Math.max(ms, rangeStart), rangeEnd) - rangeStart) / span) * 100).toFixed(3)}%`;
    const inRange = (ms) => ms >= rangeStart && ms <= rangeEnd;

    const rows = list
      .map((item) => {
        const dl = FS.deadlineTimes(item);
        const ev = FS.eventTimes(item);
        const first = Math.min(dl && inRange(dl.dueAt) ? dl.dueAt : Infinity, ev && ev.endAt > rangeStart ? Math.max(ev.startAt, rangeStart) : Infinity);
        return { item, dl, ev, first };
      })
      .filter((row) => Number.isFinite(row.first))
      .sort((a, b) => a.first - b.first || a.item.id.localeCompare(b.item.id));

    if (rows.length === 0) return [emptyState('표시할 날짜가 있는 항목이 없습니다.')];

    const months = [];
    for (let d = new Date(rangeStart); d.getTime() < rangeEnd; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(d);
    const monthEls = months.map((d) =>
      h('div', { class: 'tl-month', style: `left:${pct(d.getTime())}` }, d.getMonth() === 0 || d.getTime() === rangeStart ? `${d.getFullYear()}.${d.getMonth() + 1}` : `${d.getMonth() + 1}월`),
    );
    const gridEls = () => months.map((d) => h('div', { class: 'tl-grid', style: `left:${pct(d.getTime())}` }));
    const nowLine = () => h('div', { class: 'tl-now', style: `left:${pct(snap.now)}`, title: '지금' });

    const rowEls = rows.map(({ item, dl, ev }) => {
      const status = snap.status.get(item.id);
      const track = h('div', { class: 'tl-track' }, gridEls(), nowLine());
      if (ev && ev.endAt > rangeStart && ev.startAt < rangeEnd) {
        const left = pct(ev.startAt);
        const width = `calc(${pct(ev.endAt)} - ${left})`;
        track.append(h('div', { class: `tl-bar${ev.precision === 'month' ? ' month' : ''}`, style: `left:${left};width:${width}`, title: `전시·방송 ${shortRange(item.event)}` }));
      }
      if (dl && inRange(dl.dueAt)) {
        track.append(h('div', { class: `tl-dl ${status}`, style: `left:${pct(dl.dueAt)}`, title: `${FS.STATUS_LABELS[status]} · ${deadlineText(item)}` }));
      }
      return h(
        'div',
        { class: 'tl-row', onclick: () => openDetail(item.id), title: item.name },
        h('div', { class: 'tl-label' }, focusInfo(item.id) ? h('span', { class: 'focus-mark', title: '집중 관리' }, '◆ ') : null, h('span', { class: 'card-id' }, item.id), ' ', getTrack(item.id).starred ? '★ ' : '', item.name),
        track,
      );
    });

    return [
      h(
        'div',
        { class: 'timeline' },
        h(
          'div',
          { class: 'tl-legend' },
          h('span', {}, h('i', { class: 'lg-dl' }), '제출 마감(색 = 상태)'),
          h('span', {}, h('i', { class: 'lg-bar' }), '전시·방송 기간(흐림 = 월만 공개)'),
          h('span', {}, h('i', { class: 'lg-now' }), '지금'),
          h('span', {}, `${rows.length}개 항목`),
        ),
        h('div', { class: 'tl-inner' }, h('div', { class: 'tl-head' }, h('div', { class: 'tl-label muted' }, '행사'), h('div', { class: 'tl-months' }, monthEls)), rowEls),
      ),
    ];
  }

  // ---------- 보기: 전략 경로(critical path) ----------
  const STRATEGY = window.HAESIN_STRATEGY || null;
  const PATH_ROW = 30;
  const PATH_LANE = 26;
  const KIND_LABEL = { task: '작업', gate: '결정', event: '행사·제출', milestone: '완료' };
  const LANE_LABEL = STRATEGY ? Object.fromEntries(STRATEGY.lanes.map((lane) => [lane.key, lane.short || lane.label])) : {};

  // focusId + use가 있으면 출품 데이터의 날짜를 쓰고, 없으면 노드에 적은 제안 날짜를 쓴다.
  function resolveNode(node) {
    const item = node.focusId ? BY_ID.get(node.focusId) : null;
    let start = node.start;
    let end = node.end || node.start;
    let fromData = false;
    if (item && node.use === 'event' && item.event) {
      ({ start, end } = item.event);
      fromData = true;
    } else if (item && node.use === 'deadline' && item.deadline) {
      start = end = item.deadline.date;
      fromData = true;
    }
    return { ...node, startAt: FS.localDate(start), endAt: FS.localDate(end, 0, 0, 1), startText: start, endText: end, estimate: fromData ? false : Boolean(node.estimate) };
  }

  function pathNodes() {
    return STRATEGY ? STRATEGY.nodes.map(resolveNode) : [];
  }

  function pathPhase(node, now) {
    if (now >= node.endAt) return 'done';
    if (now >= node.startAt) return 'now';
    return 'next';
  }

  function nodeDateText(node) {
    return node.startText === node.endText ? node.startText : `${node.startText} ~ ${node.endText.slice(node.startText.slice(0, 4) === node.endText.slice(0, 4) ? 5 : 0)}`;
  }

  function viewPath(snap) {
    if (!STRATEGY) return [emptyState('strategy.data.js 를 찾지 못했습니다.')];
    const nodes = pathNodes();
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const rangeStart = FS.localDate(STRATEGY.range[0]);
    const rangeEnd = FS.localDate(STRATEGY.range[1], 0, 0, 1);
    const span = rangeEnd - rangeStart;
    const frac = (ms) => (Math.min(Math.max(ms, rangeStart), rangeEnd) - rangeStart) / span;
    const pct = (ms) => `${(frac(ms) * 100).toFixed(3)}%`;

    const months = [];
    for (let d = new Date(rangeStart); d.getTime() < rangeEnd; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(d);
    const monthEls = months.map((d) =>
      h('div', { class: 'tl-month', style: `left:${pct(d.getTime())}` }, d.getMonth() === 0 || d.getTime() === rangeStart ? `${d.getFullYear()}.${d.getMonth() + 1}` : `${d.getMonth() + 1}월`),
    );
    const gridEls = () => months.map((d) => h('div', { class: 'tl-grid', style: `left:${pct(d.getTime())}` }));

    // 주력 경로를 시작일 순 계단으로 먼저 두고, 보조·조건부와 Skip 대체 경로를 아래에 묶는다. y 좌표는 화살표 계산에 쓴다.
    const groups = [
      ['주력 경로 · BitSummit', nodes.filter((node) => node.critical)],
      ['보조·조건부 행사와 결정', nodes.filter((node) => !node.critical && !node.branch)],
      ['Skip 시 대체 경로 · BIC', nodes.filter((node) => node.branch)],
    ];
    const rows = [];
    const yOf = new Map();
    let y = 0;
    for (const [title, groupNodes] of groups) {
      if (groupNodes.length === 0) continue;
      groupNodes.sort((a, b) => a.startAt - b.startAt || a.endAt - b.endAt);
      rows.push(h('div', { class: 'path-lane' }, h('div', { class: 'tl-label' }, title), h('div', { class: 'tl-track' }, gridEls())));
      y += PATH_LANE;
      for (const node of groupNodes) {
        yOf.set(node.id, y + PATH_ROW / 2);
        rows.push(pathRow(node, snap, pct, gridEls));
        y += PATH_ROW;
      }
    }

    // 화살표: 선행 노드 끝 → 후행 노드 시작. 주력 경로는 실선, 그 밖은 점선.
    const W = 1000;
    const edges = [];
    for (const node of nodes) {
      for (const prevId of node.after || []) {
        const prev = byId.get(prevId);
        if (!prev) continue;
        const x1 = frac(prev.kind === 'gate' || prev.kind === 'milestone' ? prev.startAt : prev.endAt) * W;
        const x2 = frac(node.startAt) * W;
        const y1 = yOf.get(prev.id);
        const y2 = yOf.get(node.id);
        const xm = Math.max(x1, Math.min(x2, x1 + 6));
        const critical = prev.critical && node.critical;
        edges.push(
          svgEl('path', {
            d: `M${x1.toFixed(1)} ${y1} H${xm.toFixed(1)} V${y2} H${Math.max(x2, xm).toFixed(1)}`,
            class: `path-edge${critical ? ' critical' : ''}${node.branch ? ' branch' : ''}`,
            'marker-end': `url(#arrow-${critical ? 'c' : 'n'})`,
          }),
        );
      }
    }
    const svg = svgEl(
      'svg',
      { class: 'path-edges', viewBox: `0 0 ${W} ${y}`, preserveAspectRatio: 'none', style: `height:${y}px`, 'aria-hidden': 'true' },
      svgEl(
        'defs',
        {},
        ['c', 'n'].map((k) =>
          svgEl('marker', { id: `arrow-${k}`, viewBox: '0 0 6 6', refX: '5', refY: '3', markerWidth: '6', markerHeight: '6', markerUnits: 'userSpaceOnUse', orient: 'auto' }, svgEl('path', { d: 'M0 0 L6 3 L0 6 z', class: `path-arrow ${k}` })),
        ),
      ),
      edges,
    );

    const primary = BY_ID.get(STRATEGY.primary);
    return [
      h(
        'section',
        { class: 'path-intro' },
        h('p', { class: 'path-principle' }, `“${STRATEGY.principle}”`),
        h(
          'p',
          { class: 'muted' },
          '주력 ',
          h('strong', {}, primary ? primary.name : STRATEGY.primary),
          ' 하나를 중심으로, 같은 빌드로 대응할 수 있는 보조 후보만 둡니다. 행사 날짜(실선 테두리)만 출품 데이터에서 오고, 점선 테두리는 제안 시점·예상 일정입니다. 준비가 부족하면 회차를 건너뜁니다. 근거: ',
          h('code', {}, STRATEGY.source.split('/').pop()),
        ),
        h(
          'div',
          { class: 'tl-legend' },
          h('span', {}, h('i', { class: 'lg-path critical' }), '주력 경로'),
          h('span', {}, h('i', { class: 'lg-path' }), '보조·조건부'),
          h('span', {}, h('i', { class: 'lg-path branch' }), 'Skip 시 대체 경로(BIC)'),
          h('span', {}, h('i', { class: 'lg-gate' }), '결정 게이트'),
          h('span', {}, h('i', { class: 'lg-now' }), '지금'),
        ),
      ),
      h(
        'div',
        { class: 'timeline path' },
        h(
          'div',
          { class: 'tl-inner' },
          h('div', { class: 'tl-head' }, h('div', { class: 'tl-label muted' }, '단계'), h('div', { class: 'tl-months' }, monthEls)),
          h('div', { class: 'path-body' }, rows, h('div', { class: 'path-overlay' }, svg, h('div', { class: 'tl-now', style: `left:${pct(snap.now)}`, title: '지금' }))),
        ),
      ),
      pathSteps(nodes.filter((node) => node.critical).sort((a, b) => a.startAt - b.startAt), snap),
    ];
  }

  function pathRow(node, snap, pct, gridEls) {
    const phase = pathPhase(node, snap.now);
    const cls = ['path-node', node.kind, node.critical ? 'critical' : '', node.branch ? 'branch' : '', node.estimate ? 'estimate' : '', phase].filter(Boolean).join(' ');
    const title = `${KIND_LABEL[node.kind]} · ${nodeDateText(node)}${node.estimate ? ' (예상·미확정)' : ''}\n${node.note || ''}`;
    const mark =
      node.kind === 'gate' || node.kind === 'milestone'
        ? h('div', { class: cls, style: `left:${pct(node.startAt)}`, title })
        : h('div', { class: cls, style: `left:${pct(node.startAt)};width:calc(${pct(node.endAt)} - ${pct(node.startAt)})`, title });
    const open = node.focusId ? () => openDetail(node.focusId) : null;
    return h(
      'div',
      { class: `tl-row path-row${node.critical ? ' critical' : ''}${open ? '' : ' static'}`, onclick: open, title },
      h('div', { class: 'tl-label' }, h('span', { class: `lane-tag l-${node.lane}` }, LANE_LABEL[node.lane] || node.lane), node.focusId ? h('span', { class: 'card-id' }, `${node.focusId} `) : null, node.label),
      h('div', { class: 'tl-track' }, gridEls(), mark),
    );
  }

  // 차트 아래 단계 목록: 좁은 화면과 보조 기술용, 주력 경로만 순서대로.
  function pathSteps(nodes, snap) {
    const phaseLabel = { done: '완료 시점 지남', now: '진행 중', next: '예정' };
    return h(
      'section',
      { class: 'path-steps' },
      h('h2', {}, `주력 경로 단계 · ${nodes.length}`),
      h(
        'ol',
        {},
        nodes.map((node) => {
          const phase = pathPhase(node, snap.now);
          return h(
            'li',
            { class: `step ${phase} ${node.kind}` },
            h('div', { class: 'step-head' }, h('span', { class: 'mono' }, nodeDateText(node)), h('span', { class: `badge ${phase === 'now' ? 'open' : 'outline'}` }, phaseLabel[phase]), h('span', { class: 'badge outline' }, KIND_LABEL[node.kind]), node.estimate ? h('span', { class: 'muted' }, '예상·미확정') : null),
            h('strong', {}, node.focusId ? h('a', { href: '#', onclick: (event) => { event.preventDefault(); openDetail(node.focusId); } }, node.label) : node.label),
            node.note ? h('p', { class: 'muted' }, node.note) : null,
          );
        }),
      ),
    );
  }

  function svgEl(tag, attrs, ...children) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs || {})) if (value !== null && value !== undefined) el.setAttribute(key, String(value));
    for (const child of children.flat()) if (child) el.append(child);
    return el;
  }

  // ---------- 보기: 내 추적 ----------
  function viewMine(snap) {
    const list = ITEMS.filter((item) => isTracked(item.id) && matchesFilters(item, snap, { ignoreHide: true })).sort((a, b) => FS.compareItems(a, b, snap.now));
    if (list.length === 0) {
      return [emptyState('아직 추적 중인 행사가 없습니다. 카드의 ★ 또는 상세 화면에서 상태를 지정하면 여기에 모입니다.')];
    }
    const columns = [['', '별표·메모만'], ...TRACK_STATES.slice(1)];
    return [
      h(
        'div',
        { class: 'board' },
        columns.map(([key, label]) => {
          const items = list.filter((item) => (getTrack(item.id).status || '') === key);
          if (items.length === 0) return null;
          return h('section', { class: 'column' }, h('h2', {}, h('span', {}, label), h('span', { class: 'muted' }, String(items.length))), h('div', { class: 'cards' }, items.map((item) => card(item, snap))));
        }),
      ),
    ];
  }

  // ---------- 상세 ----------
  let detailId = null;

  function openDetail(id) {
    detailId = id;
    renderDetail();
    const dialog = $('#detail');
    if (!dialog.open) dialog.showModal();
  }

  function renderDetail() {
    const item = BY_ID.get(detailId);
    if (!item) return;
    const now = Date.now();
    const snap = snapshot(now);
    const track = getTrack(item.id);
    const body = $('#detail-body');
    body.replaceChildren(
      h('div', { class: 'card-meta' }, h('span', { class: 'card-id' }, item.id), ` · ${item.category}`),
      h('h2', { id: 'detail-title' }, item.name),
      h('div', { class: 'card-meta' }, `${item.region} · ${item.kind}${item.edition ? ` · 회차 ${item.edition}` : ''}`),
      h('div', { style: 'margin-top:8px' }, badges(item, snap)),
      countdown(item, snap),
      h(
        'dl',
        { class: 'detail-grid' },
        h('dt', {}, '모집 상태(문서)'),
        h('dd', {}, item.statusText),
        h('dt', {}, '제출 마감'),
        h('dd', {}, [item.deadline ? deadlineText(item) : null, item.statusDetail].filter(Boolean).join('\n')),
        h('dt', {}, '전시·방송·시상'),
        h('dd', {}, item.eventText),
        h('dt', {}, '가격·필수 비용'),
        h('dd', {}, item.price),
        h('dt', {}, '특징'),
        h('dd', {}, item.summary),
        h('dt', {}, '자격·확인 메모'),
        h('dd', {}, item.notes),
        h('dt', {}, '링크'),
        h(
          'dd',
          { class: 'links' },
          item.links.map((link) => h('a', { href: link.url, target: '_blank', rel: 'noopener noreferrer' }, `${link.label} ↗`)),
          item.linkNote ? h('span', { class: 'muted' }, item.linkNote) : null,
        ),
      ),
      focusBox(item),
      window.FestivalExpenseUI.box(item, h, toast),
      h(
        'div',
        { class: 'track-box' },
        h('strong', {}, '내 추적'),
        h(
          'div',
          { class: 'track-row' },
          h(
            'select',
            {
              'aria-label': '내 상태',
              onchange: (event) => {
                setTrack(item.id, { status: event.target.value });
                renderDetail();
                render();
              },
            },
            TRACK_STATES.map(([value, label]) => h('option', { value, selected: value === track.status }, label)),
          ),
          h(
            'label',
            { class: 'check' },
            h('input', {
              type: 'checkbox',
              checked: Boolean(track.starred),
              onchange: (event) => {
                setTrack(item.id, { starred: event.target.checked });
                render();
              },
            }),
            '별표',
          ),
          h(
            'label',
            { class: 'check' },
            '내부 목표일',
            h('input', {
              type: 'date',
              value: track.target || '',
              onchange: (event) => {
                setTrack(item.id, { target: event.target.value });
                render();
              },
            }),
          ),
        ),
        h(
          'textarea',
          {
            placeholder: '준비물, 담당, 제출 링크 등 메모',
            'aria-label': '메모',
            oninput: debounce((event) => {
              setTrack(item.id, { memo: event.target.value });
              render();
            }, 400),
          },
          track.memo || '',
        ),
        track.updatedAt ? h('span', { class: 'muted', style: 'font-size:12px' }, `마지막 수정 ${fmtLocal.format(new Date(track.updatedAt))}`) : null,
      ),
    );
  }

  // 상세의 집중 관리 상자: 선정 이유·다음 행동과 개인 추가·해제 토글.
  function focusBox(item) {
    const info = focusInfo(item.id);
    const curated = FOCUS[item.id];
    return h(
      'div',
      { class: `track-box focus-box${info ? ' on' : ''}` },
      h(
        'label',
        { class: 'check' },
        h('input', {
          type: 'checkbox',
          checked: Boolean(info),
          onchange: (event) => {
            // 큐레이션 기본값과 같아지면 개인 설정을 지운다.
            const on = event.target.checked;
            setTrack(item.id, { focus: on === Boolean(curated) ? undefined : on });
            renderDetail();
            render();
          },
        }),
        h('strong', {}, '◆ 집중 관리'),
        info ? roleBadge(info) : null,
        info ? tierBadge(info) : null,
      ),
      curated && !info ? h('span', { class: 'muted' }, '추천 목록에 있지만 내가 해제한 항목입니다.') : null,
      info && info.source === 'curated'
        ? h(
            'dl',
            { class: 'detail-grid' },
            h('dt', {}, '추천 근거'),
            h('dd', {}, info.why || ''),
            info.expect ? h('dt', {}, '예상 일정') : null,
            info.expect ? h('dd', {}, info.expect) : null,
            info.watchFrom ? h('dt', {}, '공고 확인 시작') : null,
            info.watchFrom ? h('dd', {}, info.watchFrom) : null,
            info.question ? h('dt', {}, '검증 질문') : null,
            info.question ? h('dd', {}, info.question) : null,
            h('dt', {}, '다음 행동'),
            h('dd', {}, info.next || ''),
          )
        : null,
      info && info.checks ? checkTable(info.checks) : null,
      !curated ? h('span', { class: 'muted' }, '체크하면 추천 목록 밖의 항목도 "다가오는 마감" 맨 위 집중 관리 섹션에 고정합니다.') : null,
    );
  }

  function checkTable(checks) {
    return h(
      'table',
      { class: 'check-table' },
      h('caption', {}, '출품 판단 기준 (전략 문서 7장 · 초안, 팀 검토 필요)'),
      h('tbody', {}, CHECK_DEFS.map(([key, , question]) => {
        const c = checks[key];
        if (!c) return null;
        return h('tr', {}, h('th', { scope: 'row' }, question), h('td', {}, h('span', { class: `chip v-${c.v}` }, `${VERDICT[c.v][0]} ${VERDICT[c.v][1]}`)), h('td', {}, c.note));
      })),
    );
  }

  function debounce(fn, wait) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  // ---------- 상단·요약 ----------
  function renderStamp(now) {
    const survey = DATA.surveyDate;
    const age = survey ? FS.dayDiff(now, FS.localDate(survey)) : null;
    const stamp = $('#data-stamp');
    stamp.replaceChildren(
      `${ITEMS.length}개 출품 경로 · 조사 기준일 ${survey ?? '미상'}`,
      age !== null ? (age > 14 ? h('span', { class: 'stale' }, ` (${age}일 경과 — 공식 공고 재확인 권장)`) : ` (${age}일 경과)`) : '',
      ' · 원본 ',
      h('code', {}, DATA.sourceFile.split('/').pop()),
    );
  }

  function renderStats(snap) {
    const counts = {};
    for (const [key, , test] of STAT_DEFS) {
      counts[key] = ITEMS.filter((item) => {
        if (key === 'live') return snap.phase.get(item.id) === 'live';
        if (key === 'tracked') return isTracked(item.id);
        if (key === 'focus') return Boolean(focusInfo(item.id));
        return test(snap.status.get(item.id));
      }).length;
    }
    $('#stats').replaceChildren(
      ...STAT_DEFS.map(([key, label]) =>
        h(
          'button',
          {
            type: 'button',
            class: 'stat',
            'aria-pressed': String(state.stat === key),
            onclick: () => setState({ stat: state.stat === key ? '' : key, view: key === 'tracked' ? 'mine' : state.view === 'mine' ? 'all' : state.view }),
          },
          h('strong', {}, String(counts[key])),
          h('span', {}, label),
        ),
      ),
    );
  }

  function syncControls() {
    $('#f-query').value = state.q;
    $('#f-category').value = state.cat;
    $('#f-status').value = state.st;
    $('#f-price').value = state.price;
    $('#f-track').value = state.track;
    $('#f-hide-closed').checked = Boolean(state.hide);
    $('#f-recheck').checked = Boolean(state.recheck);
    $('#f-hide-skipped').checked = Boolean(state.skip);
    $('#f-hide-skipped').closest('label').hidden = state.view !== 'upcoming';
    // 전략 경로는 필터·내보내기 대상이 아니다.
    $('.filters').hidden = state.view === 'path';
    $('#btn-ics').hidden = IN_ARTIFACT || state.view === 'path';
    for (const tab of $$('.tabs [role="tab"]')) tab.setAttribute('aria-selected', String(tab.dataset.view === state.view));
  }

  // ---------- 렌더 ----------
  let lastSignature = '';
  let lastVisible = [];

  function render() {
    const now = Date.now();
    const snap = snapshot(now);
    lastSignature = signature(snap);
    syncControls();
    renderStamp(now);
    renderStats(snap);
    const view = $('#view');
    const scroll = window.scrollY;
    const builders = { upcoming: viewUpcoming, all: viewAll, timeline: viewTimeline, path: viewPath, mine: viewMine };
    view.replaceChildren(...builders[state.view](snap));
    lastVisible = visibleItems(snap);
    $('#result-count').textContent = state.view === 'path' ? `주력 경로 ${pathNodes().filter((node) => node.critical).length}단계 · 전체 ${pathNodes().length}개` : `${lastVisible.length}개 표시`;
    updatePrintMeta(new Date(now));
    window.scrollTo(0, scroll);
  }

  function visibleItems(snap) {
    if (state.view === 'path') return [];
    if (state.view === 'upcoming') {
      return ITEMS.filter((item) => matchesFilters(item, snap, { ignoreHide: true }) && isUpcomingItem(item, snap));
    }
    if (state.view === 'mine') return ITEMS.filter((item) => isTracked(item.id) && matchesFilters(item, snap, { ignoreHide: true }));
    if (state.view === 'timeline') return ITEMS.filter((item) => matchesFilters(item, snap) && (item.deadline || item.event));
    return ITEMS.filter((item) => matchesFilters(item, snap));
  }

  // 1초마다 시계·카운트다운만 갱신하고, 상태가 바뀐 경우에만 전체를 다시 그린다.
  function tick() {
    const now = Date.now();
    $('#clock-local').textContent = fmtClock.format(now);
    $('#clock-berlin').textContent = fmtBerlin.format(now);
    for (const el of $$('[data-due]')) {
      const due = Number(el.dataset.due);
      el.textContent = el.dataset.compact ? compactLeft(due, now) : tickerText(due, Boolean(el.dataset.exact), now);
    }
    if (new Date(now).getSeconds() === 0 || !lastSignature) {
      const sig = signature(snapshot(now));
      if (sig !== lastSignature) {
        render();
        if (detailId && $('#detail').open && !['TEXTAREA', 'INPUT', 'SELECT'].includes(document.activeElement?.tagName)) renderDetail();
      }
    }
  }

  // ---------- 내보내기 ----------
  function download(filename, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = h('a', { href: url, download: filename });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function stampForFile() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }

  // claude.ai 아티팩트 뷰어는 페이지가 시작한 파일 다운로드를 막으므로, 그곳에서는 붙여넣기 창으로 백업·복원한다.
  const IN_ARTIFACT = window.FESTIVAL_TRACKER_HOST === 'artifact';

  function trackingJSON() {
    const payload = { app: 'festival-tracker', version: 1, exportedAt: new Date().toISOString(), surveyDate: DATA.surveyDate, items: tracking.items };
    return JSON.stringify(payload, null, 2);
  }

  function openBackupPanel() {
    detailId = null;
    const area = h('textarea', { id: 'backup-text', 'aria-label': '추적 데이터 JSON', style: 'min-height:220px;font-family:var(--mono);font-size:12px' }, trackingJSON());
    $('#detail-body').replaceChildren(
      h('h2', { id: 'detail-title' }, '추적 백업·복원'),
      h('p', { class: 'muted' }, '이 페이지의 추적 상태는 지금 보는 브라우저에만 저장됩니다. 아래 JSON을 복사해 보관하거나, 다른 브라우저에서 받은 JSON을 붙여넣고 가져오기를 누르세요.'),
      h(
        'div',
        { class: 'track-box' },
        area,
        h(
          'div',
          { class: 'track-row' },
          h('button', {
            type: 'button',
            onclick: async () => {
              try {
                await navigator.clipboard.writeText(area.value);
                toast('추적 데이터를 클립보드에 복사했습니다.');
              } catch {
                area.focus();
                area.select();
                toast('자동 복사가 막혀 있습니다. 선택된 텍스트를 Ctrl+C로 복사하세요.');
              }
            },
          }, 'JSON 복사'),
          h('button', { type: 'button', onclick: () => importTrackingText(area.value) }, '붙여넣은 JSON 가져오기'),
          h('button', { type: 'button', class: 'ghost', onclick: () => $('#import-file').click() }, 'JSON 파일 열기'),
        ),
      ),
    );
    const dialog = $('#detail');
    if (!dialog.open) dialog.showModal();
  }

  function exportTracking() {
    if (IN_ARTIFACT) {
      openBackupPanel();
      return;
    }
    download(`festival-tracking-${stampForFile()}.json`, trackingJSON(), 'application/json');
    toast(`${Object.keys(tracking.items).length}개 추적 항목을 내보냈습니다.`);
  }

  function importTracking(file) {
    const reader = new FileReader();
    reader.onload = () => importTrackingText(String(reader.result));
    reader.readAsText(file);
  }

  function importTrackingText(text) {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed.items !== 'object' || Array.isArray(parsed.items)) throw new Error('items 필드가 없습니다.');
      let merged = 0;
      let unknown = 0;
      for (const [id, value] of Object.entries(parsed.items)) {
        if (!value || typeof value !== 'object') continue;
        if (!BY_ID.has(id)) unknown += 1;
        const current = tracking.items[id];
        if (current && current.updatedAt && value.updatedAt && current.updatedAt > value.updatedAt) continue;
        tracking.items[id] = {
          status: TRACK_LABEL[value.status] !== undefined ? value.status : '',
          starred: Boolean(value.starred),
          memo: typeof value.memo === 'string' ? value.memo : '',
          target: typeof value.target === 'string' ? value.target : '',
          ...(typeof value.focus === 'boolean' ? { focus: value.focus } : {}),
          updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
        };
        merged += 1;
      }
      saveTracking();
      render();
      toast(`${merged}개 항목을 가져왔습니다${unknown ? ` (현재 데이터에 없는 ID ${unknown}개 포함)` : ''}. 더 최근에 수정한 로컬 항목은 유지했습니다.`);
    } catch (error) {
      toast(`가져오기 실패: ${error.message}`);
    }
  }

  function exportICS() {
    const items = lastVisible.filter((item) => item.deadline || (item.event && item.event.precision === 'date'));
    if (items.length === 0) {
      toast('현재 보이는 항목 중 날짜가 있는 항목이 없습니다.');
      return;
    }
    download(`indie-festivals-${stampForFile()}.ics`, FS.toICS(items, Date.now()), 'text/calendar');
    toast(`${items.length}개 항목의 마감·전시 일정을 캘린더 파일로 저장했습니다.`);
  }

  // PDF 저장: 브라우저 인쇄 창을 연다(대상에서 'PDF로 저장'). 인쇄 동안 문서 제목을 바꿔 PDF 기본 파일명으로 쓰고, 상단에 보기·필터·출력 시각을 남긴다.
  const VIEW_LABEL = { upcoming: '다가오는 마감', all: '전체 목록', timeline: '타임라인', path: '전략 경로', mine: '내 추적' };
  let titleBeforePrint = null;

  function filterSummary() {
    if (state.view === 'path') return '';
    const parts = [];
    if (state.q) parts.push(`검색 "${state.q}"`);
    for (const id of ['#f-category', '#f-status', '#f-price', '#f-track']) {
      const select = $(id);
      if (select.value) parts.push(select.selectedOptions[0].textContent);
    }
    if (state.stat) parts.push(STAT_DEFS.find(([key]) => key === state.stat)?.[1] ?? state.stat);
    if (state.recheck) parts.push('재확인 필요만');
    return parts.length ? ` · 필터: ${parts.join(', ')}` : '';
  }

  // 렌더마다 인쇄 머리말과 보기 속성을 맞춰 두므로 브라우저 메뉴·헤드리스 인쇄에서도 같은 결과가 나온다.
  function updatePrintMeta(now = new Date()) {
    $('#print-meta').textContent = `${VIEW_LABEL[state.view]} · ${$('#result-count').textContent}${filterSummary()} · 출력 ${fmtLocal.format(now)} · 데이터 조사 기준일 ${DATA.surveyDate}`;
    document.documentElement.dataset.view = state.view;
  }

  function beforePrint() {
    if ($('#detail').open) $('#detail').close();
    updatePrintMeta();
    if (titleBeforePrint === null) titleBeforePrint = document.title;
    document.title = `인디 게임 출품 트래커 - ${VIEW_LABEL[state.view]} - ${stampForFile()}`;
  }

  function afterPrint() {
    if (titleBeforePrint !== null) document.title = titleBeforePrint;
    titleBeforePrint = null;
  }

  function exportPDF() {
    render();
    window.print();
  }

  let toastTimer = null;
  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
  }

  // ---------- 초기화 ----------
  function initControls() {
    const catSelect = $('#f-category');
    for (const section of DATA.sections) catSelect.append(h('option', { value: section.key }, `${section.title} (${section.count})`));
    const stSelect = $('#f-status');
    for (const key of FS.STATUS_ORDER) stSelect.append(h('option', { value: key }, FS.STATUS_LABELS[key]));
    const trackSelect = $('#f-track');
    trackSelect.append(h('option', { value: '*' }, '추적 중 전체'), h('option', { value: 'focus' }, '◆ 집중 관리'), h('option', { value: 'star' }, '★ 별표'));
    for (const [value, label] of TRACK_STATES.slice(1)) trackSelect.append(h('option', { value }, label));

    $('#f-query').addEventListener('input', debounce((event) => setState({ q: event.target.value.trim() }), 200));
    $('#f-category').addEventListener('change', (event) => setState({ cat: event.target.value }));
    $('#f-status').addEventListener('change', (event) => setState({ st: event.target.value }));
    $('#f-price').addEventListener('change', (event) => setState({ price: event.target.value }));
    $('#f-track').addEventListener('change', (event) => setState({ track: event.target.value }));
    $('#f-hide-closed').addEventListener('change', (event) => setState({ hide: event.target.checked ? '1' : '' }));
    $('#f-hide-skipped').addEventListener('change', (event) => setState({ skip: event.target.checked ? '1' : '' }));
    $('#f-recheck').addEventListener('change', (event) => setState({ recheck: event.target.checked ? '1' : '' }));
    $('#f-reset').addEventListener('click', () => setState({ ...DEFAULT_STATE, view: state.view }));
    for (const tab of $$('.tabs [role="tab"]')) tab.addEventListener('click', () => setState({ view: tab.dataset.view, stat: tab.dataset.view === 'mine' ? '' : state.stat === 'tracked' ? '' : state.stat }));

    if (IN_ARTIFACT) {
      $('#btn-ics').hidden = true;
      $('#btn-import').hidden = true;
      // 아티팩트 뷰어의 sandbox iframe은 인쇄 창도 막을 수 있어 숨긴다.
      $('#btn-pdf').hidden = true;
      $('#btn-export').textContent = '추적 백업·복원';
    }
    $('#btn-export').addEventListener('click', exportTracking);
    $('#btn-import').addEventListener('click', () => $('#import-file').click());
    $('#import-file').addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) importTracking(file);
      event.target.value = '';
    });
    $('#btn-ics').addEventListener('click', exportICS);
    $('#btn-pdf').addEventListener('click', exportPDF);
    // 브라우저 메뉴(Ctrl+P)로 인쇄해도 같은 머리말·파일명을 쓴다.
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    $('#detail').addEventListener('close', () => {
      detailId = null;
    });
    $('#detail').addEventListener('click', (event) => {
      if (event.target === event.currentTarget) event.currentTarget.close();
    });
    window.addEventListener('hashchange', () => {
      state = readHash();
      render();
    });
    // 다른 탭에서 추적 상태를 바꾸면 반영한다.
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY) return;
      tracking = loadTracking();
      render();
    });
    // 절전·백그라운드 탭에서 돌아오면 즉시 다시 계산한다.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) render();
    });
  }

  window.addEventListener('festival-expenses-change', () => render());
  initControls();
  render();
  tick();
  setInterval(tick, 1000);
})();
