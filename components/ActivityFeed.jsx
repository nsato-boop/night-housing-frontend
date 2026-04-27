"use client";
import { useMemo } from "react";
import { STATUS_COLOR_MAP } from "./Pipeline";
import { shortDateTime } from "../utils/dateUtils";
import { THEME } from "../utils/colors";

export default function ActivityFeed({ customers, selectedStaff }) {
  const activities = useMemo(() => {
    const nonBlocked = customers.filter(c => !c.is_blocked);
    const filtered = selectedStaff === 'チーム全体'
      ? nonBlocked
      : nonBlocked.filter(c => c.staff === selectedStaff);

    const items = [];
    for (const c of filtered) {
      let history = [];
      try { history = JSON.parse(c.status_history || '[]'); } catch { continue; }
      if (!Array.isArray(history)) continue;

      for (const h of history) {
        if (!h.to || !h.at) continue;
        items.push({
          name: c.display_name || c.real_name || '(名前なし)',
          staff: c.staff || '',
          status: h.to,
          time: h.at,
          color: STATUS_COLOR_MAP[h.to] || THEME.textSub,
        });
      }
    }

    items.sort((a, b) => (b.time || '').localeCompare(a.time || ''));
    return items.slice(0, 4);
  }, [customers, selectedStaff]);

  return (
    <div className="card">
      <div style={{ fontSize: 11, fontWeight: 500, color: THEME.text, marginBottom: 12 }}>
        最近のアクティビティ
      </div>
      {activities.length === 0 && (
        <div style={{ fontSize: 10, color: THEME.textSub, padding: '20px 0', textAlign: 'center' }}>
          アクティビティはありません
        </div>
      )}
      {activities.map((a, i) => (
        <div key={i} style={{
          display: 'flex',
          gap: 10,
          padding: '7px 0',
          borderBottom: i < activities.length - 1 ? `1px solid ${THEME.border}` : 'none',
        }}>
          <div style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: a.color,
            flexShrink: 0,
            marginTop: 5,
          }} />
          <div>
            <div style={{ fontSize: 11, color: THEME.text, lineHeight: 1.4 }}>
              <span style={{ fontWeight: 500 }}>{a.name}</span>
              <span style={{ color: THEME.textSub }}> → {a.status}</span>
            </div>
            <div style={{ fontSize: 10, color: THEME.textSub, marginTop: 2 }}>
              {a.staff} / {shortDateTime(a.time)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
