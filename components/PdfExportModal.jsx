"use client";
import { useState, useMemo } from "react";
import { THEME, SALES_STAFF } from "../utils/colors";
import { formatYen } from "../utils/formatCurrency";
import { getThisMonth, getLastMonth, getThisFiscal, getThisWeek, isInPeriod } from "../utils/dateUtils";

const SECTIONS = [
  { key: 'kpi', label: 'KPIサマリー' },
  { key: 'revenue', label: '売上内訳' },
  { key: 'chart', label: '売上推移グラフ' },
  { key: 'ranking', label: '売上ランキング' },
];

const CONTRACT_STATUSES = ['審査通過済み（契約準備中）', '仲介手数料着金済み', 'その他売上着金済み', '契約済み', 'AD着金済み'];
const ACTIVE_STATUSES = ['物件提案中', '内見', '審査中', '審査通過済み（契約準備中）'];
const LOSS_STATUS = '失注（離脱中・シナリオ配信中）';
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://night-housing-dashboard.onrender.com";

function getPeriodRange(period) {
  if (period === 'fiscal') return getThisFiscal();
  if (period === 'thisWeek') return getThisWeek();
  if (period === 'lastMonth') return getLastMonth();
  return getThisMonth();
}

function getPeriodLabel(period) {
  if (period === 'thisMonth') return '今月';
  if (period === 'fiscal') return '今期';
  if (period === 'thisWeek') return '今週';
  if (period === 'lastMonth') return '先月';
  return period;
}

function getPeriodTitle(period) {
  const now = new Date();
  if (period === 'thisMonth' || period === 'lastMonth') {
    const d = period === 'lastMonth' ? new Date(now.getFullYear(), now.getMonth() - 1) : now;
    return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  }
  if (period === 'fiscal') {
    const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${fy}年度`;
  }
  return '今週';
}

function fmtMan(v) {
  const n = Number(v) || 0;
  if (n === 0) return '¥0';
  return `¥${(n / 10000).toFixed(1)}万`;
}

export default function PdfExportModal({
  onClose, selectedStaff, selectedPeriod,
  customers, sales, lastMonthSales, goals, salesTarget,
}) {
  const [checked, setChecked] = useState(() =>
    SECTIONS.reduce((acc, s) => { acc[s.key] = true; return acc; }, {})
  );
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const toggle = (key) => {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const kpi = useMemo(() => {
    if (!customers) return null;
    const filtered = selectedStaff === 'チーム全体'
      ? customers
      : customers.filter(c => c.staff === selectedStaff);

    const { start, end } = getPeriodRange(selectedPeriod);
    const lastMonth = getLastMonth();

    const received = sales?.received_based?.total || 0;
    const newCount = filtered.filter(c => isInPeriod(c.follow_date || c.created_at, start, end)).length;
    const lastNewCount = filtered.filter(c => isInPeriod(c.follow_date || c.created_at, lastMonth.start, lastMonth.end)).length;
    const newDiff = newCount - lastNewCount;

    const active = filtered.filter(c => ACTIVE_STATUSES.includes(c.status));
    const proposalCount = active.filter(c => c.status === '物件提案中').length;
    const viewingCount = active.filter(c => c.status === '内見').length;
    const examCount = active.filter(c => c.status === '審査中' || c.status === '審査通過済み（契約準備中）').length;

    const contractCount = filtered.filter(c =>
      CONTRACT_STATUSES.includes(c.status) && isInPeriod(c.contract_date, start, end)
    ).length;
    const contractRate = newCount > 0 ? ((contractCount / newCount) * 100).toFixed(1) : '0.0';

    const lossCount = filtered.filter(c => c.status === LOSS_STATUS).length;
    const lossRate = (newCount + lossCount) > 0 ? Math.round((lossCount / (newCount + lossCount)) * 100) : 0;

    const targetPercent = salesTarget > 0 ? Math.round((received / salesTarget) * 100) : 0;

    return {
      newCount, newDiff, contractCount, contractRate,
      received, activeCount: active.length, proposalCount, viewingCount, examCount,
      lossCount, lossRate, salesTarget, targetPercent,
    };
  }, [customers, sales, selectedStaff, selectedPeriod, salesTarget]);

  const periodLabel = getPeriodLabel(selectedPeriod);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      // グラフのキャプチャ
      let chartImgSrc = '';
      if (checked.chart) {
        const canvases = document.querySelectorAll('.card canvas');
        for (const c of canvases) {
          if (c.width > 100) {
            chartImgSrc = c.toDataURL('image/png');
            break;
          }
        }
      }

      // ランキングデータ取得
      let rankingData = [];
      if (checked.ranking && selectedStaff === 'チーム全体') {
        const apiPeriod = selectedPeriod === 'thisWeek' ? 'thisMonth' : selectedPeriod;
        for (const name of SALES_STAFF) {
          try {
            const params = new URLSearchParams({ period: apiPeriod, staff: name });
            const res = await fetch(`${API_URL}/api/sales-3axis?${params}`);
            if (!res.ok) continue;
            const json = await res.json();
            rankingData.push({ name, received: json.received_based?.total || 0 });
          } catch { /* skip */ }
        }
        rankingData.sort((a, b) => b.received - a.received);
      }

      const today = new Date();
      const todayStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;

      // 印刷用HTML生成
      let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>売上レポート_${selectedStaff}_${getPeriodTitle(selectedPeriod)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Meiryo', sans-serif; color: #222; background: #fff; padding: 20mm 15mm; font-size: 11pt; line-height: 1.6; }
  h1 { font-size: 18pt; font-weight: 700; margin-bottom: 4px; }
  .meta { font-size: 9pt; color: #666; margin-bottom: 2px; }
  hr { border: none; border-top: 1px solid #ccc; margin: 12px 0; }
  h2 { font-size: 13pt; font-weight: 600; margin-bottom: 8px; margin-top: 4px; }
  .kpi-list { list-style: none; padding-left: 4px; margin-bottom: 8px; }
  .kpi-list li { margin-bottom: 3px; font-size: 10.5pt; }
  .kpi-list li::before { content: "・"; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10.5pt; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
  th { background: #0f766e; color: #fff; font-weight: 500; }
  td.num { text-align: right; }
  tr:nth-child(even) { background: #f5f5f5; }
  tr.total-row { font-weight: 600; background: #e8f5f3; }
  .chart-img { width: 100%; max-height: 240px; object-fit: contain; margin: 8px 0 16px; }
  @media print {
    body { padding: 10mm; }
    @page { size: A4 portrait; margin: 10mm; }
  }
</style>
</head><body>`;

      // ヘッダー
      html += `<h1>ナイトハウジング 売上レポート</h1>`;
      html += `<div class="meta">期間：${getPeriodTitle(selectedPeriod)}｜対象：${selectedStaff}</div>`;
      html += `<div class="meta">出力日：${todayStr}</div>`;
      html += `<hr>`;

      // KPIサマリー
      if (checked.kpi && kpi) {
        html += `<h2>KPIサマリー</h2><ul class="kpi-list">`;
        html += `<li>新規追加：${kpi.newCount}件（先月比 ${kpi.newDiff >= 0 ? '+' : ''}${kpi.newDiff}）</li>`;
        html += `<li>契約：${kpi.contractCount}件（契約率 ${kpi.contractRate}%）</li>`;
        html += `<li>成約売上：${formatYen(sales?.contract_based?.total || 0)}</li>`;
        html += `<li>着金合計：${formatYen(kpi.received)}</li>`;
        html += `<li>進行中：${kpi.activeCount}件（提案${kpi.proposalCount} / 内見${kpi.viewingCount} / 審査${kpi.examCount}）</li>`;
        html += `<li>失注：${kpi.lossCount}件（離脱率 ${kpi.lossRate}%）</li>`;
        html += `<li>目標進捗：${formatYen(kpi.received)} / ${formatYen(kpi.salesTarget)}（${kpi.targetPercent}%）</li>`;
        html += `</ul>`;
      }

      // 売上内訳テーブル
      if (checked.revenue && sales) {
        html += `<h2>売上内訳</h2>`;
        html += `<table><thead><tr><th></th><th>見込み</th><th>成約</th><th>着金</th></tr></thead><tbody>`;
        const rows = [
          ['仲介', sales.prospect?.fee, sales.contract_based?.fee, sales.received_based?.fee],
          ['AD', sales.prospect?.ad, sales.contract_based?.ad, sales.received_based?.ad],
          ['その他', sales.prospect?.other, sales.contract_based?.other, sales.received_based?.other],
          ['合計', sales.prospect?.total, sales.contract_based?.total, sales.received_based?.total],
        ];
        rows.forEach(([label, p, c, r], i) => {
          const cls = i === 3 ? ' class="total-row"' : '';
          html += `<tr${cls}><td>${label}</td><td class="num">${fmtMan(p)}</td><td class="num">${fmtMan(c)}</td><td class="num">${fmtMan(r)}</td></tr>`;
        });
        html += `</tbody></table>`;
      }

      // 売上推移グラフ
      if (checked.chart && chartImgSrc) {
        html += `<h2>売上推移</h2>`;
        html += `<img src="${chartImgSrc}" class="chart-img" />`;
      }

      // 売上ランキング
      if (checked.ranking && rankingData.length > 0) {
        html += `<h2>売上ランキング</h2>`;
        html += `<table><thead><tr><th style="width:40px">順位</th><th>名前</th><th>着金</th></tr></thead><tbody>`;
        rankingData.forEach((r, i) => {
          html += `<tr><td style="text-align:center">${i + 1}</td><td>${r.name}</td><td class="num">${formatYen(r.received)}</td></tr>`;
        });
        html += `</tbody></table>`;
      }

      html += `</body></html>`;

      // 別ウィンドウで印刷
      const printWindow = window.open('', '_blank', 'width=800,height=1000');
      if (!printWindow) {
        throw new Error('ポップアップがブロックされました。ポップアップを許可してください。');
      }
      printWindow.document.write(html);
      printWindow.document.close();

      // レンダリング完了後に印刷
      printWindow.onload = () => {
        printWindow.print();
      };
      // onloadが発火しない場合のフォールバック
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.print();
        }
      }, 1000);

      onClose();
    } catch (e) {
      console.error('[PdfExport] エラー:', e);
      setError(e.message || 'PDF出力に失敗しました');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div data-pdf-modal style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: THEME.card,
        border: `1px solid ${THEME.border}`,
        borderRadius: 12,
        padding: '24px 28px',
        width: 360,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text, marginBottom: 16 }}>
          PDF出力
        </div>

        <div style={{ fontSize: 11, color: THEME.textSub, marginBottom: 6 }}>
          期間: {periodLabel}
        </div>
        <div style={{ fontSize: 11, color: THEME.textSub, marginBottom: 14 }}>
          対象: {selectedStaff}
        </div>

        <div style={{ fontSize: 11, color: THEME.textSub, marginBottom: 10 }}>含めるセクション:</div>
        {SECTIONS.map(s => (
          <label key={s.key} style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={checked[s.key]}
              onChange={() => toggle(s.key)}
              style={{ accentColor: THEME.accent }}
            />
            <span style={{ fontSize: 11, color: THEME.text }}>{s.label}</span>
          </label>
        ))}

        {error && (
          <div style={{ fontSize: 10, color: THEME.danger, marginTop: 8 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{
            padding: '6px 16px', fontSize: 11, borderRadius: 6,
            border: `1px solid ${THEME.border}`, background: 'transparent', color: THEME.textSub, cursor: 'pointer',
          }}>キャンセル</button>
          <button onClick={handleExport} disabled={exporting} style={{
            padding: '6px 16px', fontSize: 11, borderRadius: 6,
            border: 'none', background: THEME.accent, color: '#fff',
            cursor: exporting ? 'default' : 'pointer',
            opacity: exporting ? 0.7 : 1,
          }}>{exporting ? '出力中...' : 'PDF出力'}</button>
        </div>
      </div>
    </div>
  );
}
