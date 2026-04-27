"use client";
import { useMemo } from "react";
import { PIPELINE_COLORS, PIPELINE_ORDER, THEME } from "../utils/colors";

const STATUS_MAP = {
  '着金済み': ['仲介手数料着金済み', 'その他売上着金済み', 'AD着金済み'],
  '契約済み': ['契約済み'],
  '審査通過': ['審査通過済み（契約準備中）'],
  '審査中': ['審査中'],
  '内見': ['内見'],
  '物件提案中': ['物件提案中'],
  '失注': ['失注（離脱中・シナリオ配信中）'],
  '未対応': ['未対応'],
};

export const STATUS_COLOR_MAP = {
  '未対応': PIPELINE_COLORS['未対応'],
  '物件提案中': PIPELINE_COLORS['物件提案中'],
  '内見': PIPELINE_COLORS['内見'],
  '審査中': PIPELINE_COLORS['審査中'],
  '審査通過済み（契約準備中）': PIPELINE_COLORS['審査通過'],
  '契約済み': PIPELINE_COLORS['契約済み'],
  '仲介手数料着金済み': PIPELINE_COLORS['着金済み'],
  'その他売上着金済み': PIPELINE_COLORS['着金済み'],
  'AD着金済み': PIPELINE_COLORS['着金済み'],
  '失注（離脱中・シナリオ配信中）': PIPELINE_COLORS['失注'],
};

export default function Pipeline({ customers, selectedStaff }) {
  const stageData = useMemo(() => {
    const nonBlocked = customers.filter(c => !c.is_blocked);
    const filtered = selectedStaff === 'チーム全体'
      ? nonBlocked
      : nonBlocked.filter(c => c.staff === selectedStaff);

    return PIPELINE_ORDER.map(stage => {
      const statuses = STATUS_MAP[stage];
      const count = filtered.filter(c => statuses.includes(c.status)).length;
      return { stage, count, color: PIPELINE_COLORS[stage] };
    });
  }, [customers, selectedStaff]);

  const maxCount = Math.max(...stageData.map(s => s.count), 1);

  return (
    <div className="card">
      <div style={{ fontSize: 11, fontWeight: 500, color: THEME.text, marginBottom: 12 }}>
        パイプライン
      </div>
      {stageData.map(s => (
        <div key={s.stage} style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 7,
          height: 22,
        }}>
          <div style={{
            width: 70,
            textAlign: 'right',
            fontSize: 10,
            color: THEME.textSub,
            flexShrink: 0,
            paddingRight: 10,
          }}>
            {s.stage}
          </div>
          <div style={{ flex: 1, height: 18, background: '#222221', borderRadius: 4, position: 'relative' }}>
            <div style={{
              width: `${(s.count / maxCount) * 100}%`,
              height: '100%',
              background: s.color,
              borderRadius: 4,
              minWidth: s.count > 0 ? 3 : 0,
              transition: 'width 0.3s',
            }} />
          </div>
          <div style={{
            width: 30,
            textAlign: 'right',
            fontSize: 11,
            fontWeight: 500,
            color: THEME.text,
            flexShrink: 0,
            paddingLeft: 8,
          }}>
            {s.count}
          </div>
        </div>
      ))}
    </div>
  );
}
