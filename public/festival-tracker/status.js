// 현재 시각 기준 마감·전시 상태 계산. 브라우저에서는 window.FestivalStatus, Node 테스트에서는 require로 쓴다.
// file:// 에서 열 수 있도록 ES 모듈이 아닌 일반 스크립트로 둔다.
(function (root) {
  'use strict';

  const DAY = 24 * 60 * 60 * 1000;
  const URGENT_WINDOW = 7 * DAY;

  const STATUS_LABELS = {
    urgent: '마감 임박',
    today: '오늘 마감',
    open: '접수 중',
    rolling: '접수 중·마감 미공개',
    upcoming: '접수 예정',
    announced: '일정 확정·모집 미발표',
    watch: '차기 미발표·관찰',
    closed: '접수 마감',
    ended: '종료·재개 불명',
  };

  // 정렬 우선순위: 지금 행동할 수 있는 것부터.
  const STATUS_ORDER = ['today', 'urgent', 'open', 'rolling', 'upcoming', 'announced', 'watch', 'closed', 'ended'];

  function localDate(dateText, hour = 0, minute = 0, addDays = 0) {
    const [y, m, d] = dateText.split('-').map(Number);
    return new Date(y, m - 1, d + addDays, hour, minute).getTime();
  }

  // dueAt: 맞춰야 할 시점(정확한 시각, 또는 시각 미공개면 마감일 0시 = 전날까지 제출 권장)
  // passAt: 이 시점이 지나면 마감 경과로 본다(시각 미공개면 시간대 차이를 고려해 다음 날 정오).
  function deadlineTimes(item) {
    const d = item.deadline;
    if (!d) return null;
    if (d.precision === 'exact') {
      const at = Date.parse(d.at);
      return { dueAt: at, passAt: at, exact: true };
    }
    return { dueAt: localDate(d.date), passAt: localDate(d.date, 12, 0, 1), exact: false };
  }

  function eventTimes(item) {
    const e = item.event;
    if (!e) return null;
    return { startAt: localDate(e.start), endAt: localDate(e.end, 0, 0, 1), precision: e.precision };
  }

  function effectiveStatus(item, now) {
    const group = item.statusGroup;
    if (group === 'ended') return 'ended';
    const times = deadlineTimes(item);
    if (!times) {
      if (group === 'open') return 'rolling';
      if (group === 'closed') return 'closed';
      if (group === 'announced') return 'announced';
      return 'watch';
    }
    if (now < times.passAt) {
      if (group === 'closed') return 'closed';
      if (group === 'announced') return 'upcoming';
      if (!times.exact && now >= times.dueAt) return 'today';
      if (times.dueAt - now <= URGENT_WINDOW) return 'urgent';
      return 'open';
    }
    // 마감이 지났어도 문서가 '차기 미발표·관찰'로 분류한 행은 과거 회차 날짜일 뿐이다.
    if (group === 'watch' || group === 'announced') return group;
    return 'closed';
  }

  function eventPhase(item, now) {
    const t = eventTimes(item);
    if (!t) return null;
    if (now < t.startAt) return 'before';
    if (now < t.endAt) return 'live';
    return 'after';
  }

  function isActionable(status) {
    return status === 'today' || status === 'urgent' || status === 'open' || status === 'rolling';
  }

  function sortKey(item, now) {
    const status = effectiveStatus(item, now);
    const times = deadlineTimes(item);
    const event = eventTimes(item);
    const rank = STATUS_ORDER.indexOf(status);
    const when = times && now < times.passAt ? times.dueAt : event ? event.startAt : Number.MAX_SAFE_INTEGER;
    return [rank, when];
  }

  function compareItems(a, b, now) {
    const [ra, wa] = sortKey(a, now);
    const [rb, wb] = sortKey(b, now);
    return ra - rb || wa - wb || a.id.localeCompare(b.id);
  }

  function splitDuration(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    return {
      days: Math.floor(total / 86400),
      hours: Math.floor((total % 86400) / 3600),
      minutes: Math.floor((total % 3600) / 60),
      seconds: total % 60,
    };
  }

  function formatCountdown(ms) {
    const { days, hours, minutes, seconds } = splitDuration(Math.abs(ms));
    const pad = (n) => String(n).padStart(2, '0');
    const body = days > 0 ? `${days}일 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    return ms >= 0 ? body : `${body} 경과`;
  }

  // 달력 날짜 기준 D-day (시간이 아니라 날짜 차이).
  function dayDiff(targetMs, now) {
    const a = new Date(targetMs);
    const b = new Date(now);
    const da = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const db = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((da - db) / DAY);
  }

  function dLabel(item, now) {
    const times = deadlineTimes(item);
    if (!times) return '';
    const target = times.exact ? times.dueAt : localDate(item.deadline.date);
    const diff = dayDiff(target, now);
    if (diff === 0) return 'D-DAY';
    return diff > 0 ? `D-${diff}` : `D+${-diff}`;
  }

  // 집중 관리 항목이 지금 무엇을 기다리는지 계산한다.
  // entry: focus.data.js 항목 { mode: 'deadline'(기본)|'event'|'next', watchFrom: 'YYYY-MM' }
  // trackStatus가 제출 완료·선정이면 마감이 지난 뒤에도 전시·피칭 일정을 따라간다.
  // 반환 kind: deadline(제출 마감 대기) · event(선정된 행사 대기·진행) · rolling(마감 미공개 접수) · next(차기 공고 대기) · done(이번 회차 끝)
  function focusAgenda(item, entry, now, trackStatus = '') {
    const mode = (entry && entry.mode) || 'deadline';
    const status = effectiveStatus(item, now);
    const event = eventTimes(item);
    const eventAhead = event && now < event.endAt;
    const asEvent = () => ({ kind: 'event', at: event.startAt, live: now >= event.startAt });

    if (mode === 'event') return eventAhead ? asEvent() : { kind: 'done', at: null };
    if (mode === 'deadline') {
      const times = deadlineTimes(item);
      if (times && now < times.passAt && status !== 'closed') return { kind: 'deadline', at: times.dueAt };
      if (status === 'rolling') return { kind: 'rolling', at: null };
      if ((trackStatus === 'submitted' || trackStatus === 'accepted') && eventAhead) return asEvent();
      if (status === 'closed' || status === 'ended') return { kind: 'done', at: null };
    }
    const from = entry && entry.watchFrom ? localDate(`${entry.watchFrom}-01`) : null;
    return { kind: 'next', at: from, due: from !== null && now >= from };
  }

  function icsEscape(text) {
    return String(text).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  }

  function icsDate(dateText, addDays = 0) {
    const ms = localDate(dateText, 0, 0, addDays);
    const d = new Date(ms);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }

  function icsUtc(ms) {
    return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  // 긴 줄은 RFC 5545에 따라 75옥텟 근처에서 접는다(여기서는 문자 수 기준으로 보수적으로 60자).
  function fold(line) {
    const chars = Array.from(line);
    if (chars.length <= 60) return line;
    const parts = [];
    for (let i = 0; i < chars.length; i += 60) parts.push(chars.slice(i, i + 60).join(''));
    return parts.join('\r\n ');
  }

  function toICS(items, now, options = {}) {
    const includeEvents = options.includeEvents !== false;
    const stamp = icsUtc(now);
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//zerosketch//festival-tracker//KO', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:인디 게임 출품 트래커'];
    for (const item of items) {
      const url = item.applyUrl ?? '';
      const description = [item.statusText, item.statusDetail, `비용: ${item.price}`, url].filter(Boolean).join('\n');
      if (item.deadline) {
        const times = deadlineTimes(item);
        lines.push('BEGIN:VEVENT', `UID:${item.id}-deadline@festival-tracker`, `DTSTAMP:${stamp}`);
        if (times.exact) {
          lines.push(`DTSTART:${icsUtc(times.dueAt)}`, `DTEND:${icsUtc(times.dueAt + 30 * 60 * 1000)}`);
        } else {
          lines.push(`DTSTART;VALUE=DATE:${icsDate(item.deadline.date)}`, `DTEND;VALUE=DATE:${icsDate(item.deadline.date, 1)}`);
        }
        lines.push(`SUMMARY:${icsEscape(`[마감] ${item.id} ${item.name}`)}`, `DESCRIPTION:${icsEscape(description)}`);
        if (url) lines.push(`URL:${url}`);
        lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-P3D', `DESCRIPTION:${icsEscape(`${item.name} 마감 3일 전`)}`, 'END:VALARM', 'END:VEVENT');
      }
      if (includeEvents && item.event && item.event.precision === 'date') {
        lines.push(
          'BEGIN:VEVENT',
          `UID:${item.id}-event@festival-tracker`,
          `DTSTAMP:${stamp}`,
          `DTSTART;VALUE=DATE:${icsDate(item.event.start)}`,
          `DTEND;VALUE=DATE:${icsDate(item.event.end, 1)}`,
          `SUMMARY:${icsEscape(`[전시] ${item.id} ${item.name}`)}`,
          `DESCRIPTION:${icsEscape(`${item.eventText}\n${url}`)}`,
          'TRANSP:TRANSPARENT',
          'END:VEVENT',
        );
      }
    }
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }

  const api = {
    DAY,
    STATUS_LABELS,
    STATUS_ORDER,
    deadlineTimes,
    eventTimes,
    effectiveStatus,
    eventPhase,
    isActionable,
    compareItems,
    formatCountdown,
    dayDiff,
    dLabel,
    focusAgenda,
    localDate,
    toICS,
  };

  root.FestivalStatus = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
