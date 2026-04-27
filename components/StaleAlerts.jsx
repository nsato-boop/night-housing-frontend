"use client";
import { useMemo } from "react";
import { THEME } from "../utils/colors";
import { parseDate } from "../utils/dateUtils";

export default function StaleAlerts({ customers, selectedStaff }) {
  const alerts = useMemo(() => {
    const nonBlocked = customers.filter(c => !c.is_blocked);
    const filtered = selectedStaff === 'チーム全体'
      ? nonBlocked
      : nonBlocked.filter(c => c.staff === selectedStaff);

    const now = new Date();
    const items = [];

    for (const c of filtered) {
      if (c.status !== '物件提案中') continue;

      // status_historyから物件提案中に入った日時を取得
      let enteredAt = null;
      try {
        const history = JSON.parse(c.status_history || '[]');
        if (Array.isArray(history)) {
          for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].to === '物件提案中' && history[i].at) {
              enteredAt = parseDate(history[i].at);
              break;
            }
          }
        }
      } catch { /* ignore */ }

      if (!enteredAt) {
        enteredAt = parseDate(c.updated_at) || parseDate(c.created_at);
      }
      if (!enteredAt) continue;

      const days = Math.floor((now - enteredAt) / (1000 * 60 * 60 * 24));
      if (days < 7) continue;

      items.push({
        name: c.display_name || c.real_name || '(名前なし)',
        staff: c.staff || '',
        days,
        status: c.status,
        severity: days >= 14 ? 'danger' : 'warning',
      });
    }

    items.sort((a, b) => b.days - a.days);
    return items;
  }, [customers, selectedStaff]);

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: THEME.text }}>
          ⚠️ 停滞アラート
        </span>
        {alerts.length > 0 && (
          <span style={{
            fontSize: 9,
            fontWeight: 600,
            color: '#fff',
            background: THEME.danger,
            borderRadius: 10,
            padding: '1px 7px',
          }}>
            {alerts.length}件
          </span>
        )}
      </div>

      {alerts.length === 0 && (
        <div style={{ textAlign: 'center', color: THEME.textSub, fontSize: 11, padding: '24px 0' }}>
          ✅ 停滞案件なし
        </div>
      )}

      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {alerts.map((a, i) => {
          const badgeColor = a.severity === 'danger' ? THEME.danger : THEME.warning;
          const badgeBg = a.severity === 'danger' ? 'rgba(226, 75, 74, 0.15)' : 'rgba(217, 119, 6, 0.15)';
          return (
            <div key={i} style={{
              padding: '8px 0',
              borderBottom: i < alerts.length - 1 ? `1px solid ${THEME.border}` : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: badgeColor,
                  background: badgeBg,
                  borderRadius: 4,
                  padding: '1px 6px',
                }}>
                  {a.days}日
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: THEME.text }}>{a.name}</span>
              </div>
              <div style={{ fontSize: 10, color: THEME.textSub, paddingLeft: 42 }}>
                {a.status} → 担当: {a.staff}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
