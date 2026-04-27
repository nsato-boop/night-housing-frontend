"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, LineElement, PointElement, Filler,
  Tooltip as ChartTooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { RANKING_COLORS, SALES_STAFF, THEME } from "../utils/colors";
import { formatYen } from "../utils/formatCurrency";
import { getFiscalMonths } from "../utils/dateUtils";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, ChartTooltip);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://night-housing-dashboard.onrender.com";

export default function SalesRanking({ selectedStaff, selectedPeriod }) {
  const [staffSales, setStaffSales] = useState([]);
  const [personalMonthly, setPersonalMonthly] = useState([]);
  const months = useMemo(() => getFiscalMonths().slice(-6), []);

  useEffect(() => {
    if (selectedStaff !== 'チーム全体') return;
    const apiPeriod = selectedPeriod === 'thisWeek' ? 'thisMonth' : selectedPeriod;

    async function fetchAll() {
      const results = [];
      for (const name of SALES_STAFF) {
        try {
          const params = new URLSearchParams({ period: apiPeriod, staff: name });
          const res = await fetch(`${API_URL}/api/sales-3axis?${params}`);
          if (!res.ok) continue;
          const json = await res.json();
          results.push({ name, received: json.received_based?.total || 0 });
        } catch { /* skip */ }
      }
      results.sort((a, b) => b.received - a.received);
      setStaffSales(results);
    }
    fetchAll();
  }, [selectedStaff, selectedPeriod]);

  useEffect(() => {
    if (selectedStaff === 'チーム全体') return;
    async function fetchPersonal() {
      const results = [];
      for (const m of months) {
        try {
          const start = `${m.year}-${String(m.month).padStart(2, '0')}-01`;
          const lastDay = new Date(m.year, m.month, 0).getDate();
          const end = `${m.year}-${String(m.month).padStart(2, '0')}-${lastDay}`;
          const params = new URLSearchParams({ period: 'custom', start, end, staff: selectedStaff });
          const res = await fetch(`${API_URL}/api/sales-3axis?${params}`);
          if (!res.ok) { results.push(0); continue; }
          const json = await res.json();
          results.push(json.received_based?.total || 0);
        } catch { results.push(0); }
      }
      setPersonalMonthly(results);
    }
    fetchPersonal();
  }, [selectedStaff, months]);

  const maxReceived = useMemo(() =>
    Math.max(...staffSales.map(s => s.received), 1),
    [staffSales]
  );

  // 個人選択時：折れ線グラフ
  if (selectedStaff !== 'チーム全体') {
    const lineData = {
      labels: months.map(m => m.label),
      datasets: [{
        data: personalMonthly.map(v => v / 10000),
        borderColor: THEME.accent,
        backgroundColor: 'rgba(15, 118, 110, 0.1)',
        tension: 0.3,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: THEME.accent,
        borderWidth: 2,
      }],
    };

    return (
      <div className="card">
        <div style={{ fontSize: 11, fontWeight: 500, color: THEME.text, marginBottom: 10 }}>
          {selectedStaff} の売上推移
        </div>
        <div style={{ height: 180 }}>
          <Line data={lineData} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: {
              backgroundColor: '#222', titleColor: THEME.text, bodyColor: THEME.text,
              callbacks: { label: ctx => formatYen(ctx.raw * 10000) },
            }},
            scales: {
              y: { beginAtZero: true, ticks: { callback: v => `¥${v}万`, color: THEME.textSub, font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { display: false } },
              x: { ticks: { color: THEME.textSub, font: { size: 9 } }, grid: { display: false }, border: { display: false } },
            },
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ fontSize: 11, fontWeight: 500, color: THEME.text, marginBottom: 10 }}>
        売上ランキング
      </div>
      {staffSales.map((s, i) => {
        const color = RANKING_COLORS[Math.min(i, RANKING_COLORS.length - 1)];
        return (
          <div key={s.name} style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 6,
            height: 20,
          }}>
            <div style={{ width: 18, fontSize: 10, fontWeight: 500, color: THEME.textSub, textAlign: 'right', paddingRight: 6, flexShrink: 0 }}>
              {i + 1}
            </div>
            <div style={{ width: 56, fontSize: 10, color: THEME.text, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.name}
            </div>
            <div style={{ flex: 1, height: 16, background: '#222221', borderRadius: 4 }}>
              <div style={{
                width: `${(s.received / maxReceived) * 100}%`,
                height: '100%',
                background: color,
                borderRadius: 4,
                minWidth: s.received > 0 ? 3 : 0,
                transition: 'width 0.3s',
              }} />
            </div>
            <div style={{ width: 60, textAlign: 'right', fontSize: 10, fontWeight: 500, color: THEME.text, paddingLeft: 8, flexShrink: 0 }}>
              {formatYen(s.received)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
