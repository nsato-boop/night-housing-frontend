"use client";
import { useState } from "react";
import { THEME } from "../utils/colors";
import { toISODate } from "../utils/dateUtils";

const PRESETS = [
  { label: 'カスタム', key: 'custom' },
  { label: '今日', key: 'today' },
  { label: '昨日', key: 'yesterday' },
  { label: '今週（月〜今日）', key: 'thisWeek' },
  { label: '過去7日間', key: 'last7' },
  { label: '先週（月〜日）', key: 'lastWeek' },
  { label: '過去14日間', key: 'last14' },
  { label: '今月', key: 'thisMonth' },
  { label: '過去30日間', key: 'last30' },
  { label: '先月', key: 'lastMonth' },
  { label: '全期間', key: 'all' },
];

function getPresetRange(key) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (key) {
    case 'today': return { start: today, end: today };
    case 'yesterday': { const y = new Date(today); y.setDate(y.getDate() - 1); return { start: y, end: y }; }
    case 'thisWeek': { const day = today.getDay(); const diff = day === 0 ? 6 : day - 1; const start = new Date(today); start.setDate(start.getDate() - diff); return { start, end: today }; }
    case 'last7': { const start = new Date(today); start.setDate(start.getDate() - 6); return { start, end: today }; }
    case 'lastWeek': { const day = today.getDay(); const diff = day === 0 ? 6 : day - 1; const m = new Date(today); m.setDate(m.getDate() - diff); const lm = new Date(m); lm.setDate(lm.getDate() - 7); const ls = new Date(lm); ls.setDate(ls.getDate() + 6); return { start: lm, end: ls }; }
    case 'last14': { const start = new Date(today); start.setDate(start.getDate() - 13); return { start, end: today }; }
    case 'thisMonth': { return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0) }; }
    case 'last30': { const start = new Date(today); start.setDate(start.getDate() - 29); return { start, end: today }; }
    case 'lastMonth': { return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0) }; }
    case 'all': return { start: new Date(2024, 0, 1), end: today };
    default: return null;
  }
}

function CalendarMonth({ year, month, startDate, endDate, onDayClick }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const days = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  const monthLabel = `${year}年${month + 1}月`;

  return (
    <div style={{ width: 210 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: THEME.text, textAlign: 'center', marginBottom: 6 }}>{monthLabel}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {['月', '火', '水', '木', '金', '土', '日'].map(d => (
          <div key={d} style={{ fontSize: 9, color: THEME.textSub, textAlign: 'center', padding: 2 }}>{d}</div>
        ))}
        {days.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const isStart = startDate && d.getTime() === startDate.getTime();
          const isEnd = endDate && d.getTime() === endDate.getTime();
          const isInRange = startDate && endDate && d >= startDate && d <= endDate;
          const isSelected = isStart || isEnd;
          return (
            <div key={i} onClick={() => onDayClick(d)} style={{
              fontSize: 10, textAlign: 'center', padding: '3px 0', borderRadius: isSelected ? 4 : 0,
              background: isSelected ? THEME.accent : isInRange ? 'rgba(15, 118, 110, 0.2)' : 'transparent',
              color: isSelected ? '#fff' : THEME.text, cursor: 'pointer',
            }}>{d.getDate()}</div>
          );
        })}
      </div>
    </div>
  );
}

export default function DatePicker({ onApply, onClose }) {
  const [selectedPreset, setSelectedPreset] = useState('custom');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [clickState, setClickState] = useState('start');

  const now = new Date();
  // ナビゲーション可能なカレンダー月
  const [calOffset, setCalOffset] = useState(0);
  const m1Year = new Date(now.getFullYear(), now.getMonth() - 1 + calOffset, 1);
  const m2Year = new Date(now.getFullYear(), now.getMonth() + calOffset, 1);
  // 未来月は不可
  const canGoForward = calOffset < 0;

  const handlePresetClick = (key) => {
    setSelectedPreset(key);
    if (key === 'custom') return;
    const range = getPresetRange(key);
    if (range) { setStartDate(range.start); setEndDate(range.end); setClickState('done'); }
  };

  const handleDayClick = (d) => {
    setSelectedPreset('custom');
    if (clickState === 'start' || clickState === 'done') {
      setStartDate(d); setEndDate(null); setClickState('end');
    } else {
      if (d < startDate) { setEndDate(startDate); setStartDate(d); } else { setEndDate(d); }
      setClickState('done');
    }
  };

  const handleApply = () => {
    if (startDate && endDate) onApply({ start: toISODate(startDate), end: toISODate(endDate) });
    onClose();
  };

  return (
    <div style={{
      position: 'absolute', top: 52, right: 0, zIndex: 100,
      background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', width: 560,
    }}>
      <div style={{ display: 'flex', flex: 1 }}>
        <div style={{ width: 140, borderRight: `1px solid ${THEME.border}`, padding: '12px 0' }}>
          {PRESETS.map(p => (
            <div key={p.key} onClick={() => handlePresetClick(p.key)} style={{
              padding: '5px 14px', fontSize: 10, cursor: 'pointer',
              color: selectedPreset === p.key ? THEME.accent : THEME.textSub,
              fontWeight: selectedPreset === p.key ? 500 : 400,
              background: selectedPreset === p.key ? 'rgba(15,118,110,0.1)' : 'transparent',
            }}>{p.label}</div>
          ))}
        </div>
        <div style={{ flex: 1, padding: 14 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input type="text" readOnly value={startDate ? toISODate(startDate) : ''} placeholder="開始日" style={{ flex: 1, padding: '4px 8px', fontSize: 10, background: '#222221', border: `1px solid ${THEME.border}`, borderRadius: 4, color: THEME.text, outline: 'none' }} />
            <span style={{ color: THEME.textSub, fontSize: 10, alignSelf: 'center' }}>〜</span>
            <input type="text" readOnly value={endDate ? toISODate(endDate) : ''} placeholder="終了日" style={{ flex: 1, padding: '4px 8px', fontSize: 10, background: '#222221', border: `1px solid ${THEME.border}`, borderRadius: 4, color: THEME.text, outline: 'none' }} />
          </div>
          {/* カレンダーナビゲーション */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <button type="button" onClick={() => setCalOffset(o => o - 1)} style={navBtnStyle}>◀</button>
            <button type="button" onClick={() => setCalOffset(o => o + 1)} disabled={!canGoForward}
              style={{ ...navBtnStyle, opacity: canGoForward ? 1 : 0.3, cursor: canGoForward ? 'pointer' : 'default' }}>▶</button>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <CalendarMonth year={m1Year.getFullYear()} month={m1Year.getMonth()} startDate={startDate} endDate={endDate} onDayClick={handleDayClick} />
            <CalendarMonth year={m2Year.getFullYear()} month={m2Year.getMonth()} startDate={startDate} endDate={endDate} onDayClick={handleDayClick} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderTop: `1px solid ${THEME.border}`, padding: '10px 14px', gap: 8 }}>
        <button onClick={onClose} style={{ padding: '5px 14px', fontSize: 10, borderRadius: 6, border: `1px solid ${THEME.border}`, background: 'transparent', color: THEME.textSub, cursor: 'pointer' }}>キャンセル</button>
        <button onClick={handleApply} style={{ padding: '5px 14px', fontSize: 10, borderRadius: 6, border: 'none', background: THEME.accent, color: '#fff', cursor: 'pointer' }}>適用</button>
      </div>
    </div>
  );
}

const navBtnStyle = { background: 'none', border: 'none', color: THEME.textSub, cursor: 'pointer', fontSize: 14, padding: '2px 8px' };
