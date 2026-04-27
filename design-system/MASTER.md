# Toppa de Chintai — Design System

## Overview

- **Project:** ナイトハウジング 管理ダッシュボード
- **Pattern:** Minimal Single Column
- **Style:** Vibrant & Block-based
- **Stack:** Next.js (App Router)
- **Icon Library:** Lucide React (SVG only — no emojis)

---

## Colors

| Token | Hex | Usage |
|-------|-----|-------|
| **Primary** | `#0F766E` | ヘッダー、アクティブタブ、主要アクション、ブランドカラー（ディープティール） |
| **Secondary** | `#6366F1` | サブアクション、チャート強調、バッジ（スチールブルー / インディゴ） |
| **CTA / Accent** | `#D97706` | CTA ボタン、警告、注目ポイント（アンバー） |
| **Background** | `#F8FAFC` | ページ背景（ほぼ白） |
| **Card** | `#FFFFFF` | カード・パネル背景 |
| **Border** | `#E2E8F0` | ボーダー・仕切り線 |
| **Text Primary** | `#1E293B` | 見出し・本文（チャコール） |
| **Text Secondary** | `#64748B` | 補助テキスト・ラベル |
| **Text Muted** | `#94A3B8` | プレースホルダー・無効テキスト |
| **Hover** | `#F1F5F9` | ホバー状態の背景 |
| **Success** | `#059669` | 成功・成約 |
| **Error** | `#E11D48` | エラー・失注 |
| **Success Bg** | `#F0FDFA` | 成功系の薄い背景 |
| **Error Bg** | `#FFF1F2` | エラー系の薄い背景 |
| **Indigo Bg** | `#EEF2FF` | セカンダリ系の薄い背景 |

### JS Tokens (inline style)

```js
const DS = {
  primary: "#0F766E",
  secondary: "#6366F1",
  cta: "#D97706",
  pageBg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text1: "#1E293B",
  text2: "#64748B",
  text3: "#94A3B8",
  hover: "#F1F5F9",
  success: "#059669",
  error: "#E11D48",
  successBg: "#F0FDFA",
  errorBg: "#FFF1F2",
  secondaryBg: "#EEF2FF",
  shadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowHover: "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
  radius: 12,
  radiusSm: 8,
};
```

---

## Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| **Font Family** | `Inter`, `Noto Sans JP` | — | — |
| **Fallback** | `-apple-system, BlinkMacSystemFont, sans-serif` | — | — |
| **H1 (Page Title)** | Inter | 700 | 28px |
| **H2 (Section Title)** | Inter | 600 | 20px |
| **H3 (Card Title)** | Inter | 600 | 16px |
| **Body** | Inter / Noto Sans JP | 400 | 14px |
| **Small** | Inter / Noto Sans JP | 400 | 12px |
| **Caption** | Inter | 500 | 11px |
| **KPI Number** | Inter | 700 | 32px+ |

### Google Fonts Import

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

---

## Layout

| Token | Value |
|-------|-------|
| **Max Width** | 1280px |
| **Page Padding** | 24px |
| **Section Gap** | 48px+ |
| **Card Padding** | 20px-24px |
| **Border Radius (Card)** | 12px |
| **Border Radius (Small)** | 8px |

### Grid

- KPI cards: `grid-template-columns: repeat(3, 1fr)` or `repeat(4, 1fr)`
- Charts: 70/30 split
- Tables: `tableLayout: fixed` + `<colgroup>`

---

## Shadows

| Level | Value |
|-------|-------|
| **Default** | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` |
| **Hover** | `0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)` |
| **Active Tab** | `0 1px 3px rgba(0,0,0,0.08)` |

---

## Components

### Status Badges

```js
const STATUS_STYLE = {
  "未対応":        { bg: "#E0F2FE", text: "#0369A1" },
  "物件提案中":    { bg: "#F3E8FF", text: "#7C3AED" },
  "内見":          { bg: "#D1FAE5", text: "#059669" },
  "審査中":        { bg: "#FCE7F3", text: "#DB2777" },
  "審査通過済み（契約準備中）": { bg: "#E0E7FF", text: "#4338CA" },
  "仲介手数料着金済み": { bg: "#CCFBF1", text: "#0F766E" },
  "その他売上着金済み": { bg: "#CFFAFE", text: "#0891B2" },
  "契約済み":      { bg: "#D1FAE5", text: "#059669" },
  "AD着金済み":    { bg: "#FEF3C7", text: "#B45309" },
  "失注（離脱中・シナリオ配信中）": { bg: "#F1F5F9", text: "#64748B" },
  "生活保護":      { bg: "#FCE7F3", text: "#DB2777" },
  "追客（物件提案）": { bg: "#FFEDD5", text: "#C2410C" },
};
```

---

## Icons

- **Library:** Lucide React
- **Size:** 16px (inline), 20px (card header), 24px (navigation)
- **Stroke Width:** 1.5
- **Rule:** SVG icons only. No emojis as UI elements.

---

## Pre-Delivery Checklist

- [ ] No emojis as icons (use Lucide SVG)
- [ ] `cursor: pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Text contrast 4.5:1 minimum (WCAG AA)
- [ ] `font-variant-numeric: tabular-nums` on numbers
