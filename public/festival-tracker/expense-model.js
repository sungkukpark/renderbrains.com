// 경비 계산·검증. cash/points는 해당 통화의 최소 단위 정수입니다.
(function (root) {
  'use strict';
  const currencyDigits = (currency) => {
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error('통화는 EUR, USD 등 영문 세 글자로 입력하세요.');
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  };
  function minor(text, currency) {
    const digits = currencyDigits(currency);
    const value = String(text).trim();
    if (!new RegExp(`^\\d+(?:\\.\\d{1,${digits || 1}})?$`).test(value) || (!digits && value.includes('.'))) throw new Error('금액의 소수 자릿수를 확인하세요.');
    const [whole, fraction = ''] = value.split('.');
    const amount = Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, '0'));
    if (!Number.isSafeInteger(amount)) throw new Error('금액이 너무 큽니다.');
    return amount;
  }
  function receiptPath(value) {
    return !value || /^receipts\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.pdf$/.test(value);
  }
  function validate(row) {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !row.id || typeof row.updatedAt !== 'string' || !Number.isFinite(Date.parse(row.updatedAt))) throw new Error('경비 ID 또는 수정 시각이 올바르지 않습니다.');
    if (row.deleted === true) return { id: row.id, deleted: true, updatedAt: row.updatedAt };
    if (typeof row.festivalId !== 'string' || !row.festivalId || typeof row.title !== 'string' || !row.title.trim()) throw new Error('행사와 경비 항목명을 입력하세요.');
    currencyDigits(row.currency);
    if (![row.cash, row.points].every((v) => Number.isSafeInteger(v) && v >= 0) || !Number.isSafeInteger(row.cash + row.points)) throw new Error('현금·포인트 금액이 올바르지 않습니다.');
    if (row.date && (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || new Date(row.date).toISOString().slice(0, 10) !== row.date)) throw new Error('이용일이 올바르지 않습니다.');
    if (typeof row.receipt !== 'string' || !receiptPath(row.receipt)) throw new Error('증빙은 receipts/ 안의 PDF 상대 경로를 입력하세요.');
    return { id: row.id, festivalId: row.festivalId, title: row.title.trim(), date: row.date || '', cash: row.cash, points: row.points, currency: row.currency, receipt: row.receipt, memo: typeof row.memo === 'string' ? row.memo : '', updatedAt: row.updatedAt };
  }
  function merge(current, incoming) {
    if (!Array.isArray(incoming)) throw new Error('경비 배열이 없습니다.');
    const result = new Map(current.map((r) => [r.id, r]));
    for (const value of incoming) {
      const row = validate(value);
      const old = result.get(row.id);
      if (!old || Date.parse(row.updatedAt) > Date.parse(old.updatedAt)) result.set(row.id, row);
    }
    return [...result.values()];
  }
  function effective(seed, overrides) {
    const rows = new Map(seed.map((r) => [r.id, r]));
    for (const row of overrides) rows.set(row.id, row);
    return [...rows.values()].filter((r) => !r.deleted);
  }
  function totals(rows) {
    const result = {};
    for (const row of rows) {
      const sum = result[row.currency] ||= { cash: 0, points: 0, total: 0 };
      sum.cash += row.cash; sum.points += row.points; sum.total += row.cash + row.points;
      if (![sum.cash, sum.points, sum.total].every(Number.isSafeInteger)) throw new Error('합계가 계산 범위를 초과했습니다.');
    }
    return result;
  }
  const api = { currencyDigits, minor, receiptPath, validate, merge, effective, totals };
  if (typeof module !== 'undefined') module.exports = api;
  else root.FestivalExpenses = api;
})(typeof window === 'undefined' ? globalThis : window);
