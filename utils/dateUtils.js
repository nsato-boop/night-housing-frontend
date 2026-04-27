/**
 * 期間計算ユーティリティ
 * 今期 = 3月〜翌2月
 */

/** 今日の開始・終了 */
export function getToday() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { start, end };
}

/** 今週の開始（月曜）〜今日 */
export function getThisWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { start, end, label: '今週' };
}

/** 今月の開始・終了 */
export function getThisMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start, end, label: `${now.getMonth() + 1}月` };
}

/** 先月の開始・終了 */
export function getLastMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  return { start, end };
}

/** 今期の開始・終了（3月〜翌2月） */
export function getThisFiscal() {
  const now = new Date();
  let fiscalStartYear = now.getFullYear();
  if (now.getMonth() < 2) fiscalStartYear--;
  const start = new Date(fiscalStartYear, 2, 1);
  const end = new Date(fiscalStartYear + 1, 1, 28, 23, 59, 59);
  return { start, end, label: `${fiscalStartYear}年度` };
}

/** 日付文字列 "YYYY/MM/DD" をDateに変換 */
export function parseDate(str) {
  if (!str) return null;
  const s = String(str).trim();
  const m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** 日付が期間内かチェック */
export function isInPeriod(dateStr, start, end) {
  const d = parseDate(dateStr);
  if (!d) return false;
  return d >= start && d <= end;
}

/** "YYYY/MM/DD HH:mm:ss" → "MM/DD HH:mm" */
export function shortDateTime(str) {
  if (!str) return '';
  const m = String(str).match(/(\d{1,2})[/-](\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (!m) return str;
  return `${m[1]}/${m[2]} ${m[3]}:${m[4]}`;
}

/** 今期の月リスト（3月〜当月） */
export function getFiscalMonths() {
  const now = new Date();
  let fiscalStartYear = now.getFullYear();
  if (now.getMonth() < 2) fiscalStartYear--;
  const months = [];
  const currentMonth = now.getFullYear() * 12 + now.getMonth();
  for (let m = 2; m <= 13; m++) {
    const year = fiscalStartYear + Math.floor(m / 12);
    const month = m % 12;
    if (year * 12 + month > currentMonth) break;
    months.push({
      year,
      month: month + 1,
      label: `${month + 1}月`,
      prefix: `${year}/${String(month + 1).padStart(2, '0')}`,
    });
  }
  return months;
}

/** Date → "YYYY-MM-DD" */
export function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Date → "YYYY/MM/DD" */
export function toDisplayDate(d) {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}
