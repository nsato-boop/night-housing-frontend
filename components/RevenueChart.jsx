"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { getFiscalMonths } from "../utils/dateUtils";
import { formatYen } from "../utils/formatCurrency";
import { THEME } from "../utils/colors";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://night-housing-dashboard.onrender.com";

export default function RevenueChart({ selectedStaff }) {
  const [monthlyData, setMonthlyData] = useState([]);
  const months = useMemo(() => getFiscalMonths().slice(-6), []);

  useEffect(() => {
    async function fetchMonthly() {
      const staff = selectedStaff === 'チーム全体' ? '全員' : selectedStaff;
      const results = [];
      for (const m of months) {
        try {
          const start = `${m.year}-${String(m.month).padStart(2, '0')}-01`;
          const lastDay = new Date(m.year, m.month, 0).getDate();
          const end = `${m.year}-${String(m.month).padStart(2, '0')}-${lastDay}`;
          const params = new URLSearchParams({ period: 'custom', start, end, staff });
          const res = await fetch(`${API_URL}/api/sales-3axis?${params}`);
          if (!res.ok) { results.push({ fee: 0, ad: 0, other: 0 }); continue; }
          const json = await res.json();
          results.push({
            fee: json.contract_based?.fee || 0,
            ad: json.contract_based?.ad || 0,
            other: json.contract_based?.other || 0,
          });
        } catch {
          results.push({ fee: 0, ad: 0, other: 0 });
        }
      }
      setMonthlyData(results);
    }
    if (months.length > 0) fetchMonthly();
  }, [months, selectedStaff]);

  const chartData = {
    labels: months.map(m => m.label),
    datasets: [
      {
        label: '仲介',
        data: monthlyData.map(d => d.fee / 10000),
        borderColor: '#0F766E',
        backgroundColor: 'rgba(15, 118, 110, 0.08)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: '#0F766E',
      },
      {
        label: 'AD',
        data: monthlyData.map(d => d.ad / 10000),
        borderColor: '#14B8A6',
        backgroundColor: 'rgba(20, 184, 166, 0.06)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: '#14B8A6',
      },
      {
        label: 'その他',
        data: monthlyData.map(d => d.other / 10000),
        borderColor: '#5EEAD4',
        backgroundColor: 'rgba(94, 234, 212, 0.05)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: '#5EEAD4',
      },
      {
        label: '合計',
        data: monthlyData.map(d => (d.fee + d.ad + d.other) / 10000),
        borderColor: '#E8E6DF',
        borderWidth: 3,
        borderDash: [6, 4],
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: '#E8E6DF',
      },
    ],
  };

  return (
    <div className="card">
      <div style={{ fontSize: 11, fontWeight: 500, color: THEME.text, marginBottom: 10 }}>
        成約売上推移
      </div>
      <div style={{ height: 220 }}>
        <Line
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                align: 'end',
                labels: {
                  color: THEME.textSub,
                  font: { size: 10, family: 'Noto Sans JP' },
                  boxWidth: 10,
                  padding: 12,
                },
              },
              tooltip: {
                backgroundColor: '#222',
                titleColor: THEME.text,
                bodyColor: THEME.text,
                borderColor: THEME.border,
                borderWidth: 1,
                callbacks: {
                  label: ctx => `${ctx.dataset.label}: ${formatYen(ctx.raw * 10000)}`,
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: v => {
                    if (v >= 1) return `¥${v.toLocaleString()}万`;
                    return `¥${(v * 10000).toLocaleString()}`;
                  },
                  color: THEME.textSub,
                  font: { size: 10 },
                },
                grid: { color: 'rgba(255,255,255,0.04)' },
                border: { display: false },
              },
              x: {
                ticks: { color: THEME.textSub, font: { size: 10 } },
                grid: { display: false },
                border: { display: false },
              },
            },
          }}
        />
      </div>
    </div>
  );
}
