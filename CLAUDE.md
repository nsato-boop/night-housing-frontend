# CLAUDE.md

## Project Overview

ナイトハウジング 管理ダッシュボード フロントエンド（Next.js 14 on Vercel）。
バックエンドは `night-housing-dashboard`（Express.js on Render）。

## Commands

```bash
npm run dev    # 開発サーバー起動
npm run build  # 本番ビルド
```

## Architecture

- Next.js 14 App Router
- フルクライアントレンダリング（"use client"）
- API: `NEXT_PUBLIC_API_URL` 環境変数（デフォルト: night-housing-dashboard.onrender.com）

## 担当者リスト

澤田, 中尾, 松井, 茂木, 田中和弘, 長田, 太森, 小川（8名）

## Key Files

- `utils/colors.js` — ALL_STAFF, SALES_STAFF, テーマ色定義
- `hooks/useSales.js` — 売上データフック
- `hooks/useCustomers.js` — 顧客データフック
- `components/Header.jsx` — ヘッダー（担当者セレクト・期間選択）
- `views/MainView.jsx` — メインダッシュボード
