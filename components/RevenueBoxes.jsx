"use client";
import { useState, useEffect } from "react";
import { formatYen } from "../utils/formatCurrency";
import { getThisMonth, getThisFiscal, getThisWeek } from "../utils/dateUtils";
import { THEME } from "../utils/colors";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://night-housing-dashboard.onrender.com";
const BLUE = '#3B82F6';

function getPeriodRange(period) {
  if (period === 'fiscal') return getThisFiscal();
  if (period === 'thisWeek') return getThisWeek();
  return getThisMonth();
}

export default function RevenueBoxes({ sales, loadingSales, lastMonthSales, salesTarget, customers, selectedStaff, selectedPeriod, customDateRange }) {
  const [sheetSales, setSheetSales] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedStaff, selectedPeriod, customDateRange]);

  const contracted = sheetSales?.contractedAmount || 0;
  const percent = salesTarget > 0 ? Math.round((contracted / salesTarget) * 100) : 0;

  if (loading && !sheetSales) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 12 }}>
        売上データ読み込み中...
      </div>
    );
  }

  return (
    <div className="card" style={{ border: `1.5px solid ${BLUE}` }}>
      <div style={{ fontSize: 11, color: BLUE, fontWeight: 500, marginBottom: 4 }}>成約サマリー</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: BLUE, marginBottom: 2 }}>
        {formatYen(contracted)}
        {salesTarget > 0 && <span style={{ fontSize: 11, fontWeight: 400, color: THEME.textSub, marginLeft: 6 }}>/ 目標 {formatYen(salesTarget)}</span>}
      </div>
      {salesTarget > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${Math.min(percent, 100)}%`, background: BLUE }} /></div>
          <div style={{ fontSize: 9, color: THEME.textSub, marginTop: 2 }}>{percent}%</div>
        </div>
      )}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}><span style={{ color: THEME.textSub }}>成約件数</span><span style={{ color: THEME.text, fontWeight: 500 }}>{sheetSales?.totalDeals || 0}件</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}><span style={{ color: THEME.textSub }}>着金済み</span><span style={{ color: THEME.accent, fontWeight: 500 }}>{formatYen(sheetSales?.receivedAmount || 0)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}><span style={{ color: THEME.textSub }}>売上見込み</span><span style={{ color: '#5EEAD4', fontWeight: 500 }}>{formatYen(sheetSales?.prospectAmount || 0)}</span></div>
      </div>
    </div>
  );
}
