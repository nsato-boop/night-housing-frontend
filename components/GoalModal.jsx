"use client";
import { useState, useEffect } from "react";
import { SALES_STAFF, THEME } from "../utils/colors";

export default function GoalModal({ goals, onSave, onClose }) {
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const getGoalValue = (staff) => {
    const g = goals.find(g => g.staff === staff && g.month === monthStr);
    return g ? Math.round((Number(g.salesTarget) || 0) / 10000) : '';
  };

  const [teamGoal, setTeamGoal] = useState(getGoalValue('チーム全体'));
  const [personalGoals, setPersonalGoals] = useState(() =>
    SALES_STAFF.reduce((acc, name) => {
      acc[name] = getGoalValue(name);
      return acc;
    }, {})
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const promises = [];

    if (teamGoal !== '' && teamGoal !== getGoalValue('チーム全体')) {
      promises.push(onSave('チーム全体', monthStr, Number(teamGoal) * 10000));
    }
    for (const name of SALES_STAFF) {
      if (personalGoals[name] !== '' && personalGoals[name] !== getGoalValue(name)) {
        promises.push(onSave(name, monthStr, Number(personalGoals[name]) * 10000));
      }
    }

    await Promise.all(promises);
    setSaving(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: THEME.card,
        border: `1px solid ${THEME.border}`,
        borderRadius: 12,
        padding: '24px 28px',
        width: 380,
        maxHeight: '80vh',
        overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text, marginBottom: 20 }}>
          ⚙️ 月間目標設定
        </div>

        {/* チーム全体 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: THEME.textSub, marginBottom: 6 }}>チーム全体目標</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: THEME.textSub }}>¥</span>
            <input
              type="number"
              value={teamGoal}
              onChange={e => setTeamGoal(e.target.value)}
              placeholder="100"
              style={{
                width: '100%', padding: '6px 10px', fontSize: 13,
                background: '#222221', border: `1px solid ${THEME.border}`, borderRadius: 6,
                color: THEME.text, outline: 'none',
              }}
            />
            <span style={{ fontSize: 12, color: THEME.textSub }}>万</span>
          </div>
        </div>

        <div style={{ fontSize: 11, color: THEME.textSub, marginBottom: 10, borderTop: `1px solid ${THEME.border}`, paddingTop: 12 }}>
          個人別目標
        </div>

        {SALES_STAFF.map(name => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 70, fontSize: 11, color: THEME.text }}>{name}</div>
            <span style={{ fontSize: 12, color: THEME.textSub }}>¥</span>
            <input
              type="number"
              value={personalGoals[name]}
              onChange={e => setPersonalGoals(prev => ({ ...prev, [name]: e.target.value }))}
              placeholder="0"
              style={{
                flex: 1, padding: '5px 8px', fontSize: 12,
                background: '#222221', border: `1px solid ${THEME.border}`, borderRadius: 6,
                color: THEME.text, outline: 'none',
              }}
            />
            <span style={{ fontSize: 12, color: THEME.textSub }}>万</span>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{
            padding: '6px 16px', fontSize: 11, borderRadius: 6,
            border: `1px solid ${THEME.border}`, background: 'transparent', color: THEME.textSub, cursor: 'pointer',
          }}>キャンセル</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '6px 16px', fontSize: 11, borderRadius: 6,
            border: 'none', background: THEME.accent, color: '#fff', cursor: 'pointer',
            opacity: saving ? 0.6 : 1,
          }}>{saving ? '保存中...' : '保存'}</button>
        </div>
      </div>
    </div>
  );
}
