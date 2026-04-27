/**
 * 金額を ¥123,456 の実数表記にフォーマット
 */
export function formatYen(amount) {
  const n = Number(amount) || 0;
  if (n === 0) return '¥0';
  return '¥' + Math.round(n).toLocaleString();
}
