"use client";
import { THEME } from "../utils/colors";
import { formatYen } from "../utils/formatCurrency";

export default function SummaryKpis({ monthlyData, months, customers, selectedStaff }) {
  if (!monthlyData || monthlyData.length === 0) return null;

  // 期間着金合計
  const totalReceived = monthlyData.reduce((s, d) => s + d.fee + d.ad + d.other, 0);
  const monthCount = monthlyData.length;
  const avgReceived = monthCount > 0 ? Math.round(totalReceived / monthCount) : 0;

  // 期間新規追加・契約
  const filtered = selectedStaff === 'チーム全体'
    ? customers
    : customers.filter(c => c.staff === selectedStaff);

  const firstMonth = months[0];
  const lastMonth = months[months.length - 1];
  const startPrefix = `${firstMonth.year}/${String(firstMonth.month).padStart(2, '0')}`;
  const periodNew = filtered.filter(c => {
    const d = c.follow_date || c.created_at || '';
    return months.some(m => d.startsWith(m.prefix));
  }).length;

  const CONTRACT_STATUSES = ['審査通過済み（契約準備中）', '仲介手数料着金済み', 'その他売上着金済み', '契約済み', 'AD着金済み'];
  const periodContracts = filtered.filter(c => {
    if (!CONTRACT_STATUSES.includes(c.status)) return false;
    const d = c.contract_date || '';
    return months.some(m => d.startsWith(m.prefix));
  }).length;

  const contractRate = periodNew > 0 ? ((periodContracts / periodNew) * 100).toFixed(1) : '0';

  // 最高月
  const monthTotals = monthlyData.map((d, i) => ({ total: d.fee + d.ad + d.other, label: months[i]?.label || '' }));
  const bestMonth = monthTotals.reduce((best, m) => m.total > best.total ? m : best, monthTotals[0]);

  // 成長率（直近2ヶ月）
  let growthRate = 0;
  if (monthlyData.length >= 2) {
    const prev = monthlyData[monthlyData.length - 2];
    const curr = monthlyData[monthlyData.length - 1];
    const prevTotal = prev.fee + prev.ad + prev.other;
    const currTotal = curr.fee + curr.ad + curr.other;
    growthRate = prevTotal > 0 ? Math.round(((currTotal - prevTotal) / prevTotal) * 100) : 0;
  }

  const cards = [
    { label: '期間着金合計', value: formatYen(totalReceived), sub: `${monthCount}ヶ月間` },
    { label: '月平均着金', value: formatYen(avgReceived), sub: `${formatYen(totalReceived)} ÷ ${monthCount}` },
    { label: '期間新規追加', value: periodNew, sub: `月平均 ${Math.round(periodNew / monthCount)}件` },
    { label: '期間契約数', value: periodContracts, sub: `契約率 ${contractRate}%` },
    { label: '最高月', value: bestMonth.label, sub: formatYen(bestMonth.total) },
    {
      label: '成長率',
      value: `${growthRate >= 0 ? '+' : ''}${growthRate}%`,
      sub: months.length >= 2 ? `${months[months.length - 2].label}→${months[months.length - 1].label}` : '',
      valueColor: growthRate >= 0 ? THEME.success : THEME.danger,
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 12 }}>
      {cards.map((c, i) => (
        <div key={i} className="card" style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: THEME.textSub, marginBottom: 4 }}>{c.label}</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: c.valueColor || THEME.text }}>{c.value}</div>
          <div style={{ fontSize: 9, color: THEME.textSub, marginTop: 2 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
