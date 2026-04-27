"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import SummaryKpis from "../components/SummaryKpis";
import MonthlyTable from "../components/MonthlyTable";
import Pipeline from "../components/Pipeline";
import { getFiscalMonths } from "../utils/dateUtils";
import { formatYen } from "../utils/formatCurrency";
import { THEME } from "../utils/colors";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://night-housing-dashboard.onrender.com";

const TABS = [
  { key: 'received', label: '着金' },
  { key: 'contract', label: '成約' },
  { key: 'prospect', label: '見込み' },
];

export default function TrendView({ customers, selectedStaff }) {
  const [monthlyData, setMonthlyData] = useState([]);
  const [activeTab, setActiveTab] = useState('received');
  const months = useMemo(() => getFiscalMonths(), []);

  useEffect(() => {
    const staff = selectedStaff === 'チーム全体' ? '全員' : selectedStaff;
    async function fetchAll() {
      const results = [];
      for (const m of months) {
        try {
          const start = `${m.year}-${String(m.month).padStart(2, '0')}-01`;
          const lastDay = new Date(m.year, m.month, 0).getDate();
          const end = `${m.year}-${String(m.month).padStart(2, '0')}-${lastDay}`;
          const params = new URLSearchParams({ period: 'custom', start, end, staff });
          const res = await fetch(`${API_URL}/api/sales-3axis?${params}`);
          if (!res.ok) { results.push({ fee: 0, ad: 0, other: 0, p_fee: 0, p_ad: 0, p_other: 0, c_fee: 0, c_ad: 0, c_other: 0 }); continue; }
          const json = await res.json();
          results.push({
            fee: json.received_based?.fee || 0,
            ad: json.received_based?.ad || 0,
            other: json.received_based?.other || 0,
            p_fee: json.prospect?.fee || 0,
            p_ad: json.prospect?.ad || 0,
            p_other: json.prospect?.other || 0,
            c_fee: json.contract_based?.fee || 0,
            c_ad: json.contract_based?.ad || 0,
            c_other: json.contract_based?.other || 0,
          });
        } catch {
          results.push({ fee: 0, ad: 0, other: 0, p_fee: 0, p_ad: 0, p_other: 0, c_fee: 0, c_ad: 0, c_other: 0 });
        }
      }
      setMonthlyData(results);
    }
    if (months.length > 0) fetchAll();
  }, [months, selectedStaff]);

  const getDataForTab = (tab) => {
    return monthlyData.map(d => {
      if (tab === 'prospect') return { fee: d.p_fee, ad: d.p_ad, other: d.p_other };
      if (tab === 'contract') return { fee: d.c_fee, ad: d.c_ad, other: d.c_other };
      return { fee: d.fee, ad: d.ad, other: d.other };
    });
  };

  const tabData = getDataForTab(activeTab);

  const chartData = {
    labels: months.map(m => m.label),
    datasets: [
      {
        label: '仲介', data: tabData.map(d => d.fee / 10000),
        borderColor: '#0F766E', backgroundColor: 'rgba(15,118,110,0.08)',
        borderWidth: 2.5, fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#0F766E',
      },
      {
        label: 'AD', data: tabData.map(d => d.ad / 10000),
        borderColor: '#14B8A6', backgroundColor: 'rgba(20,184,166,0.06)',
        borderWidth: 2.5, fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#14B8A6',
      },
      {
        label: 'その他', data: tabData.map(d => d.other / 10000),
        borderColor: '#5EEAD4', backgroundColor: 'rgba(94,234,212,0.05)',
        borderWidth: 2.5, fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#5EEAD4',
      },
      {
        label: '合計', data: tabData.map(d => (d.fee + d.ad + d.other) / 10000),
        borderColor: '#E8E6DF', borderWidth: 3, borderDash: [6, 4],
        fill: false, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#E8E6DF',
      },
    ],
  };

  return (
    <>
      {/* 全幅チャート */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: THEME.text }}>売上推移</span>
          <div style={{ display: 'flex', gap: 2 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                fontSize: 10, padding: '3px 10px', borderRadius: 4,
                border: `1px solid ${activeTab === t.key ? THEME.accent : THEME.border}`,
                background: activeTab === t.key ? THEME.accent : 'transparent',
                color: activeTab === t.key ? '#fff' : THEME.textSub,
                cursor: 'pointer',
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 300 }}>
          <Line data={chartData} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top', align: 'end',
                labels: { color: THEME.textSub, font: { size: 10 }, boxWidth: 10, padding: 12 },
              },
              tooltip: {
                backgroundColor: '#222', titleColor: THEME.text, bodyColor: THEME.text,
                borderColor: THEME.border, borderWidth: 1,
                callbacks: { label: ctx => `${ctx.dataset.label}: ${formatYen(ctx.raw * 10000)}` },
              },
            },
            scales: {
              y: { beginAtZero: true, ticks: { callback: v => `¥${v}万`, color: THEME.textSub, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { display: false } },
              x: { ticks: { color: THEME.textSub, font: { size: 10 } }, grid: { display: false }, border: { display: false } },
            },
          }} />
        </div>
      </div>

      {/* サマリーKPI */}
      <SummaryKpis
        monthlyData={monthlyData}
        months={months}
        customers={customers}
        selectedStaff={selectedStaff}
      />

      {/* 下段2カラム：月別内訳 + パイプライン */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <MonthlyTable
          monthlyData={monthlyData}
          months={months}
          customers={customers}
          selectedStaff={selectedStaff}
        />
        <Pipeline customers={customers} selectedStaff={selectedStaff} />
      </div>
    </>
  );
}
