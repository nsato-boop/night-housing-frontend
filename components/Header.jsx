"use client";
import { ALL_STAFF, THEME } from "../utils/colors";

const PERIOD_OPTIONS = [
  { key: 'thisWeek', label: '今週' },
  { key: 'thisMonth', label: '今月' },
  { key: 'fiscal', label: '今期' },
  { key: 'trends', label: '推移分析' },
];

export default function Header({
  selectedStaff, onStaffChange,
  selectedPeriod, onPeriodChange,
  onGoalClick, onPdfClick,
  dateLabel, onDateClick,
  isCustomDate,
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 0',
      borderBottom: `1px solid ${THEME.border}`,
      marginBottom: 16,
    }}>
      {/* 左：タイトル + セレクト */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: THEME.text, whiteSpace: 'nowrap' }}>
          ナイトハウジング ダッシュボード
        </span>
        <select
          value={selectedStaff}
          onChange={e => onStaffChange(e.target.value)}
          style={{
            fontSize: 11,
            border: `1px solid ${THEME.border}`,
            borderRadius: 6,
            padding: '5px 10px',
            color: THEME.text,
            background: THEME.card,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {ALL_STAFF.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* 右：アクションボタン + 期間 + 日付 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* 目標設定 */}
        <button
          onClick={onGoalClick}
          style={{
            fontSize: 11,
            padding: '5px 10px',
            border: `1px solid ${THEME.border}`,
            borderRadius: 6,
            background: THEME.card,
            color: THEME.textSub,
            cursor: 'pointer',
          }}
        >
          ⚙️ 目標設定
        </button>

        {/* PDF出力 */}
        <button
          onClick={onPdfClick}
          style={{
            fontSize: 11,
            padding: '5px 10px',
            border: `1px solid ${THEME.border}`,
            borderRadius: 6,
            background: THEME.card,
            color: THEME.textSub,
            cursor: 'pointer',
          }}
        >
          📄 PDF出力
        </button>

        <div style={{ width: 1, height: 20, background: THEME.border, margin: '0 4px' }} />

        {/* 期間ボタン */}
        {PERIOD_OPTIONS.map(p => {
          const isActive = !isCustomDate && selectedPeriod === p.key;
          return (
            <button
              key={p.key}
              onClick={() => onPeriodChange(p.key)}
              style={{
                fontSize: 11,
                padding: '5px 12px',
                border: `1px solid ${isActive ? THEME.accent : THEME.border}`,
                borderRadius: 6,
                background: isActive ? THEME.accent : THEME.card,
                color: isActive ? '#fff' : THEME.textSub,
                cursor: 'pointer',
                fontWeight: isActive ? 500 : 400,
                transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          );
        })}

        {/* 日付セレクター */}
        <button
          onClick={onDateClick}
          style={{
            fontSize: 11,
            padding: '5px 10px',
            border: `1px solid ${isCustomDate ? THEME.accent : THEME.border}`,
            borderRadius: 6,
            background: isCustomDate ? THEME.accent : THEME.card,
            color: isCustomDate ? '#fff' : THEME.textSub,
            cursor: 'pointer',
          }}
        >
          📅 {dateLabel || '日付'}
        </button>
      </div>
    </div>
  );
}
