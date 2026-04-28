"use client";
import { useState, useMemo } from "react";
import { THEME } from "../utils/colors";
import { formatYen } from "../utils/formatCurrency";
import { parseDate, getThisMonth, getLastMonth, getThisFiscal, getThisWeek } from "../utils/dateUtils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://night-housing-dashboard.onrender.com";

// 審査通過以降のステータス（着金確認の対象）
const TARGET_STATUSES = [
  "審査通過済み（契約準備中）",
  "契約済み",
  "仲介手数料着金済み",
  "AD着金済み",
  "その他売上着金済み",
];

function getPeriodRange(selectedPeriod, customDateRange) {
  if (customDateRange) {
    return {
      start: parseDate(customDateRange.start),
      end: parseDate(customDateRange.end) || new Date(9999, 11, 31),
    };
  }
  switch (selectedPeriod) {
    case "thisMonth": return getThisMonth();
    case "lastMonth": return getLastMonth();
    case "fiscal": return getThisFiscal();
    case "thisWeek": return getThisWeek();
    default: return getThisMonth();
  }
}

export default function PaymentConfirmation({ customers, selectedStaff, selectedPeriod, customDateRange, onRefresh }) {
  const [loading, setLoading] = useState({});
  const [editingDeal, setEditingDeal] = useState(null);
  const [dealValues, setDealValues] = useState({ commission: "", ad: "", otherSales: "" });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const cases = useMemo(() => {
    const range = getPeriodRange(selectedPeriod, customDateRange);
    return customers
      .filter(c => c.staff === selectedStaff && TARGET_STATUSES.includes(c.status))
      .filter(c => {
        // contractDateが期間内 OR contractDateなし（見込み案件）
        if (!c.contract_date) return true;
        const d = parseDate(c.contract_date);
        return d && d >= range.start && d <= range.end;
      })
      .map(c => ({
        id: c.line_user_id,
        name: c.display_name || c.real_name || "(名前なし)",
        status: c.status,
        fee: Number(c.fee) || 0,
        ad: Number(c.ad) || 0,
        other: Number(c.other_revenue) || 0,
        isFeeReceived: !!c.fee_received_date,
        isAdReceived: !!c.ad_received_date,
        isOtherReceived: !!c.other_revenue_received_date,
        feeReceivedDate: c.fee_received_date || "",
        adReceivedDate: c.ad_received_date || "",
        otherReceivedDate: c.other_revenue_received_date || "",
      }));
  }, [customers, selectedStaff, selectedPeriod, customDateRange]);

  const getDateKey = (customerId, type) => `${customerId}-${type}`;

  const handleCancel = async (customerId, type) => {
    if (!window.confirm("着金確認を取り消しますか？")) return;
    const key = getDateKey(customerId, type);
    setLoading(prev => ({ ...prev, [key]: true }));
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/customers/${encodeURIComponent(customerId)}/cancel-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || `HTTP ${res.status}`);
        return;
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleConfirm = async (customerId, type) => {
    const key = getDateKey(customerId, type);
    setLoading(prev => ({ ...prev, [key]: true }));
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/customers/${encodeURIComponent(customerId)}/confirm-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        const msg = json.error || `HTTP ${res.status}`;
        setErrorMsg(msg);
        throw new Error(msg);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("[PaymentConfirmation] confirm error:", err.message);
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleEditDeal = (c) => {
    setEditingDeal(c.id);
    setDealValues({
      commission: c.fee || "",
      ad: c.ad || "",
      otherSales: c.other || "",
    });
  };

  const handleSaveDeal = async (customerId) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/customers/${encodeURIComponent(customerId)}/deal`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dealValues),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditingDeal(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("[PaymentConfirmation] save deal error:", err.message);
    } finally {
      setSaving(false);
    }
  };

  const btnStyle = (isReceived, isLoading) => ({
    fontSize: 9,
    padding: "2px 8px",
    borderRadius: 4,
    border: `1px solid ${isReceived ? THEME.success : THEME.border}`,
    background: isReceived ? "rgba(34, 197, 94, 0.15)" : "transparent",
    color: isReceived ? THEME.success : THEME.textSub,
    cursor: isReceived || isLoading ? "default" : "pointer",
    opacity: isLoading ? 0.5 : 1,
  });

  const numberInputStyle = {
    fontSize: 10,
    padding: "3px 6px",
    borderRadius: 4,
    border: `1px solid ${THEME.border}`,
    background: "#1a1a19",
    color: THEME.text,
    width: 80,
    outline: "none",
  };

  const renderPaymentRow = (c, label, amount, type, isReceived, receivedDate, loadingKey) => {
    if (amount <= 0) return null;
    const isLoading = loading[loadingKey];

    return (
      <div key={type} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, color: THEME.text, width: 80 }}>
          {label} {formatYen(amount)}
        </span>
        {isReceived ? (
          <>
            <span style={{ fontSize: 9, color: THEME.success }}>
              {receivedDate || ""} ✅
            </span>
            <button
              onClick={() => handleCancel(c.id, type)}
              disabled={isLoading}
              style={{
                fontSize: 9, padding: "1px 6px", borderRadius: 3,
                border: "1px solid #333", background: "transparent",
                color: "#666", cursor: isLoading ? "default" : "pointer",
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              {isLoading ? "..." : "取り消し"}
            </button>
          </>
        ) : (
          <button
            style={btnStyle(false, isLoading)}
            onClick={() => handleConfirm(c.id, type)}
            disabled={isLoading}
          >
            {isLoading ? "..." : "着金確認"}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: THEME.text }}>
          {selectedStaff} の着金確認
        </span>
        <span style={{ fontSize: 9, color: THEME.textSub }}>
          ({cases.length}件)
        </span>
      </div>

      {errorMsg && (
        <div style={{ fontSize: 10, color: THEME.danger, background: "rgba(226,75,74,0.1)", padding: "6px 10px", borderRadius: 6, marginBottom: 8 }}>
          {errorMsg}
        </div>
      )}

      {cases.length === 0 && (
        <div style={{ fontSize: 10, color: THEME.textSub, padding: "20px 0", textAlign: "center" }}>
          審査通過以降の案件はありません
        </div>
      )}

      <div style={{ maxHeight: 260, overflowY: "auto" }}>
        {cases.map((c) => (
          <div key={c.id} style={{
            padding: "8px 0",
            borderBottom: `1px solid ${THEME.border}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: THEME.text }}>{c.name}</span>
              <span style={{ fontSize: 9, color: THEME.textSub }}>{c.status.replace("済み（契約準備中）", "")}</span>
            </div>

            {editingDeal === c.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 9, color: THEME.textSub, width: 30 }}>仲介</span>
                  <input type="number" style={numberInputStyle} value={dealValues.commission}
                    onChange={e => setDealValues(prev => ({ ...prev, commission: e.target.value }))} placeholder="0" />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 9, color: THEME.textSub, width: 30 }}>AD</span>
                  <input type="number" style={numberInputStyle} value={dealValues.ad}
                    onChange={e => setDealValues(prev => ({ ...prev, ad: e.target.value }))} placeholder="0" />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 9, color: THEME.textSub, width: 30 }}>他</span>
                  <input type="number" style={numberInputStyle} value={dealValues.otherSales}
                    onChange={e => setDealValues(prev => ({ ...prev, otherSales: e.target.value }))} placeholder="0" />
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                  <button onClick={() => handleSaveDeal(c.id)} disabled={saving}
                    style={{ fontSize: 9, padding: "2px 10px", borderRadius: 4,
                      border: `1px solid ${THEME.accent}`, background: THEME.accent,
                      color: "#fff", cursor: saving ? "default" : "pointer" }}>
                    {saving ? "..." : "保存"}
                  </button>
                  <button onClick={() => setEditingDeal(null)}
                    style={{ fontSize: 9, padding: "2px 10px", borderRadius: 4,
                      border: `1px solid ${THEME.border}`, background: "transparent",
                      color: THEME.textSub, cursor: "pointer" }}>
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ paddingLeft: 4 }}>
                {renderPaymentRow(c, "仲介", c.fee, "commission", c.isFeeReceived, c.feeReceivedDate, `${c.id}-commission`)}
                {renderPaymentRow(c, "AD", c.ad, "ad", c.isAdReceived, c.adReceivedDate, `${c.id}-ad`)}
                {renderPaymentRow(c, "他", c.other, "other", c.isOtherReceived, c.otherReceivedDate, `${c.id}-other`)}
                {c.fee === 0 && c.ad === 0 && c.other === 0 && (
                  <div style={{ fontSize: 9, color: THEME.textSub }}>金額未入力</div>
                )}
                <button onClick={() => handleEditDeal(c)}
                  style={{ fontSize: 8, padding: "1px 6px", borderRadius: 3, marginTop: 2,
                    border: `1px solid ${THEME.border}`, background: "transparent",
                    color: THEME.textSub, cursor: "pointer" }}>
                  金額編集
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
