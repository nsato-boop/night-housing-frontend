"use client";
import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://night-housing-dashboard.onrender.com";

export function useGoals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/goals`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setGoals(json.data || []);
    } catch (e) {
      console.error("[useGoals]", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveGoal = useCallback(async (staff, month, salesTarget, contractTarget = 0) => {
    try {
      const res = await fetch(`${API_URL}/api/goals/${encodeURIComponent(staff)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, salesTarget, contractTarget }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetch_();
      return true;
    } catch (e) {
      console.error("[useGoals] save error:", e.message);
      return false;
    }
  }, [fetch_]);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 120000);
    return () => clearInterval(id);
  }, [fetch_]);

  return { goals, loading, refetch: fetch_, saveGoal };
}
