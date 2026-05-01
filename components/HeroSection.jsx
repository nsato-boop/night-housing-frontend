"use client";
import { useMemo, useState, useEffect } from "react";
import { formatYen } from "../utils/formatCurrency";
import { getThisMonth, getLastMonth, getThisFiscal, getThisWeek, isInPeriod, parseDate } from "../utils/dateUtils";
import { THEME } from "../utils/colors";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://night-housing-dashboard.onrender.com";

const CONTRACT_STATUSES = ['審査通過済み（契約準備中）', '仲介手数料着金済み', 'その他売上着金済み', '契約済み', 'AD着金済み'];
const ACTIVE_STATUSES = ['物件提案中', '内見', '審査中', '審査通過済み（契約準備中）'];
const LOSS_STATUS = '失注（離脱中・シナリオ配信中）';

function getPeriodRange(period) {
  if (period === 'fiscal') return getThisFiscal();
  if (period === 'thisWeek') return getThisWeek();
  return getThisMonth();
}

export default function HeroSection({ customers, sales, loadingSales, lastMonthSales, goals, selectedStaff, selectedPeriod, customDateRange, onOpenSalesDetail }) {
  // スプシベースの売上データ
  const [sheetSales, setSheetSales] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedStaff && selectedStaff !== 'チーム全体') params.set('staff', selectedStaff);
    if (customDateRange) {
      if (customDateRange.start) params.set('start', customDateRange.start);
      if (customDateRange.end) params.set('end', customDateRange.end);
    } else {
      const range = getPeriodRange(selectedPeriod);
      const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      params.set('start', fmt(range.start));
      params.set('end', fmt(range.end));
    }
    fetch(`${API_URL}/api/sales-detail?${params}`)
      .then(r => r.json())
      .then(d => { if (d.success !== false) setSheetSales(d.summary); })
      .catch(() => {});
  }, [selectedStaff, selectedPeriod, customDateRange]);

  const data = useMemo(() => {
    const filtered = selectedStaff === 'チーム全体'
      ? customers
      : customers.filter(c => c.staff === selectedStaff);

    const { start, end } = getPeriodRange(selectedPeriod);
    const lastMonth = getLastMonth();

    // 成約売上（スプシベース）
    const contracted = sheetSales?.contractedAmount || 0;
    // 着金合計（スプシベース）
    const received = sheetSales?.receivedAmount || 0;
    // 売上見込み（スプシベース）
    const prospect = sheetSales?.prospectAmount || 0;

    // 新規追加
    const newCount = filtered.filter(c =>
      isInPeriod(c.follow_date || c.created_at, start, end)
    ).length;
    const lastNewCount = filtered.filter(c =>
      isInPeriod(c.follow_date || c.created_at, lastMonth.start, lastMonth.end)
    ).length;
    const newDiff = newCount - lastNewCount;

    // 進行中
    const active = filtered.filter(c => ACTIVE_STATUSES.includes(c.status));
    const proposalCount = active.filter(c => c.status === '物件提案中').length;
    const viewingCount = active.filter(c => c.status === '内見').length;
    const examCount = active.filter(c => c.status === '審査中' || c.status === '審査通過済み（契約準備中）').length;

    // 契約
    const contractCount = filtered.filter(c =>
      CONTRACT_STATUSES.includes(c.status) &&
      isInPeriod(c.contract_date, start, end)
    ).length;
    const contractRate = newCount > 0 ? ((contractCount / newCount) * 100).toFixed(1) : '0';

    // 失注
    const lossCount = filtered.filter(c => c.status === LOSS_STATUS).length;
    const lossRate = (newCount + lossCount) > 0
      ? Math.round((lossCount / (newCount + lossCount)) * 100)
      : 0;

    // 目標
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let salesTarget = 0;
    if (selectedStaff === 'チーム全体') {
      const teamGoal = goals.find(g => g.staff === 'チーム全体' && g.month === monthStr);
      salesTarget = teamGoal ? Number(teamGoal.salesTarget) || 0 : 0;
    } else {
      const g = goals.find(g => g.staff === selectedStaff && g.month === monthStr);
      salesTarget = g ? Number(g.salesTarget) || 0 : 0;
    }
    const targetPercent = salesTarget > 0 ? Math.round((contracted / salesTarget) * 100) : 0;

    return {
      contracted, received, prospect,
      newCount, newDiff,
      activeCount: active.length, proposalCount, viewingCount, examCount,
      contractCount, contractRate,
      lossCount, lossRate,
      salesTarget, targetPercent,
    };
  }, [customers, goals, selectedStaff, selectedPeriod, customDateRange, sheetSales]);

  const d = data;

  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      {/* 成約売上 + 着金合計 + 売上見込み 横並び */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
        <div style={{ flex: 1.2 }}>
          <div style={{ fontSize: 11, color: '#93C5FD', marginBottom: 2 }}>成約売上</div>
          <div style={{ fontSize: 42, fontWeight: 600, color: '#3B82F6' }}>{!sheetSales ? '...' : formatYen(d.contracted)}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: THEME.textSub, marginBottom: 2 }}>着金合計</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: THEME.accent }}>{!sheetSales ? '...' : formatYen(d.received)}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: THEME.textSub, marginBottom: 2 }}>売上見込み</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: '#5EEAD4' }}>{!sheetSales ? '...' : formatYen(d.prospect)}</div>
        </div>
      </div>

      {/* 目標進捗バー（成約ベース） */}
      {d.salesTarget > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div className="progress-bar" style={{ marginBottom: 4 }}>
            <div className="progress-bar-fill" style={{
              width: `${Math.min(d.targetPercent, 100)}%`,
              background: '#3B82F6',
            }} />
          </div>
          <div style={{ fontSize: 10, color: THEME.textSub }}>
            {formatYen(d.contracted)} / {formatYen(d.salesTarget)}（{d.targetPercent}%）
          </div>
        </div>
      )}

      {/* KPI 2x2 グリッド */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
      }}>
        <div style={{ background: '#222221', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: THEME.textSub }}>新規追加</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: THEME.text }}>{d.newCount}</div>
          <div style={{ fontSize: 10, color: d.newDiff >= 0 ? THEME.success : THEME.danger }}>
            {d.newDiff >= 0 ? '+' : ''}{d.newDiff}
          </div>
        </div>

        <div style={{ background: '#222221', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: THEME.textSub }}>契約</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: THEME.text }}>{d.contractCount}</div>
          <div style={{ fontSize: 10, color: THEME.textSub }}>率 {d.contractRate}%</div>
        </div>

        <div style={{ background: '#222221', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: THEME.textSub }}>進行中</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: THEME.text }}>{d.activeCount}</div>
          <div style={{ fontSize: 10, color: THEME.textSub }}>
            提案{d.proposalCount} / 内見{d.viewingCount} / 審査{d.examCount}
          </div>
        </div>

        <div style={{ background: '#222221', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: THEME.textSub }}>失注</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: THEME.text }}>{d.lossCount}</div>
          <div style={{ fontSize: 10, color: THEME.danger }}>{d.lossRate}%</div>
        </div>
      </div>

      {onOpenSalesDetail && (
        <button
          onClick={onOpenSalesDetail}
          style={{
            marginTop: 12, padding: '8px 16px', borderRadius: 6,
            border: 'none', background: '#14B8A6', color: '#fff',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%',
          }}
        >
          売上詳細を見る
        </button>
      )}
    </div>
  );
}
