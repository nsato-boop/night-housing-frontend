"use client";
import { THEME } from "../utils/colors";
import { formatYen } from "../utils/formatCurrency";

export default function MonthlyTable({ monthlyData, months, customers, selectedStaff }) {
  if (!monthlyData || monthlyData.length === 0) return null;

  const filtered = selectedStaff === 'チーム全体'
    ? customers
    : customers.filter(c => c.staff === selectedStaff);

  const CONTRACT_STATUSES = ['審査通過済み（契約準備中）', '仲介手数料着金済み', 'その他売上着金済み', '契約済み', 'AD着金済み'];

  const rows = months.map((m, i) => {
    const d = monthlyData[i] || { fee: 0, ad: 0, other: 0 };
    const newCount = filtered.filter(c => {
      const date = c.follow_date || c.created_at || '';
      return date.startsWith(m.prefix);
    }).length;
    const contracts = filtered.filter(c =>
      CONTRACT_STATUSES.includes(c.status) && (c.contract_date || '').startsWith(m.prefix)
    ).length;

    return {
      label: m.label,
      fee: d.fee, ad: d.ad, other: d.other,
      total: d.fee + d.ad + d.other,
      newCount, contracts,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      fee: acc.fee + r.fee, ad: acc.ad + r.ad, other: acc.other + r.other,
      total: acc.total + r.total, newCount: acc.newCount + r.newCount, contracts: acc.contracts + r.contracts,
    }),
    { fee: 0, ad: 0, other: 0, total: 0, newCount: 0, contracts: 0 }
  );

  const cellStyle = { padding: '6px 8px', fontSize: 10, textAlign: 'right', borderBottom: `1px solid ${THEME.border}` };
  const headerStyle = { ...cellStyle, color: THEME.textSub, fontWeight: 500, textAlign: 'right' };
  const labelStyle = { ...cellStyle, textAlign: 'left', color: THEME.text };

  return (
    <div className="card">
      <div style={{ fontSize: 11, fontWeight: 500, color: THEME.text, marginBottom: 10 }}>
        月別内訳
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...headerStyle, textAlign: 'left' }}>月</th>
            <th style={headerStyle}>仲介</th>
            <th style={headerStyle}>AD</th>
            <th style={headerStyle}>その他</th>
            <th style={headerStyle}>合計</th>
            <th style={headerStyle}>新規</th>
            <th style={headerStyle}>契約</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={labelStyle}>{r.label}</td>
              <td style={{ ...cellStyle, color: THEME.text }}>{formatYen(r.fee)}</td>
              <td style={{ ...cellStyle, color: THEME.text }}>{formatYen(r.ad)}</td>
              <td style={{ ...cellStyle, color: THEME.text }}>{formatYen(r.other)}</td>
              <td style={{ ...cellStyle, color: THEME.text, fontWeight: 500 }}>{formatYen(r.total)}</td>
              <td style={{ ...cellStyle, color: THEME.text }}>{r.newCount}</td>
              <td style={{ ...cellStyle, color: THEME.text }}>{r.contracts}</td>
            </tr>
          ))}
          <tr style={{ borderTop: `2px solid ${THEME.accent}` }}>
            <td style={{ ...labelStyle, color: THEME.accent, fontWeight: 600 }}>合計</td>
            <td style={{ ...cellStyle, color: THEME.accent, fontWeight: 500 }}>{formatYen(totals.fee)}</td>
            <td style={{ ...cellStyle, color: THEME.accent, fontWeight: 500 }}>{formatYen(totals.ad)}</td>
            <td style={{ ...cellStyle, color: THEME.accent, fontWeight: 500 }}>{formatYen(totals.other)}</td>
            <td style={{ ...cellStyle, color: THEME.accent, fontWeight: 600 }}>{formatYen(totals.total)}</td>
            <td style={{ ...cellStyle, color: THEME.accent, fontWeight: 500 }}>{totals.newCount}</td>
            <td style={{ ...cellStyle, color: THEME.accent, fontWeight: 500 }}>{totals.contracts}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
