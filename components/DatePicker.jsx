"use client";
import { useState, useMemo } from "react";
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
    case 'today':
      return { start: today, end: today };
    case 'yesterday': {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      return { start: y, end: y };
    }
    case 'thisWeek': {
      const day = today.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const start = new Date(today); start.setDate(start.getDate() - diff);
      return { start, end: today };
    }
    case 'last7': {
      const start = new Date(today); start.setDate(start.getDate() - 6);
      return { start, end: today };
    }
    case 'lastWeek': {
      const day = today.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const thisMonday = new Date(today); thisMonday.setDate(thisMonday.getDate() - diff);
      const lastMonday = new Date(thisMonday); lastMonday.setDate(lastMonday.getDate() - 7);
      const lastSunday = new Date(lastMonday); lastSunday.setDate(lastSunday.getDate() + 6);
      return { start: lastMonday, end: lastSunday };
    }
    case 'last14': {
      const start = new Date(today); start.setDate(start.getDate() - 13);
      return { start, end: today };
    }
    case 'thisMonth': {
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfMonth };
    }
    case 'last30': {
      const start = new Date(today); start.setDate(start.getDate() - 29);
      return { start, end: today };
    }
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start, end };
    }
    case 'all':
      return { start: new Date(2026, 0, 1), end: today };
    default:
      return null;
  }
}

function CalendarMonth({ year, month, startDate, endDate, onDayClick }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // 月曜=0

  const days = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));

  const monthLabel = `${year}年${month + 1}月`;

  return (
    <div style={{ width: 210 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: THEME.text, textAlign: 'center', marginBottom: 6 }}>
        {monthLabel}
      </div>
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
          const isFuture = d > today;

          return (
            <div
              key={i}
              onClick={() => onDayClick(d)}
              style={{
                fontSize: 10,
                textAlign: 'center',
                padding: '3px 0',
                borderRadius: isSelected ? 4 : 0,
                background: isSelected ? THEME.accent : isInRange ? 'rgba(15, 118, 110, 0.2)' : 'transparent',
                color: isSelected ? '#fff' : isFuture ? THEME.textSub : THEME.text,
                cursor: 'pointer',
              }}
            >
              {d.getDate()}
            </div>
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
  const calMonth1 = { year: now.getFullYear(), month: now.getMonth() - 1 };
  const calMonth2 = { year: now.getFullYear(), month: now.getMonth() };

  const handlePresetClick = (key) => {
    setSelectedPreset(key);
    if (key === 'custom') return;
    const range = getPresetRange(key);
    if (range) {
      setStartDate(range.start);
      setEndDate(range.end);
      setClickState('done');
    }
  };

  const handleDayClick = (d) => {
    setSelectedPreset('custom');
    if (clickState === 'start' || clickState === 'done') {
      setStartDate(d);
      setEndDate(null);
      setClickState('end');
    } else {
      if (d < startDate) {
        setEndDate(startDate);
        setStartDate(d);
      } else {
        setEndDate(d);
      }
      setClickState('done');
    }
  };

  const handleApply = () => {
    if (startDate && endDate) {
      onApply({ start: toISODate(startDate), end: toISODate(endDate) });
    }
    onClose();
  };

  const handleCompareClick = () => {
    alert('この機能は近日追加予定です');
  };

  return (
    <div style={{
      position: 'absolute', top: 52, right: 0, zIndex: 100,
      background: THEME.card,
      border: `1px solid ${THEME.border}`,
      borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display: 'flex',
      flexDirection: 'column',
      width: 560,
    }}>
      <div style={{ display: 'flex', flex: 1 }}>
        {/* 左パネル：プリセット */}
        <div style={{
          width: 140, borderRight: `1px solid ${THEME.border}`,
          padding: '12px 0',
        }}>
          {PRESETS.map(p => (
            <div
              key={p.key}
              onClick={() => handlePresetClick(p.key)}
              style={{
                padding: '5px 14px',
                fontSize: 10,
                color: selectedPreset === p.key ? THEME.accent : THEME.textSub,
                cursor: 'pointer',
                fontWeight: selectedPreset === p.key ? 500 : 400,
                background: selectedPreset === p.key ? 'rgba(15,118,110,0.1)' : 'transparent',
              }}
            >
              {p.label}
            </div>
          ))}
        </div>

        {/* 右パネル：カレンダー */}
        <div style={{ flex: 1, padding: 14 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              readOnly
              value={startDate ? toISODate(startDate) : ''}
              placeholder="開始日"
              style={{
                flex: 1, padding: '4px 8px', fontSize: 10,
                background: '#222221', border: `1px solid ${THEME.border}`, borderRadius: 4,
                color: THEME.text, outline: 'none',
              }}
            />
            <span style={{ color: THEME.textSub, fontSize: 10, alignSelf: 'center' }}>〜</span>
            <input
              type="text"
              readOnly
              value={endDate ? toISODate(endDate) : ''}
              placeholder="終了日"
              style={{
                flex: 1, padding: '4px 8px', fontSize: 10,
                background: '#222221', border: `1px solid ${THEME.border}`, borderRadius: 4,
                color: THEME.text, outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <CalendarMonth
              year={calMonth1.year} month={calMonth1.month}
              startDate={startDate} endDate={endDate}
              onDayClick={handleDayClick}
            />
            <CalendarMonth
              year={calMonth2.year} month={calMonth2.month}
              startDate={startDate} endDate={endDate}
              onDayClick={handleDayClick}
            />
          </div>
        </div>
      </div>

      {/* フッター */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: `1px solid ${THEME.border}`,
        padding: '10px 14px',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          onClick={handleCompareClick}>
          <div style={{
            width: 28, height: 14, background: '#333', borderRadius: 7,
            position: 'relative',
          }}>
            <div style={{
              width: 10, height: 10, background: '#555', borderRadius: '50%',
              position: 'absolute', top: 2, left: 2,
            }} />
          </div>
          <span style={{ fontSize: 10, color: THEME.textSub }}>比較</span>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{
            padding: '5px 14px', fontSize: 10, borderRadius: 6,
            border: `1px solid ${THEME.border}`, background: 'transparent', color: THEME.textSub, cursor: 'pointer',
          }}>キャンセル</button>
          <button onClick={handleApply} style={{
            padding: '5px 14px', fontSize: 10, borderRadius: 6,
            border: 'none', background: THEME.accent, color: '#fff', cursor: 'pointer',
          }}>適用</button>
        </div>
      </div>
    </div>
  );
}
