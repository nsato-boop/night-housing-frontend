"use client";
import { useMemo, useState, useEffect } from "react";
import { formatYen } from "../utils/formatCurrency";
import { THEME } from "../utils/colors";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://night-housing-dashboard.onrender.com";
const BLUE = '#3B82F6';

function ContractSummaryBox({ sales, lastMonthSales, salesTarget, selectedStaff, selectedPeriod }) {
  const contracted = sales?.contract_based?.total || 0;
  const lastContracted = lastMonthSales?.contract_based?.total || 0;
  const diff = lastContracted > 0
    ? Math.round(((contracted - lastContracted) / lastContracted) * 100)
    : 0;
  const percent = salesTarget > 0 ? Math.round((contracted / salesTarget) * 100) : 0;

  // 直近3ヶ月の成約売上（ミニ棒グラフ用）
  const [monthlyData, setMonthlyData] = useState([]);
  useEffect(() => {
    async function fetchMonthly() {
      const now = new Date();
      const months = [];
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const label = `${month}月`;
        const start = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        months.push({ label, start, end });
      }

      const results = [];
      const staff = selectedStaff === 'チーム全体' ? '全員' : selectedStaff;
      for (const m of months) {
        try {
          const params = new URLSearchParams({ period: 'custom', start: m.start, end: m.end, staff });
          const res = await fetch(`${API_URL}/api/sales-3axis?${params}`);
          if (!res.ok) { results.push({ label: m.label, value: 0 }); continue; }
          const json = await res.json();
          results.push({ label: m.label, value: json.contract_based?.total || 0 });
        } catch { results.push({ label: m.label, value: 0 }); }
      }
      setMonthlyData(results);
    }
    fetchMonthly();
  }, [selectedStaff, selectedPeriod]);

  const maxVal = Math.max(...monthlyData.map(m => m.value), 1);

  return (
    <div className="card" style={{ border: `1.5px solid ${BLUE}` }}>
      <div style={{ fontSize: 11, color: BLUE, fontWeight: 500, marginBottom: 4 }}>
        成約サマリー
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color: BLUE, marginBottom: 2 }}>
        {formatYen(contracted)}
        {salesTarget > 0 && (
          <span style={{ fontSize: 11, fontWeight: 400, color: THEME.textSub, marginLeft: 6 }}>
            / 目標 {formatYen(salesTarget)}
          </span>
        )}
      </div>

      {/* 進捗バー */}
      {salesTarget > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{
              width: `${Math.min(percent, 100)}%`,
              background: BLUE,
            }} />
          </div>
          <div style={{ fontSize: 9, color: THEME.textSub, marginTop: 2 }}>{percent}%</div>
        </div>
      )}

      {/* ミニ棒グラフ */}
      {monthlyData.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, marginTop: 8, marginBottom: 6 }}>
          {monthlyData.map((m, i) => {
            const barHeight = maxVal > 0 ? Math.max((m.value / maxVal) * 96, 3) : 3;
            const isLast = i === monthlyData.length - 1;
            return (
              <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: 8, color: THEME.textSub, marginBottom: 2 }}>
                  {m.value > 0 ? formatYen(m.value) : ''}
                </div>
                <div style={{
                  width: '100%',
                  height: barHeight,
                  background: isLast ? BLUE : 'rgba(59, 130, 246, 0.3)',
                  borderRadius: 3,
                }} />
                <div style={{ fontSize: 8, color: THEME.textSub, marginTop: 2 }}>{m.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* 先月比 */}
      <div style={{ fontSize: 10, color: diff >= 0 ? '#639922' : '#E24B4A' }}>
        先月比 {diff >= 0 ? '+' : ''}{diff}%
      </div>
    </div>
  );
}

export default function RevenueBoxes({ sales, loadingSales, lastMonthSales, salesTarget, customers, selectedStaff, selectedPeriod }) {
  if (!sales && loadingSales) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 12 }}>
        売上データ読み込み中...
      </div>
    );
  }
  if (!sales) return null;

  return (
    <ContractSummaryBox
      sales={sales}
      lastMonthSales={lastMonthSales}
      salesTarget={salesTarget}
      selectedStaff={selectedStaff}
      selectedPeriod={selectedPeriod}
    />
  );
}
