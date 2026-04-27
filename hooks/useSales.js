"use client";
import { useState, useEffect, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://night-housing-dashboard.onrender.com";

/**
 * @param {string} period - "thisMonth" | "fiscal" | "custom"
 * @param {string} staff - "全員" | staffName
 * @param {{ start: string, end: string }} [dateRange] - custom期間用 "YYYY-MM-DD"
 */
export function useSales(period = "thisMonth", staff = "全員", dateRange = null) {
  const [sales, setSales] = useState(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef(null);

  const startStr = dateRange?.start || '';
  const endStr = dateRange?.end || '';

  useEffect(() => {
    // 前回のリクエストをキャンセル（レースコンディション防止）
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    const params = new URLSearchParams({ period, staff });
    if (period === 'custom' && startStr && endStr) {
      params.set('start', startStr);
      params.set('end', endStr);
    }

    fetch(`${API_URL}/api/sales-3axis?${params}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (!controller.signal.aborted) setSales(json);
      })
      .catch(e => {
        if (e.name !== 'AbortError') console.error("[useSales]", e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [period, staff, startStr, endStr]);

  return { sales, loading };
}
