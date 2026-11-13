// 행사 상세 경비 UI. 기존 내 추적 저장소와 독립적으로 보관합니다.
(function () {
  'use strict';
  const M = window.FestivalExpenses;
  const KEY = 'festival-tracker:expenses:v1';
  const seed = (window.FESTIVAL_EXPENSES || []).map((row) => M.validate({ ...row, updatedAt: '2026-10-21T00:00:00Z' }));
  let overrides = [];
  let loadError = '';
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
    overrides = M.merge([], saved);
  } catch {
    loadError = '저장된 경비를 읽지 못했습니다. 기존 저장값을 보호하기 위해 편집을 중단했습니다.';
  }
  function persist(next) {
    if (loadError) throw new Error(loadError);
    // 저장 실패 시 현재 UI 상태도 바꾸지 않습니다.
    localStorage.setItem(KEY, JSON.stringify(next));
    overrides = next;
    window.dispatchEvent(new Event('festival-expenses-change'));
  }
  const all = () => M.effective(seed, overrides);
  const decimal = (value, currency) => (value / 10 ** M.currencyDigits(currency)).toFixed(M.currencyDigits(currency));
  const money = (value, currency) => `${currency} ${decimal(value, currency)}`;
  function box(item, h, toast, editing = null) {
    const rows = all().filter((r) => r.festivalId === item.id);
    const section = h('section', { class: 'track-box expense-box', 'aria-label': '경비 내역' },
      h('h3', {}, '경비 내역'),
      h('p', { class: 'muted' }, '포인트 포함 · 통화별 합계 · 이용일 기준(결제일 아님). 화면 수정은 이 브라우저에 저장됩니다. 프로젝트 파일에는 자동 반영되지 않으므로 JSON으로 백업하세요.'),
    );
    const refresh = (edit = null) => section.replaceWith(box(item, h, toast, edit));
    if (loadError) section.append(h('p', { role: 'alert' }, loadError));
    const sums = M.totals(rows);
    section.append(h('div', { class: 'expense-totals' }, Object.entries(sums).map(([currency, sum]) =>
      h('p', {}, h('strong', {}, money(sum.total, currency)), ` (현금 ${money(sum.cash, currency)} · 포인트 ${money(sum.points, currency)})`)),
    ));
    if (!rows.length) section.append(h('p', { class: 'muted' }, '등록된 경비가 없습니다.'));
    for (const row of rows) {
      section.append(h('article', { class: 'expense-row', dataset: { expenseId: row.id } },
        h('strong', {}, row.title),
        h('div', {}, `${row.date || '이용일 미입력'} · ${money(row.cash + row.points, row.currency)}`),
        h('div', { class: 'muted' }, `현금 ${money(row.cash, row.currency)} · 포인트 ${money(row.points, row.currency)}`),
        row.memo ? h('p', { class: 'expense-memo' }, row.memo) : null,
        row.receipt ? h('a', { href: row.receipt, target: '_blank', rel: 'noopener' }, '증빙 PDF 열기 ↗') : null,
        h('div', { class: 'track-row' },
          h('button', { type: 'button', disabled: Boolean(loadError), onclick: () => refresh(row) }, '경비 수정'),
          h('button', { type: 'button', disabled: Boolean(loadError), onclick: () => {
            if (!window.confirm(`“${row.title}” 경비를 삭제할까요?`)) return;
            try {
              persist(overrides.filter((r) => r.id !== row.id).concat({ id: row.id, deleted: true, updatedAt: new Date().toISOString() }));
              refresh();
            } catch (error) { toast(`저장 실패: ${error.message}`); }
          } }, '경비 삭제'),
        ),
      ));
    }
    const row = editing || { title: '', date: '', cash: 0, points: 0, currency: 'EUR', receipt: '', memo: '' };
    const fields = {};
    function input(name, label, attrs = {}) {
      fields[name] = h(name === 'memo' ? 'textarea' : 'input', { name, ...attrs });
      fields[name].value = row[name] || '';
      return h('label', {}, label, fields[name]);
    }
    const form = h('form', { class: 'expense-form' },
      h('strong', {}, editing ? '경비 수정' : '경비 추가'),
      input('title', '항목명', { required: true, maxlength: 200 }),
      input('date', '이용일', { type: 'date' }),
      input('currency', '통화 (EUR / USD / KRW 등)', { required: true, pattern: '[A-Z]{3}', maxlength: 3 }),
      input('cash', '현금', { required: true, inputmode: 'decimal' }),
      input('points', '포인트 금액', { required: true, inputmode: 'decimal' }),
      input('receipt', '증빙 PDF 상대 경로 (receipts/...)'),
      input('memo', '메모'),
      h('div', { class: 'track-row' }, h('button', { type: 'submit', disabled: Boolean(loadError) }, '경비 저장'),
        editing ? h('button', { type: 'button', onclick: () => refresh() }, '수정 취소') : null),
    );
    fields.cash.value = decimal(row.cash, row.currency);
    fields.points.value = decimal(row.points, row.currency);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      try {
        const values = Object.fromEntries(Object.entries(fields).map(([key, el]) => [key, el.value.trim()]));
        const currency = values.currency.toUpperCase();
        const saved = M.validate({ ...values, id: editing?.id || `expense-${Date.now()}-${Math.random().toString(36).slice(2)}`, festivalId: item.id, currency,
          cash: M.minor(values.cash, currency), points: M.minor(values.points, currency), updatedAt: new Date().toISOString() });
        const next = overrides.filter((r) => r.id !== saved.id).concat(saved);
        M.totals(M.effective(seed, next));
        persist(next);
        refresh();
        toast('경비를 저장했습니다.');
      } catch (error) { toast(`저장 실패: ${error.message}`); }
    });
    section.append(form);
    const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
    file.addEventListener('change', async () => {
      try {
        if (!file.files[0]) return;
        const payload = JSON.parse(await file.files[0].text());
        if (payload.app !== 'festival-tracker-expenses' || payload.version !== 1) throw new Error('경비 백업 형식을 확인하세요.');
        const incoming = M.merge([], payload.records);
        const ids = new Set(window.FESTIVAL_DATA.items.map((r) => r.id));
        if (incoming.some((r) => !r.deleted && !ids.has(r.festivalId))) throw new Error('현재 목록에 없는 행사 ID가 있습니다.');
        const combined = M.merge(M.merge(seed, overrides), incoming);
        M.totals(combined.filter((r) => !r.deleted));
        persist(combined);
        refresh();
        toast('경비를 가져왔습니다. 더 최근의 로컬 수정·삭제는 유지합니다.');
      } catch (error) { toast(`가져오기 실패: ${error.message}`); }
      file.value = '';
    });
    section.append(h('div', { class: 'track-row' },
      h('button', { type: 'button', onclick: () => {
        const payload = { app: 'festival-tracker-expenses', version: 1, exportedAt: new Date().toISOString(), records: M.merge(seed, overrides) };
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        const a = h('a', { href: url, download: `festival-expenses-${new Date().toISOString().slice(0, 10)}.json` });
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      } }, '경비 전체 내보내기'),
      h('button', { type: 'button', disabled: Boolean(loadError), onclick: () => file.click() }, '경비 가져오기'), file,
    ));
    return section;
  }
  window.FestivalExpenseUI = { box, has: (id) => all().some((r) => r.festivalId === id) };
})();
